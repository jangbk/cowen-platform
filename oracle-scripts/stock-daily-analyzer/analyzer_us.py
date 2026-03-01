#!/usr/bin/env python3
"""
미국 주식 일간 분석기 (Oracle Cloud Cron)
- TwelveData API: S&P 500 / NASDAQ 100 주요 종목 시세
- 급등락 (|등락률| >= 3%) / MA 크로스 분석
- 경제일정: TwelveData 또는 수동 관리
- gspread: Google Sheets에 기록
"""

import os
import sys
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

import requests
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY", "")
GOOGLE_SHEETS_ID = os.getenv(
    "GOOGLE_SHEETS_ID", "17NC0KpHBCF9ZSx3ca32jaH1kmFIo3OuETbAa9_c_hQE"
)
CREDENTIALS_FILE = os.getenv(
    "GOOGLE_CREDENTIALS_FILE",
    "/home/ubuntu/stock-daily-analyzer/credentials.json",
)

# Major US stocks to track (S&P 500 + NASDAQ 100 top picks)
US_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
    "JPM", "V", "UNH", "MA", "HD", "PG", "JNJ", "ABBV", "MRK", "AVGO",
    "PEP", "COST", "ADBE", "CRM", "AMD", "NFLX", "INTC", "CSCO", "CMCSA",
    "ORCL", "ACN", "TXN", "QCOM", "BA", "CAT", "GS", "AXP", "AMGN",
    "IBM", "GE", "DIS", "PYPL", "SBUX", "NKE", "LOW", "AMAT", "BKNG",
    "MU", "LRCX", "KLAC", "MRVL", "PANW",
]

SURGE_THRESHOLD = 3.0  # US stocks: |change| >= 3% counts as surge
MA_SHORT = 5
MA_LONG = 20

# ---------------------------------------------------------------------------
# Google Sheets
# ---------------------------------------------------------------------------

def connect_sheets():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scopes)
    gc = gspread.authorize(creds)
    return gc.open_by_key(GOOGLE_SHEETS_ID)


def write_to_sheet(sp, tab_name: str, headers: list, rows: list[list]):
    """Write data to a Google Sheet tab, creating it if needed."""
    existing = {ws.title: ws for ws in sp.worksheets()}
    data = [headers] + rows

    if tab_name in existing:
        ws = existing[tab_name]
        ws.clear()
        ws.update(values=data, range_name="A1")
    else:
        ws = sp.add_worksheet(tab_name, 1000, len(headers))
        ws.update(values=data, range_name="A1")

    log.info(f"✅ {tab_name}: {len(rows)} rows written")


# ---------------------------------------------------------------------------
# TwelveData API
# ---------------------------------------------------------------------------

def fetch_quote(ticker: str) -> Optional[dict]:
    """Fetch real-time quote for a single ticker."""
    try:
        resp = requests.get(
            "https://api.twelvedata.com/quote",
            params={"symbol": ticker, "apikey": TWELVE_DATA_API_KEY},
            timeout=10,
        )
        data = resp.json()
        if "code" in data and data["code"] != 200:
            log.warning(f"Quote error for {ticker}: {data.get('message', '')}")
            return None
        return data
    except Exception as e:
        log.error(f"Failed to fetch quote for {ticker}: {e}")
        return None


def fetch_time_series(ticker: str, outputsize: int = 30) -> Optional[list]:
    """Fetch daily time series for MA cross detection."""
    try:
        resp = requests.get(
            "https://api.twelvedata.com/time_series",
            params={
                "symbol": ticker,
                "interval": "1day",
                "outputsize": outputsize,
                "apikey": TWELVE_DATA_API_KEY,
            },
            timeout=15,
        )
        data = resp.json()
        if "values" not in data:
            log.warning(f"Time series error for {ticker}: {data.get('message', '')}")
            return None
        return data["values"]
    except Exception as e:
        log.error(f"Failed to fetch time series for {ticker}: {e}")
        return None


def get_exchange(ticker: str) -> str:
    """Determine exchange for a ticker (simple heuristic)."""
    nyse_tickers = {
        "BRK.B", "JPM", "V", "UNH", "MA", "HD", "PG", "JNJ", "ABBV", "MRK",
        "PEP", "BA", "CAT", "GS", "AXP", "IBM", "GE", "DIS", "NKE", "LOW",
    }
    return "NYSE" if ticker in nyse_tickers else "NASDAQ"


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

def analyze_surges(today_str: str) -> list[list]:
    """Find stocks with |change| >= SURGE_THRESHOLD."""
    results = []

    for ticker in US_TICKERS:
        quote = fetch_quote(ticker)
        if not quote:
            continue

        try:
            change_pct = float(quote.get("percent_change", 0))
            close = quote.get("close", "0")
            volume = quote.get("volume", "0")
            name = quote.get("name", ticker)
            exchange = get_exchange(ticker)

            if abs(change_pct) >= SURGE_THRESHOLD:
                direction = "급등" if change_pct > 0 else "급락"
                results.append([
                    today_str,
                    ticker,
                    name,
                    exchange,
                    close,
                    f"{change_pct:.2f}",
                    direction,
                    volume,
                    "",  # 사유 — can be filled by Claude API later
                ])
        except (ValueError, TypeError) as e:
            log.warning(f"Parse error for {ticker}: {e}")
            continue

        time.sleep(0.15)  # Rate limit: ~8 req/sec (free tier)

    results.sort(key=lambda r: abs(float(r[5])), reverse=True)
    return results


def analyze_crosses(today_str: str) -> list[list]:
    """Detect MA5/MA20 golden/dead crosses."""
    results = []

    for ticker in US_TICKERS:
        series = fetch_time_series(ticker, outputsize=MA_LONG + 5)
        if not series or len(series) < MA_LONG + 1:
            continue

        try:
            closes = [float(v["close"]) for v in series]
            ma_short_today = sum(closes[:MA_SHORT]) / MA_SHORT
            ma_long_today = sum(closes[:MA_LONG]) / MA_LONG
            ma_short_yesterday = sum(closes[1:MA_SHORT + 1]) / MA_SHORT
            ma_long_yesterday = sum(closes[1:MA_LONG + 1]) / MA_LONG

            cross_type = None
            if ma_short_yesterday <= ma_long_yesterday and ma_short_today > ma_long_today:
                cross_type = "골든크로스"
            elif ma_short_yesterday >= ma_long_yesterday and ma_short_today < ma_long_today:
                cross_type = "데드크로스"

            if cross_type:
                name = series[0].get("name", ticker)
                exchange = get_exchange(ticker)
                results.append([
                    today_str,
                    ticker,
                    name if name != ticker else ticker,
                    exchange,
                    cross_type,
                    f"{ma_short_today:.2f}",
                    f"{ma_long_today:.2f}",
                    series[0]["close"],
                ])
        except (ValueError, TypeError, KeyError) as e:
            log.warning(f"Cross analysis error for {ticker}: {e}")
            continue

        time.sleep(0.15)

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not TWELVE_DATA_API_KEY:
        log.error("TWELVE_DATA_API_KEY is not set. Exiting.")
        sys.exit(1)

    today_str = datetime.now().strftime("%Y-%m-%d")
    log.info(f"=== US Stock Daily Analysis: {today_str} ===")

    sp = connect_sheets()

    # 1. 급등락
    log.info("Analyzing US surges...")
    surge_rows = analyze_surges(today_str)
    write_to_sheet(
        sp,
        "US_급등락",
        ["날짜", "Ticker", "종목명", "시장", "종가", "등락률(%)", "방향", "거래량", "사유"],
        surge_rows,
    )

    # 2. 크로스
    log.info("Analyzing US MA crosses...")
    cross_rows = analyze_crosses(today_str)
    write_to_sheet(
        sp,
        "US_크로스",
        ["날짜", "Ticker", "종목명", "시장", "유형", "단기MA", "장기MA", "종가"],
        cross_rows,
    )

    # 3. 경제일정 — 수동 관리 (시트에 직접 입력하거나 별도 스크립트)
    log.info("US_경제일정 is managed manually or via separate calendar feed.")

    log.info(f"=== Done: {len(surge_rows)} surges, {len(cross_rows)} crosses ===")


if __name__ == "__main__":
    main()
