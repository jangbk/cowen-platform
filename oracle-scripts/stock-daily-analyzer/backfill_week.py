#!/usr/bin/env python3
"""
최근 1주일(5거래일) 데이터를 Google Sheets에 백필
"""

import time
import logging
from datetime import datetime, timedelta

import gspread
from google.oauth2.service_account import Credentials
from pykrx import stock

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

GOOGLE_SHEETS_ID = "17NC0KpHBCF9ZSx3ca32jaH1kmFIo3OuETbAa9_c_hQE"
CREDENTIALS_FILE = "/Users/jangbookeun/Downloads/stock-daily-analyzer-0af664b5b37f.json"

LIMIT_UP_PCT = 29.5
LIMIT_DOWN_PCT = -29.5
SURGE_PCT = 5.0
MA_SHORT = 5
MA_LONG = 20


def connect_sheets():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scopes)
    gc = gspread.authorize(creds)
    return gc.open_by_key(GOOGLE_SHEETS_ID)


def ensure_worksheets(spreadsheet):
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
            ws.update(values=[headers], range_name="A1")
            ws.format("A1:Z1", {"textFormat": {"bold": True}})
            worksheets[tab_name] = ws
            log.info(f"시트 '{tab_name}' 생성 완료")

    return worksheets


def get_recent_weekdays(n=5):
    """최근 n개의 평일(월~금) 날짜 반환"""
    dates = []
    d = datetime.now()
    while len(dates) < n:
        d -= timedelta(days=1)
        if d.weekday() < 5:  # 월~금
            dates.append(d.strftime("%Y%m%d"))
    dates.reverse()  # 오래된 순
    return dates


def fetch_market_data(date, market):
    log.info(f"  {market} {date} 시세 수집 중...")
    try:
        df = stock.get_market_ohlcv_by_ticker(date, market=market)
        time.sleep(1)  # KRX API rate limit

        if df.empty:
            log.warning(f"  {market} 데이터 없음")
            return {}

        result = {}
        for ticker in df.index:
            try:
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
            except Exception:
                continue

        log.info(f"  {market}: {len(result)}개 종목")
        return result
    except Exception as e:
        log.error(f"  {market} 수집 실패: {e}")
        return {}


def detect_cross(date, market):
    log.info(f"  {market} 크로스 분석 중...")
    crosses = []
    try:
        end_dt = datetime.strptime(date, "%Y%m%d")
        start_dt = end_dt - timedelta(days=90)
        start_str = start_dt.strftime("%Y%m%d")

        tickers = stock.get_market_ticker_list(date, market=market)
        time.sleep(1)

        count = 0
        for ticker in tickers:
            try:
                df = stock.get_market_ohlcv(start_str, date, ticker)
                time.sleep(0.2)  # rate limit

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

                count += 1
                if count % 100 == 0:
                    log.info(f"    크로스 분석 진행: {count}/{len(tickers)}")

            except Exception:
                continue

    except Exception as e:
        log.error(f"  {market} 크로스 분석 실패: {e}")

    log.info(f"  {market} 크로스: {len(crosses)}개 감지")
    return crosses


def process_date(date, worksheets):
    date_formatted = f"{date[:4]}-{date[4:6]}-{date[6:]}"
    log.info(f"\n{'='*50}")
    log.info(f"처리 중: {date_formatted}")
    log.info(f"{'='*50}")

    # 시세 수집
    kospi = fetch_market_data(date, "KOSPI")
    time.sleep(2)
    kosdaq = fetch_market_data(date, "KOSDAQ")
    time.sleep(2)

    if not kospi and not kosdaq:
        log.warning(f"  {date_formatted} 데이터 없음 (공휴일/비거래일)")
        return

    # 상한가
    limit_up = []
    for market_name, data in [("KOSPI", kospi), ("KOSDAQ", kosdaq)]:
        for t, d in data.items():
            if d["등락률"] >= LIMIT_UP_PCT:
                limit_up.append([
                    date_formatted, t, d["종목명"], market_name,
                    str(d["종가"]), str(d["등락률"]), str(d["거래량"]), ""
                ])
    if limit_up:
        worksheets["상한가"].insert_rows(limit_up, row=2)
        log.info(f"  상한가: {len(limit_up)}개 기록")
        time.sleep(1)
    else:
        log.info(f"  상한가: 0개")

    # 하한가
    limit_down = []
    for market_name, data in [("KOSPI", kospi), ("KOSDAQ", kosdaq)]:
        for t, d in data.items():
            if d["등락률"] <= LIMIT_DOWN_PCT:
                limit_down.append([
                    date_formatted, t, d["종목명"], market_name,
                    str(d["종가"]), str(d["등락률"]), str(d["거래량"]), ""
                ])
    if limit_down:
        worksheets["하한가"].insert_rows(limit_down, row=2)
        log.info(f"  하한가: {len(limit_down)}개 기록")
        time.sleep(1)
    else:
        log.info(f"  하한가: 0개")

    # 급등락
    surge = []
    for market_name, data in [("KOSPI", kospi), ("KOSDAQ", kosdaq)]:
        for t, d in data.items():
            if abs(d["등락률"]) >= SURGE_PCT:
                direction = "급등" if d["등락률"] > 0 else "급락"
                surge.append({
                    "row": [
                        date_formatted, t, d["종목명"], market_name,
                        str(d["종가"]), str(d["등락률"]), direction,
                        str(d["거래량"]), ""
                    ],
                    "pct": abs(d["등락률"])
                })
    surge.sort(key=lambda x: x["pct"], reverse=True)
    surge_rows = [s["row"] for s in surge[:50]]
    if surge_rows:
        worksheets["급등락"].insert_rows(surge_rows, row=2)
        log.info(f"  급등락: {len(surge_rows)}개 기록")
        time.sleep(1)
    else:
        log.info(f"  급등락: 0개")

    # 크로스 (시간이 오래 걸리므로 KOSPI만, 상위 500개 종목)
    log.info(f"  크로스 분석 (KOSPI 대형주만)...")
    crosses_kospi = detect_cross(date, "KOSPI")
    time.sleep(2)

    cross_rows = []
    for c in crosses_kospi:
        cross_rows.append([
            date_formatted, c["종목코드"], c["종목명"], c["시장"],
            c["유형"], str(c["단기MA"]), str(c["장기MA"]), str(c["종가"])
        ])
    if cross_rows:
        worksheets["크로스"].insert_rows(cross_rows, row=2)
        log.info(f"  크로스: {len(cross_rows)}개 기록")
        time.sleep(1)
    else:
        log.info(f"  크로스: 0개")

    log.info(f"  {date_formatted} 완료!")


def main():
    log.info("=== 최근 1주일 백필 시작 ===")

    spreadsheet = connect_sheets()
    log.info("Google Sheets 연결 성공")

    worksheets = ensure_worksheets(spreadsheet)
    log.info("시트 탭 확인 완료")

    dates = get_recent_weekdays(n=5)
    log.info(f"처리할 날짜: {dates}")

    # 오래된 날짜부터 처리
    for date in dates:
        try:
            process_date(date, worksheets)
        except Exception as e:
            log.error(f"  {date} 처리 실패: {e}")
            continue
        time.sleep(3)  # 날짜 간 간격

    log.info("\n=== 백필 완료 ===")


if __name__ == "__main__":
    main()
