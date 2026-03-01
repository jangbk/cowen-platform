#!/usr/bin/env python3
"""
한국 주식 일간 분석기 (Oracle Cloud Cron)
- pykrx: KOSPI/KOSDAQ 전종목 시세
- 상한가/하한가/급등락/크로스 분석
- Claude API: 네이버금융 뉴스 → 사유 요약
- gspread: Google Sheets에 기록
"""

import os
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials
from pykrx import stock
import anthropic

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(__file__).parent / "analyzer.log"),
    ],
)
log = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_SHEETS_ID = os.getenv("GOOGLE_SHEETS_ID", "")
CREDENTIALS_FILE = Path(__file__).parent / "credentials.json"

# Thresholds
LIMIT_UP_PCT = 29.5   # 상한가 (가격제한폭 30%)
LIMIT_DOWN_PCT = -29.5  # 하한가
SURGE_PCT = 5.0        # 급등락 기준
MA_SHORT = 5           # 단기 이동평균
MA_LONG = 20           # 장기 이동평균
MA_LOOKBACK = 60       # 크로스 감지용 조회일수

NAVER_FINANCE_NEWS_URL = "https://finance.naver.com/item/news_news.naver?code={code}&page=1"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


# ---------------------------------------------------------------------------
# Google Sheets 연결
# ---------------------------------------------------------------------------
def connect_sheets() -> gspread.Spreadsheet:
    """Google Sheets에 연결하여 Spreadsheet 객체 반환"""
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(str(CREDENTIALS_FILE), scopes=scopes)
    gc = gspread.authorize(creds)
    return gc.open_by_key(GOOGLE_SHEETS_ID)


def ensure_worksheets(spreadsheet: gspread.Spreadsheet) -> dict[str, gspread.Worksheet]:
    """5개 탭이 존재하는지 확인하고 없으면 생성"""
    tab_headers = {
        "상한가": ["날짜", "종목코드", "종목명", "시장", "종가", "등락률(%)", "거래량", "사유"],
        "하한가": ["날짜", "종목코드", "종목명", "시장", "종가", "등락률(%)", "거래량", "사유"],
        "급등락": ["날짜", "종목코드", "종목명", "시장", "종가", "등락률(%)", "방향", "거래량", "사유"],
        "크로스": ["날짜", "종목코드", "종목명", "시장", "유형", "단기MA", "장기MA", "종가"],
        "경제일정": ["날짜", "이벤트명", "중요도", "예상영향", "출처URL"],
    }

    existing = {ws.title: ws for ws in spreadsheet.worksheets()}
    worksheets = {}

    for tab_name, headers in tab_headers.items():
        if tab_name in existing:
            worksheets[tab_name] = existing[tab_name]
        else:
            ws = spreadsheet.add_worksheet(title=tab_name, rows=1000, cols=len(headers))
            ws.update("A1", [headers])
            # 헤더 행 볼드
            ws.format("A1:Z1", {"textFormat": {"bold": True}})
            worksheets[tab_name] = ws
            log.info(f"시트 '{tab_name}' 생성 완료")

    return worksheets


# ---------------------------------------------------------------------------
# 시세 데이터 수집
# ---------------------------------------------------------------------------
def get_trading_date() -> str:
    """가장 최근 거래일 반환 (YYYYMMDD)"""
    today = datetime.now()
    # 주말이면 금요일로
    if today.weekday() == 5:  # 토요일
        today -= timedelta(days=1)
    elif today.weekday() == 6:  # 일요일
        today -= timedelta(days=2)
    return today.strftime("%Y%m%d")


def fetch_market_data(date: str, market: str) -> dict:
    """
    pykrx로 전종목 OHLCV + 등락률 수집
    Returns: {ticker: {종목명, 시가, 고가, 저가, 종가, 거래량, 등락률}}
    """
    log.info(f"{market} {date} 시세 수집 중...")
    try:
        df = stock.get_market_ohlcv_by_ticker(date, market=market)
        if df.empty:
            log.warning(f"{market} 데이터 없음 (공휴일/비거래일?)")
            return {}

        # 등락률은 별도로 가져오기
        df_chg = stock.get_market_ohlcv_by_ticker(date, market=market)

        result = {}
        for ticker in df.index:
            name = stock.get_market_ticker_name(ticker)
            close = int(df.loc[ticker, "종가"])
            volume = int(df.loc[ticker, "거래량"])
            change_pct = float(df.loc[ticker, "등락률"])

            if close == 0 or volume == 0:
                continue

            result[ticker] = {
                "종목명": name,
                "종가": close,
                "거래량": volume,
                "등락률": round(change_pct, 2),
            }

        log.info(f"{market}: {len(result)}개 종목 수집 완료")
        return result
    except Exception as e:
        log.error(f"{market} 시세 수집 실패: {e}")
        return {}


# ---------------------------------------------------------------------------
# 필터링
# ---------------------------------------------------------------------------
def filter_limit_up(data: dict, market: str) -> list[dict]:
    """상한가 종목 필터"""
    return [
        {"종목코드": t, "종목명": d["종목명"], "시장": market,
         "종가": d["종가"], "등락률(%)": d["등락률"], "거래량": d["거래량"]}
        for t, d in data.items()
        if d["등락률"] >= LIMIT_UP_PCT
    ]


def filter_limit_down(data: dict, market: str) -> list[dict]:
    """하한가 종목 필터"""
    return [
        {"종목코드": t, "종목명": d["종목명"], "시장": market,
         "종가": d["종가"], "등락률(%)": d["등락률"], "거래량": d["거래량"]}
        for t, d in data.items()
        if d["등락률"] <= LIMIT_DOWN_PCT
    ]


def filter_surge(data: dict, market: str) -> list[dict]:
    """급등락 종목 필터 (|등락률| >= 5%)"""
    results = []
    for t, d in data.items():
        pct = d["등락률"]
        if abs(pct) >= SURGE_PCT:
            direction = "급등" if pct > 0 else "급락"
            results.append({
                "종목코드": t, "종목명": d["종목명"], "시장": market,
                "종가": d["종가"], "등락률(%)": pct, "방향": direction,
                "거래량": d["거래량"],
            })
    # 등락률 절대값 큰 순 정렬
    results.sort(key=lambda x: abs(x["등락률(%)"]), reverse=True)
    return results[:50]  # 상위 50개


def detect_cross(date: str, market: str) -> list[dict]:
    """골든크로스 / 데드크로스 감지 (MA5 vs MA20)"""
    log.info(f"{market} 크로스 분석 중...")
    crosses = []
    try:
        # 최근 거래일 기준 MA_LOOKBACK일치 데이터
        end_dt = datetime.strptime(date, "%Y%m%d")
        start_dt = end_dt - timedelta(days=MA_LOOKBACK * 2)  # 여유있게
        start_str = start_dt.strftime("%Y%m%d")

        tickers = stock.get_market_ticker_list(date, market=market)

        for ticker in tickers:
            try:
                df = stock.get_market_ohlcv(start_str, date, ticker)
                if len(df) < MA_LONG + 2:
                    continue

                df["MA_S"] = df["종가"].rolling(window=MA_SHORT).mean()
                df["MA_L"] = df["종가"].rolling(window=MA_LONG).mean()
                df = df.dropna()

                if len(df) < 2:
                    continue

                prev_s, curr_s = df["MA_S"].iloc[-2], df["MA_S"].iloc[-1]
                prev_l, curr_l = df["MA_L"].iloc[-2], df["MA_L"].iloc[-1]

                cross_type = None
                if prev_s <= prev_l and curr_s > curr_l:
                    cross_type = "골든크로스"
                elif prev_s >= prev_l and curr_s < curr_l:
                    cross_type = "데드크로스"

                if cross_type:
                    name = stock.get_market_ticker_name(ticker)
                    crosses.append({
                        "종목코드": ticker,
                        "종목명": name,
                        "시장": market,
                        "유형": cross_type,
                        "단기MA": int(round(curr_s)),
                        "장기MA": int(round(curr_l)),
                        "종가": int(df["종가"].iloc[-1]),
                    })
            except Exception:
                continue

        log.info(f"{market}: {len(crosses)}개 크로스 감지")
    except Exception as e:
        log.error(f"{market} 크로스 분석 실패: {e}")

    return crosses


# ---------------------------------------------------------------------------
# 뉴스 크롤링 + AI 사유 분석
# ---------------------------------------------------------------------------
def fetch_naver_news(ticker: str, max_articles: int = 3) -> list[str]:
    """네이버 금융에서 종목 관련 뉴스 제목 크롤링"""
    try:
        url = NAVER_FINANCE_NEWS_URL.format(code=ticker)
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.encoding = "euc-kr"
        soup = BeautifulSoup(resp.text, "html.parser")

        titles = []
        for a_tag in soup.select("td.title a"):
            title = a_tag.get_text(strip=True)
            if title:
                titles.append(title)
            if len(titles) >= max_articles:
                break
        return titles
    except Exception as e:
        log.debug(f"뉴스 크롤링 실패 ({ticker}): {e}")
        return []


def analyze_reasons_batch(items: list[dict]) -> dict[str, str]:
    """
    Claude API로 종목별 사유를 배치 분석
    Returns: {종목코드: 사유 한줄 요약}
    """
    if not ANTHROPIC_API_KEY or not items:
        return {}

    # 종목별 뉴스 수집
    news_data = {}
    for item in items:
        code = item["종목코드"]
        if code not in news_data:
            headlines = fetch_naver_news(code)
            news_data[code] = headlines
            time.sleep(0.3)  # 크롤링 예의

    # 프롬프트 구성
    entries = []
    for i, item in enumerate(items):
        code = item["종목코드"]
        name = item["종목명"]
        pct = item.get("등락률(%)", 0)
        headlines = news_data.get(code, [])
        news_text = " / ".join(headlines) if headlines else "뉴스 없음"
        entries.append(f"{i+1}. {name}({code}) 등락률:{pct}% 뉴스:[{news_text}]")

    prompt = f"""아래는 오늘 한국 주식 시장에서 주목할 종목 {len(items)}개의 정보입니다.
각 종목에 대해 등락 사유를 한국어 한 줄(30자 이내)로 요약해주세요.
뉴스가 없으면 등락률과 시장 상황을 기반으로 추정해주세요.

반드시 아래 JSON 배열 형식으로만 응답하세요:
["1번 사유", "2번 사유", ...]

종목 목록:
{chr(10).join(entries)}"""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()
        # JSON 추출
        if "```" in text:
            import re
            m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
            if m:
                text = m.group(1).strip()

        import json
        reasons = json.loads(text)

        result = {}
        for i, item in enumerate(items):
            if i < len(reasons):
                result[item["종목코드"]] = reasons[i]
        return result

    except Exception as e:
        log.error(f"AI 사유 분석 실패: {e}")
        return {}


# ---------------------------------------------------------------------------
# Google Sheets 기록
# ---------------------------------------------------------------------------
def write_to_sheet(ws: gspread.Worksheet, rows: list[list[str]]):
    """시트 상단(2행)에 데이터 삽입"""
    if not rows:
        return
    # 2행부터 삽입 (1행은 헤더)
    ws.insert_rows(rows, row=2)
    log.info(f"  → '{ws.title}'에 {len(rows)}행 기록")


# ---------------------------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------------------------
def main():
    date = get_trading_date()
    date_formatted = f"{date[:4]}-{date[4:6]}-{date[6:]}"
    log.info(f"=== 주식 일간 분석 시작 ({date_formatted}) ===")

    # 1. Google Sheets 연결
    spreadsheet = connect_sheets()
    worksheets = ensure_worksheets(spreadsheet)

    # 2. 시세 수집
    kospi_data = fetch_market_data(date, "KOSPI")
    kosdaq_data = fetch_market_data(date, "KOSDAQ")

    if not kospi_data and not kosdaq_data:
        log.warning("시세 데이터 없음. 비거래일일 수 있습니다.")
        return

    # 3. 필터링
    limit_up = filter_limit_up(kospi_data, "KOSPI") + filter_limit_up(kosdaq_data, "KOSDAQ")
    limit_down = filter_limit_down(kospi_data, "KOSPI") + filter_limit_down(kosdaq_data, "KOSDAQ")
    surge = filter_surge(kospi_data, "KOSPI") + filter_surge(kosdaq_data, "KOSDAQ")
    surge.sort(key=lambda x: abs(x["등락률(%)"]), reverse=True)
    surge = surge[:50]

    log.info(f"상한가: {len(limit_up)}개, 하한가: {len(limit_down)}개, 급등락: {len(surge)}개")

    # 4. 크로스 분석
    crosses = detect_cross(date, "KOSPI") + detect_cross(date, "KOSDAQ")
    log.info(f"크로스: {len(crosses)}개")

    # 5. AI 사유 분석 (상한가 + 하한가 + 급등락 상위 20개)
    items_for_ai = limit_up + limit_down + surge[:20]
    if items_for_ai:
        log.info(f"AI 사유 분석 중 ({len(items_for_ai)}개 종목)...")
        reasons = analyze_reasons_batch(items_for_ai)
    else:
        reasons = {}

    # 6. 시트 기록
    # 상한가
    rows = []
    for item in limit_up:
        reason = reasons.get(item["종목코드"], "")
        rows.append([
            date_formatted, item["종목코드"], item["종목명"], item["시장"],
            str(item["종가"]), str(item["등락률(%)"]), str(item["거래량"]), reason,
        ])
    write_to_sheet(worksheets["상한가"], rows)

    # 하한가
    rows = []
    for item in limit_down:
        reason = reasons.get(item["종목코드"], "")
        rows.append([
            date_formatted, item["종목코드"], item["종목명"], item["시장"],
            str(item["종가"]), str(item["등락률(%)"]), str(item["거래량"]), reason,
        ])
    write_to_sheet(worksheets["하한가"], rows)

    # 급등락
    rows = []
    for item in surge:
        reason = reasons.get(item["종목코드"], "")
        rows.append([
            date_formatted, item["종목코드"], item["종목명"], item["시장"],
            str(item["종가"]), str(item["등락률(%)"]), item["방향"],
            str(item["거래량"]), reason,
        ])
    write_to_sheet(worksheets["급등락"], rows)

    # 크로스
    rows = []
    for item in crosses:
        rows.append([
            date_formatted, item["종목코드"], item["종목명"], item["시장"],
            item["유형"], str(item["단기MA"]), str(item["장기MA"]), str(item["종가"]),
        ])
    write_to_sheet(worksheets["크로스"], rows)

    log.info(f"=== 분석 완료 ===")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log.error(f"치명적 오류: {e}", exc_info=True)
        sys.exit(1)
