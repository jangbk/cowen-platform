import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SheetRow {
  [key: string]: string;
}

interface YahooChartResult {
  symbol: string;
  price: number;
  previousClose: number;
  change: number; // percent
  closes: number[]; // daily closes for MA calculation
  name: string;
  volume: number; // current day volume
  avgVolume: number; // 20-day average volume
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface NaverStock {
  code: string;
  name: string;
  market: string; // "KOSPI" | "KOSDAQ"
  close: number;
  changeRate: number;
  volume: number;
  marketCap: number;
  date: string;
}

// ---------------------------------------------------------------------------
// Tracked Stock Lists
// ---------------------------------------------------------------------------
// DJIA 30 components
const US_DJIA: { ticker: string; name: string }[] = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "AMGN", name: "Amgen" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "AXP", name: "American Express" },
  { ticker: "BA", name: "Boeing" },
  { ticker: "CAT", name: "Caterpillar" },
  { ticker: "CRM", name: "Salesforce" },
  { ticker: "CSCO", name: "Cisco" },
  { ticker: "CVX", name: "Chevron" },
  { ticker: "DIS", name: "Disney" },
  { ticker: "DOW", name: "Dow Inc" },
  { ticker: "GS", name: "Goldman Sachs" },
  { ticker: "HD", name: "Home Depot" },
  { ticker: "HON", name: "Honeywell" },
  { ticker: "IBM", name: "IBM" },
  { ticker: "JNJ", name: "J&J" },
  { ticker: "JPM", name: "JPMorgan Chase" },
  { ticker: "KO", name: "Coca-Cola" },
  { ticker: "MCD", name: "McDonald's" },
  { ticker: "MMM", name: "3M" },
  { ticker: "MRK", name: "Merck" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "NKE", name: "Nike" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "PG", name: "Procter & Gamble" },
  { ticker: "SHW", name: "Sherwin-Williams" },
  { ticker: "TRV", name: "Travelers" },
  { ticker: "UNH", name: "UnitedHealth" },
  { ticker: "V", name: "Visa" },
  { ticker: "VZ", name: "Verizon" },
];

// NASDAQ-100 top stocks (excluding DJIA overlap)
const US_NASDAQ: { ticker: string; name: string }[] = [
  { ticker: "META", name: "Meta Platforms" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "AVGO", name: "Broadcom" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "COST", name: "Costco" },
  { ticker: "NFLX", name: "Netflix" },
  { ticker: "AMD", name: "AMD" },
  { ticker: "ADBE", name: "Adobe" },
  { ticker: "PEP", name: "PepsiCo" },
  { ticker: "TMUS", name: "T-Mobile" },
  { ticker: "CMCSA", name: "Comcast" },
  { ticker: "TXN", name: "Texas Instruments" },
  { ticker: "QCOM", name: "Qualcomm" },
  { ticker: "ISRG", name: "Intuitive Surgical" },
  { ticker: "AMAT", name: "Applied Materials" },
  { ticker: "BKNG", name: "Booking Holdings" },
  { ticker: "INTU", name: "Intuit" },
  { ticker: "LRCX", name: "Lam Research" },
  { ticker: "ADP", name: "ADP" },
  { ticker: "MDLZ", name: "Mondelez" },
  { ticker: "VRTX", name: "Vertex Pharma" },
  { ticker: "REGN", name: "Regeneron" },
  { ticker: "ADI", name: "Analog Devices" },
  { ticker: "KLAC", name: "KLA Corp" },
  { ticker: "PANW", name: "Palo Alto Networks" },
  { ticker: "SNPS", name: "Synopsys" },
  { ticker: "CDNS", name: "Cadence Design" },
  { ticker: "PYPL", name: "PayPal" },
  { ticker: "GILD", name: "Gilead Sciences" },
  { ticker: "MELI", name: "MercadoLibre" },
  { ticker: "CRWD", name: "CrowdStrike" },
  { ticker: "MRVL", name: "Marvell Tech" },
  { ticker: "MAR", name: "Marriott" },
  { ticker: "ABNB", name: "Airbnb" },
  { ticker: "ORLY", name: "O'Reilly Auto" },
  { ticker: "MNST", name: "Monster Beverage" },
  { ticker: "CSX", name: "CSX Corp" },
  { ticker: "PCAR", name: "PACCAR" },
  { ticker: "NXPI", name: "NXP Semi" },
  { ticker: "ROST", name: "Ross Stores" },
  { ticker: "CHTR", name: "Charter Comms" },
  { ticker: "DASH", name: "DoorDash" },
  { ticker: "KDP", name: "Keurig Dr Pepper" },
  { ticker: "WDAY", name: "Workday" },
  { ticker: "FTNT", name: "Fortinet" },
  { ticker: "FANG", name: "Diamondback Energy" },
  { ticker: "CEG", name: "Constellation Energy" },
  { ticker: "ODFL", name: "Old Dominion" },
  { ticker: "DXCM", name: "DexCom" },
  { ticker: "FAST", name: "Fastenal" },
  { ticker: "PAYX", name: "Paychex" },
  { ticker: "CTSH", name: "Cognizant" },
  { ticker: "EA", name: "Electronic Arts" },
  { ticker: "VRSK", name: "Verisk Analytics" },
  { ticker: "GEHC", name: "GE HealthCare" },
  { ticker: "TEAM", name: "Atlassian" },
  { ticker: "KHC", name: "Kraft Heinz" },
  { ticker: "IDXX", name: "IDEXX Labs" },
  { ticker: "BIIB", name: "Biogen" },
  { ticker: "ANSS", name: "ANSYS" },
  { ticker: "ON", name: "ON Semi" },
  { ticker: "DDOG", name: "Datadog" },
  { ticker: "ZS", name: "Zscaler" },
  { ticker: "TTD", name: "The Trade Desk" },
  { ticker: "CPRT", name: "Copart" },
  { ticker: "CDW", name: "CDW Corp" },
  { ticker: "SBUX", name: "Starbucks" },
  { ticker: "MRNA", name: "Moderna" },
  { ticker: "ARM", name: "Arm Holdings" },
  { ticker: "MU", name: "Micron" },
  { ticker: "MCHP", name: "Microchip Tech" },
  { ticker: "INTC", name: "Intel" },
  { ticker: "LULU", name: "Lululemon" },
  { ticker: "CTAS", name: "Cintas" },
];

// Combined ticker list + market lookup
const US_DJIA_SET = new Set(US_DJIA.map((s) => s.ticker));
const ALL_US_TICKERS = [
  ...US_DJIA.map((s) => s.ticker),
  ...US_NASDAQ.map((s) => s.ticker),
];

// KR stocks used for MA cross detection (Yahoo Finance — need 1mo history)
const KR_CROSS_STOCKS: { ticker: string; name: string; market: string }[] = [
  // KOSPI top 30 by market cap
  { ticker: "005930.KS", name: "삼성전자", market: "KOSPI" },
  { ticker: "000660.KS", name: "SK하이닉스", market: "KOSPI" },
  { ticker: "373220.KS", name: "LG에너지솔루션", market: "KOSPI" },
  { ticker: "035420.KS", name: "NAVER", market: "KOSPI" },
  { ticker: "035720.KS", name: "카카오", market: "KOSPI" },
  { ticker: "005380.KS", name: "현대차", market: "KOSPI" },
  { ticker: "006400.KS", name: "삼성SDI", market: "KOSPI" },
  { ticker: "051910.KS", name: "LG화학", market: "KOSPI" },
  { ticker: "000270.KS", name: "기아", market: "KOSPI" },
  { ticker: "068270.KS", name: "셀트리온", market: "KOSPI" },
  { ticker: "207940.KS", name: "삼성바이오로직스", market: "KOSPI" },
  { ticker: "005490.KS", name: "POSCO홀딩스", market: "KOSPI" },
  { ticker: "055550.KS", name: "신한지주", market: "KOSPI" },
  { ticker: "105560.KS", name: "KB금융", market: "KOSPI" },
  { ticker: "003550.KS", name: "LG", market: "KOSPI" },
  { ticker: "034730.KS", name: "SK", market: "KOSPI" },
  { ticker: "096770.KS", name: "SK이노베이션", market: "KOSPI" },
  { ticker: "012330.KS", name: "현대모비스", market: "KOSPI" },
  { ticker: "028260.KS", name: "삼성물산", market: "KOSPI" },
  { ticker: "003670.KS", name: "포스코퓨처엠", market: "KOSPI" },
  { ticker: "066570.KS", name: "LG전자", market: "KOSPI" },
  { ticker: "032830.KS", name: "삼성생명", market: "KOSPI" },
  { ticker: "086790.KS", name: "하나금융지주", market: "KOSPI" },
  { ticker: "003490.KS", name: "대한항공", market: "KOSPI" },
  { ticker: "009150.KS", name: "삼성전기", market: "KOSPI" },
  { ticker: "018260.KS", name: "삼성에스디에스", market: "KOSPI" },
  { ticker: "033780.KS", name: "KT&G", market: "KOSPI" },
  { ticker: "015760.KS", name: "한국전력", market: "KOSPI" },
  { ticker: "000810.KS", name: "삼성화재", market: "KOSPI" },
  { ticker: "316140.KS", name: "우리금융지주", market: "KOSPI" },
  // KOSDAQ top 15
  { ticker: "247540.KQ", name: "에코프로비엠", market: "KOSDAQ" },
  { ticker: "086520.KQ", name: "에코프로", market: "KOSDAQ" },
  { ticker: "403870.KQ", name: "HPSP", market: "KOSDAQ" },
  { ticker: "196170.KQ", name: "알테오젠", market: "KOSDAQ" },
  { ticker: "041510.KQ", name: "에스엠", market: "KOSDAQ" },
  { ticker: "028300.KQ", name: "HLB", market: "KOSDAQ" },
  { ticker: "357780.KQ", name: "솔브레인", market: "KOSDAQ" },
  { ticker: "145020.KQ", name: "휴젤", market: "KOSDAQ" },
  { ticker: "058470.KQ", name: "리노공업", market: "KOSDAQ" },
  { ticker: "067160.KQ", name: "아프리카TV", market: "KOSDAQ" },
  { ticker: "112040.KQ", name: "위메이드", market: "KOSDAQ" },
  { ticker: "293490.KQ", name: "카카오게임즈", market: "KOSDAQ" },
  { ticker: "263750.KQ", name: "펄어비스", market: "KOSDAQ" },
  { ticker: "035900.KQ", name: "JYP Ent.", market: "KOSDAQ" },
  { ticker: "036570.KQ", name: "엔씨소프트", market: "KOSDAQ" },
];

// ---------------------------------------------------------------------------
// Naver Finance Mobile API — Top 200 by market cap
// ---------------------------------------------------------------------------
function parseNaverNumber(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}

interface NaverAPIStock {
  itemCode: string;
  stockName: string;
  closePrice: string;
  fluctuationsRatio: string;
  accumulatedTradingVolume: string;
  marketValue: string;
  localTradedAt: string;
  compareToPreviousClosePrice: string;
}

/** Fetch one page of stocks from Naver Finance mobile API (sorted by market cap) */
async function fetchNaverPage(
  market: "KOSPI" | "KOSDAQ",
  page: number,
): Promise<NaverAPIStock[]> {
  const url = `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${page}&pageSize=100`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Naver ${res.status}`);
  const json = await res.json();
  return json.stocks || [];
}

function parseNaverStocks(raw: NaverAPIStock[], market: "KOSPI" | "KOSDAQ"): NaverStock[] {
  const date = raw[0]?.localTradedAt
    ? raw[0].localTradedAt.split("T")[0]
    : new Date().toISOString().split("T")[0];

  return raw.map((s) => ({
    code: s.itemCode,
    name: s.stockName,
    market,
    close: parseNaverNumber(s.closePrice),
    changeRate: parseFloat(s.fluctuationsRatio) || 0,
    volume: parseNaverNumber(s.accumulatedTradingVolume),
    marketCap: parseNaverNumber(s.marketValue),
    date,
  }));
}

/** Fetch top 200 KOSPI + KOSDAQ stocks by market cap from Naver Finance */
async function fetchTop200NaverData(): Promise<NaverStock[]> {
  try {
    // Fetch page 1 of each market (100 stocks each, sorted by market cap)
    const [kospiRaw, kosdaqRaw] = await Promise.all([
      fetchNaverPage("KOSPI", 1),
      fetchNaverPage("KOSDAQ", 1),
    ]);

    const kospi = parseNaverStocks(kospiRaw, "KOSPI");
    const kosdaq = parseNaverStocks(kosdaqRaw, "KOSDAQ");
    const combined = [...kospi, ...kosdaq]
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 200);

    console.log(
      `[stock-daily] Naver Top200: KOSPI=${kospi.length}, KOSDAQ=${kosdaq.length} → ${combined.length}`,
    );
    return combined;
  } catch (err) {
    console.log(
      `[stock-daily] Naver failed: ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Naver Finance 상한가/하한가 — scrape sise_upper / sise_lower (전 종목)
// ---------------------------------------------------------------------------
interface NaverLimitStock {
  code: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  close: number;
  changeRate: number;
  volume: number;
  date: string;
}

async function fetchNaverLimitStocks(
  type: "upper" | "lower",
): Promise<NaverLimitStock[]> {
  try {
    const url = `https://finance.naver.com/sise/sise_${type}.naver`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Naver sise_${type} ${res.status}`);

    // Page is EUC-KR encoded
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("euc-kr").decode(buf);
    const clean = html.replace(/\s+/g, " ");

    // Find KOSPI / KOSDAQ section boundaries
    const kospiPos = clean.indexOf('<h4 class="top_tlt">코스피</h4>');
    const kosdaqPos = clean.indexOf('<h4 class="top_tlt">코스닥</h4>');

    // Pattern: code, name, price, change, rate%, volume
    const pattern =
      /code=(\d{6})">([^<]+)<\/a><\/td> <td class="number"[^>]*>([\d,]+)<\/td> <td[^>]*>.*?<span[^>]*> ([+-]?[\d,.]+) <\/span> <\/td> <td[^>]*> <span[^>]*> ([+-]?[\d.]+%) <\/span> <\/td>.*?<td class="number"[^>]*>([\d,]+)<\/td>/g;

    const today = new Date().toISOString().split("T")[0];
    const stocks: NaverLimitStock[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(clean)) !== null) {
      const [, code, name, priceStr, , rateStr, volStr] = match;
      const market: "KOSPI" | "KOSDAQ" =
        kosdaqPos > 0 && match.index >= kosdaqPos ? "KOSDAQ" : "KOSPI";

      stocks.push({
        code,
        name: name.trim(),
        market,
        close: parseNaverNumber(priceStr),
        changeRate: parseFloat(rateStr),
        volume: parseNaverNumber(volStr),
        date: today,
      });
    }

    console.log(`[stock-daily] Naver sise_${type}: ${stocks.length} stocks`);
    return stocks;
  } catch (err) {
    console.log(
      `[stock-daily] Naver sise_${type} failed: ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Yahoo Finance v8/chart — single ticker fetch (for US + KR cross detection)
// ---------------------------------------------------------------------------
async function fetchYahooChart(
  ticker: string,
): Promise<YahooChartResult | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const name = meta.longName || meta.shortName || ticker;
    const symbol = meta.symbol || ticker;
    const volume = meta.regularMarketVolume || 0;
    const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh || 0;
    const fiftyTwoWeekLow = meta.fiftyTwoWeekLow || 0;

    const rawCloses: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? [];
    const closes = rawCloses.filter((c): c is number => c != null && c > 0);

    let previousClose = 0;
    if (closes.length >= 2) {
      const lastClose = closes[closes.length - 1];
      const secondLastClose = closes[closes.length - 2];
      if (price > 0 && Math.abs(price - lastClose) / price < 0.005) {
        previousClose = secondLastClose;
      } else {
        previousClose = lastClose;
      }
    } else if (closes.length === 1) {
      previousClose = closes[0];
    }

    const rawVolumes: (number | null)[] =
      result.indicators?.quote?.[0]?.volume ?? [];
    const volumes = rawVolumes.filter((v): v is number => v != null && v > 0);
    const avgVolume =
      volumes.length > 0
        ? volumes.slice(-20).reduce((a, b) => a + b, 0) /
          Math.min(volumes.length, 20)
        : 0;

    const change =
      previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;

    return {
      symbol,
      price,
      previousClose,
      change,
      closes,
      name,
      volume,
      avgVolume,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
    };
  } catch {
    return null;
  }
}

// Batch fetch: 4 at a time, 300ms between batches, retry failures once
async function fetchBatch(
  tickers: string[],
): Promise<Map<string, YahooChartResult>> {
  const results = new Map<string, YahooChartResult>();
  const failed: string[] = [];

  for (let i = 0; i < tickers.length; i += 4) {
    const batch = tickers.slice(i, i + 4);
    if (i > 0) await new Promise((r) => setTimeout(r, 300));
    const batchResults = await Promise.all(batch.map(fetchYahooChart));
    batchResults.forEach((r, idx) => {
      if (r) results.set(batch[idx], r);
      else failed.push(batch[idx]);
    });
  }

  // Retry failed tickers once (2 at a time, slower)
  if (failed.length > 0) {
    for (let i = 0; i < failed.length; i += 2) {
      const batch = failed.slice(i, i + 2);
      await new Promise((r) => setTimeout(r, 500));
      const retryResults = await Promise.all(batch.map(fetchYahooChart));
      retryResults.forEach((r, idx) => {
        if (r) results.set(batch[idx], r);
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Volume formatting
// ---------------------------------------------------------------------------
function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return vol.toString();
}

function formatVolumeKR(vol: number): string {
  if (vol >= 100_000_000) return `${(vol / 100_000_000).toFixed(1)}억`;
  if (vol >= 10_000) return `${(vol / 10_000).toFixed(0)}만`;
  return vol.toLocaleString();
}

// ---------------------------------------------------------------------------
// Auto-generate 사유 (reason) from available metrics
// ---------------------------------------------------------------------------
function generateReason(data: YahooChartResult): string {
  const reasons: string[] = [];

  // Volume spike
  if (data.avgVolume > 0 && data.volume > 0) {
    const volRatio = data.volume / data.avgVolume;
    if (volRatio >= 3)
      reasons.push(`거래량 폭증 (평균 ${volRatio.toFixed(1)}배)`);
    else if (volRatio >= 2)
      reasons.push(`거래량 급증 (평균 ${volRatio.toFixed(1)}배)`);
    else if (volRatio >= 1.5)
      reasons.push(`거래량 증가 (평균 ${volRatio.toFixed(1)}배)`);
  }

  // 52-week high/low proximity
  if (data.fiftyTwoWeekHigh > 0 && data.price > 0) {
    const pctFromHigh =
      ((data.fiftyTwoWeekHigh - data.price) / data.fiftyTwoWeekHigh) * 100;
    const pctFromLow =
      data.fiftyTwoWeekLow > 0
        ? ((data.price - data.fiftyTwoWeekLow) / data.fiftyTwoWeekLow) * 100
        : 0;

    if (pctFromHigh <= 2) reasons.push("52주 최고가 근접");
    else if (pctFromHigh <= 5) reasons.push("52주 최고가 부근");
    else if (pctFromLow <= 5 && data.fiftyTwoWeekLow > 0)
      reasons.push("52주 최저가 근접");
    else if (pctFromLow <= 10 && data.fiftyTwoWeekLow > 0)
      reasons.push("52주 최저가 부근");
  }

  // Change magnitude description
  const absChange = Math.abs(data.change);
  if (absChange >= 20)
    reasons.push(data.change > 0 ? "대폭 상승" : "대폭 하락");
  else if (absChange >= 10)
    reasons.push(data.change > 0 ? "강한 상승세" : "강한 하락세");
  else if (absChange >= 5)
    reasons.push(data.change > 0 ? "상승세" : "하락세");

  return reasons.length > 0 ? reasons.join(" + ") : "-";
}

/** Generate reason for Naver/bulk stock data (less info than Yahoo) */
function generateNaverReason(stock: NaverStock): string {
  const reasons: string[] = [];
  const absRate = Math.abs(stock.changeRate);

  if (absRate >= 29.5) reasons.push(stock.changeRate > 0 ? "상한가" : "하한가");
  else if (absRate >= 20)
    reasons.push(stock.changeRate > 0 ? "대폭 상승" : "대폭 하락");
  else if (absRate >= 10)
    reasons.push(stock.changeRate > 0 ? "강한 상승세" : "강한 하락세");
  else if (absRate >= 5)
    reasons.push(stock.changeRate > 0 ? "상승세" : "하락세");

  return reasons.length > 0 ? reasons.join(" + ") : "-";
}

// ---------------------------------------------------------------------------
// MA Cross Detection (MA5 vs MA20) — 최근 3거래일 이내 크로스 감지
// ---------------------------------------------------------------------------
function detectCross(
  closes: number[],
): { type: "골든크로스" | "데드크로스"; ma5: number; ma20: number; daysAgo: number } | null {
  if (closes.length < 23) return null; // 20 + 3 lookback

  const calcMA = (data: number[], period: number, endIdx: number): number => {
    if (endIdx < period - 1) return 0;
    let sum = 0;
    for (let i = endIdx - period + 1; i <= endIdx; i++) sum += data[i];
    return sum / period;
  };

  const last = closes.length - 1;

  // 최근 3거래일 역순으로 검사 (오늘 → 어제 → 그저께)
  for (let d = 0; d < 3; d++) {
    const idx = last - d;
    const prevIdx = idx - 1;
    if (prevIdx < 19) continue; // MA20 계산에 최소 20개 필요

    const ma5Now = calcMA(closes, 5, idx);
    const ma20Now = calcMA(closes, 20, idx);
    const ma5Prev = calcMA(closes, 5, prevIdx);
    const ma20Prev = calcMA(closes, 20, prevIdx);

    if (ma5Prev <= ma20Prev && ma5Now > ma20Now) {
      return {
        type: "골든크로스",
        ma5: Math.round(ma5Now * 100) / 100,
        ma20: Math.round(ma20Now * 100) / 100,
        daysAgo: d,
      };
    }
    if (ma5Prev >= ma20Prev && ma5Now < ma20Now) {
      return {
        type: "데드크로스",
        ma5: Math.round(ma5Now * 100) / 100,
        ma20: Math.round(ma20Now * 100) / 100,
        daysAgo: d,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// ForexFactory Economic Calendar
// ---------------------------------------------------------------------------
async function fetchForexFactory(): Promise<{
  all: SheetRow[];
  us: SheetRow[];
} | null> {
  try {
    const res = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const json = await res.json();

    const majorCurrencies = new Set([
      "USD",
      "EUR",
      "JPY",
      "GBP",
      "CNY",
      "AUD",
      "CAD",
      "CHF",
      "NZD",
    ]);

    const events: SheetRow[] = (json ?? [])
      .filter(
        (e: { impact: string; country: string }) =>
          (e.impact === "High" || e.impact === "Medium") &&
          majorCurrencies.has(e.country),
      )
      .slice(0, 30)
      .map(
        (e: {
          title: string;
          date: string;
          previous: string;
          forecast: string;
          impact: string;
          country: string;
        }) => {
          const d = new Date(e.date);
          const isoDate = d.toISOString().split("T")[0];
          const forecastText = [
            e.forecast ? `예상: ${e.forecast}` : "",
            e.previous ? `이전: ${e.previous}` : "",
          ]
            .filter(Boolean)
            .join(", ");

          return {
            날짜: isoDate,
            이벤트명: `[${e.country}] ${e.title}`,
            중요도: e.impact === "High" ? "상" : "중",
            예상영향: forecastText || "-",
            출처URL: "https://www.forexfactory.com/calendar",
          };
        },
      );

    const usEvents = events.filter((e) => e.이벤트명.startsWith("[USD]"));
    return { all: events, us: usEvents };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Google Sheets (backup source — kept for merge if data is recent)
// ---------------------------------------------------------------------------
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || "";
const TAB_NAMES = [
  "상한가",
  "하한가",
  "급등락",
  "크로스",
  "경제일정",
  "US_급등락",
  "US_크로스",
  "US_경제일정",
];

function buildCsvUrl(sheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCsv(csv: string): SheetRow[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: SheetRow = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

async function fetchGoogleSheets(): Promise<Record<
  string,
  SheetRow[]
> | null> {
  if (!SHEETS_ID) return null;
  try {
    const result: Record<string, SheetRow[]> = {};
    const fetches = TAB_NAMES.map(async (tabName) => {
      try {
        const url = buildCsvUrl(SHEETS_ID, tabName);
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return { tabName, rows: [] as SheetRow[] };
        const csv = await res.text();
        return { tabName, rows: parseCsv(csv) };
      } catch {
        return { tabName, rows: [] as SheetRow[] };
      }
    });
    const results = await Promise.all(fetches);
    for (const { tabName, rows } of results) {
      result[tabName] = rows;
    }

    // Check if sheets data is within 24 hours (not stale)
    const today = new Date();
    const recentDates: string[] = [];
    for (let d = 0; d < 2; d++) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - d);
      recentDates.push(dt.toISOString().split("T")[0]);
    }
    const hasRecent = Object.values(result).some((rows) =>
      rows.some((row) =>
        recentDates.some((d) => Object.values(row).includes(d)),
      ),
    );
    return hasRecent ? result : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache (10 minutes TTL)
// ---------------------------------------------------------------------------
let cache: {
  data: Record<string, SheetRow[]>;
  timestamp: number;
  source: string;
} | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Sample data fallback
// ---------------------------------------------------------------------------
function getSampleData(): Record<string, SheetRow[]> {
  const today = new Date().toISOString().split("T")[0];
  return {
    상한가: [
      {
        날짜: today,
        종목코드: "005930",
        종목명: "삼성전자",
        시장: "KOSPI",
        종가: "72000",
        "등락률(%)": "29.7",
        거래량: "15234567",
        사유: "반도체 슈퍼사이클 기대감 + 외국인 대규모 매수",
      },
    ],
    하한가: [
      {
        날짜: today,
        종목코드: "123456",
        종목명: "테스트종목",
        시장: "KOSDAQ",
        종가: "5000",
        "등락률(%)": "-29.9",
        거래량: "2345678",
        사유: "실적 쇼크 + 대규모 유상증자 발표",
      },
    ],
    급등락: [
      {
        날짜: today,
        종목코드: "035720",
        종목명: "카카오",
        시장: "KOSPI",
        종가: "45000",
        "등락률(%)": "8.5",
        방향: "급등",
        거래량: "12345678",
        사유: "AI 서비스 매출 급증 호재",
      },
      {
        날짜: today,
        종목코드: "035420",
        종목명: "NAVER",
        시장: "KOSPI",
        종가: "210000",
        "등락률(%)": "-6.2",
        방향: "급락",
        거래량: "5678901",
        사유: "해외 사업 실적 부진 우려",
      },
    ],
    크로스: [
      {
        날짜: today,
        종목코드: "005380",
        종목명: "현대차",
        시장: "KOSPI",
        유형: "골든크로스",
        발생: "오늘",
        단기MA: "235000",
        장기MA: "228000",
        종가: "240000",
      },
    ],
    경제일정: [
      {
        날짜: today,
        이벤트명: "[USD] FOMC Minutes",
        중요도: "상",
        예상영향: "금리 인하 시점 관련 힌트 주목",
        출처URL: "https://www.federalreserve.gov",
      },
    ],
    US_급등락: [
      {
        날짜: today,
        Ticker: "NVDA",
        종목명: "NVIDIA Corp",
        시장: "다우존스",
        종가: "875.50",
        "등락률(%)": "8.23",
        방향: "급등",
        거래량: "98765432",
        사유: "AI GPU demand surge",
      },
    ],
    US_크로스: [
      {
        날짜: today,
        Ticker: "NVDA",
        종목명: "NVIDIA Corp",
        시장: "다우존스",
        유형: "골든크로스",
        발생: "1일전",
        단기MA: "850.00",
        장기MA: "820.50",
        종가: "875.50",
      },
    ],
    US_경제일정: [
      {
        날짜: today,
        이벤트명: "[USD] FOMC Minutes Release",
        중요도: "상",
        예상영향: "금리 인하 시점 힌트. 비둘기파 기조 시 기술주 반등 기대",
        출처URL: "https://www.federalreserve.gov",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main data assembly — KRX + Yahoo Finance + ForexFactory + Sheets merge
// ---------------------------------------------------------------------------
async function fetchLiveData(): Promise<{
  data: Record<string, SheetRow[]>;
  source: string;
}> {
  const today = new Date().toISOString().split("T")[0];
  const krNameMap = new Map(
    KR_CROSS_STOCKS.map((s) => [s.ticker, { name: s.name, market: s.market }]),
  );

  // Fetch all sources in parallel:
  // - Naver sise_upper / sise_lower for 상한가/하한가 (전 종목 스캔)
  // - Naver Finance Top200 for 급등락 (시총 상위)
  // - Yahoo for US stocks + KR cross detection (MA requires 1mo history)
  // - ForexFactory for economic calendar
  // - Google Sheets as backup
  const [
    upperStocks,
    lowerStocks,
    naverData,
    usResults,
    krCrossResults,
    calendarData,
    sheetsData,
  ] = await Promise.all([
    fetchNaverLimitStocks("upper"),
    fetchNaverLimitStocks("lower"),
    fetchTop200NaverData(),
    fetchBatch(ALL_US_TICKERS),
    fetchBatch(KR_CROSS_STOCKS.map((s) => s.ticker)),
    fetchForexFactory(),
    fetchGoogleSheets(),
  ]);

  const hasNaver = naverData.length > 0;
  console.log(
    `[stock-daily] Naver: ${naverData.length} stocks, Yahoo US: ${usResults.size}, Yahoo KR cross: ${krCrossResults.size}`,
  );

  // --- KR 상한가/하한가: from Naver sise_upper/sise_lower (전 종목 스캔) ---
  const isRealStock = (name: string) =>
    !/(ETN|ETF|레버리지|인버스|KODEX|TIGER|KOSEF|KBSTAR|ARIRANG|SOL\s|PLUS\s|ACE\s|HANARO|iSelect|월간\s)/.test(name);

  let sanghan: SheetRow[] = upperStocks
    .filter((s) => isRealStock(s.name))
    .map((s) => ({
      날짜: s.date,
      종목코드: s.code,
      종목명: s.name,
      시장: s.market,
      종가: Math.round(s.close).toString(),
      "등락률(%)": s.changeRate.toFixed(2),
      거래량: formatVolumeKR(s.volume),
      사유: "상한가 도달",
    }));

  let hahan: SheetRow[] = lowerStocks
    .filter((s) => isRealStock(s.name))
    .map((s) => ({
      날짜: s.date,
      종목코드: s.code,
      종목명: s.name,
      시장: s.market,
      종가: Math.round(s.close).toString(),
      "등락률(%)": s.changeRate.toFixed(2),
      거래량: formatVolumeKR(s.volume),
      사유: "하한가 도달",
    }));

  console.log(
    `[stock-daily] Limit stocks: 상한가=${sanghan.length} (from sise_upper), 하한가=${hahan.length} (from sise_lower)`,
  );

  // --- KR 급등락: from Naver Top200 or Yahoo fallback ---
  let krMovers: SheetRow[] = [];

  if (hasNaver) {
    krMovers = naverData
      .filter((s) => Math.abs(s.changeRate) >= 5 && isRealStock(s.name))
      .sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate))
      .slice(0, 200)
      .map((s) => ({
        날짜: s.date,
        종목코드: s.code,
        종목명: s.name,
        시장: s.market,
        종가: Math.round(s.close).toString(),
        "등락률(%)": s.changeRate.toFixed(2),
        방향: s.changeRate > 0 ? "급등" : "급락",
        거래량: formatVolumeKR(s.volume),
        사유: generateNaverReason(s),
      }));

    console.log(`[stock-daily] Naver 급등락: ${krMovers.length}`);
  } else {
    // Fallback: Yahoo Finance for limited KR stocks
    console.log("[stock-daily] Naver unavailable, falling back to Yahoo for KR");
    for (const [ticker, data] of krCrossResults) {
      const info = krNameMap.get(ticker);
      if (Math.abs(data.change) >= 5) {
        krMovers.push({
          날짜: today,
          종목코드: ticker.replace(/\.(KS|KQ)$/, ""),
          종목명: info?.name || data.name,
          시장: info?.market || "KOSPI",
          종가: Math.round(data.price).toString(),
          "등락률(%)": data.change.toFixed(2),
          방향: data.change > 0 ? "급등" : "급락",
          거래량: data.volume > 0 ? formatVolumeKR(data.volume) : "-",
          사유: generateReason(data),
        });
      }
    }
    krMovers.sort(
      (a, b) =>
        Math.abs(parseFloat(b["등락률(%)"])) -
        Math.abs(parseFloat(a["등락률(%)"])),
    );
  }

  // --- KR 크로스: MA5 vs MA20 (Yahoo — needs 1mo daily history) ---
  const krCross: SheetRow[] = [];
  for (const [ticker, data] of krCrossResults) {
    const info = krNameMap.get(ticker);
    const cross = detectCross(data.closes);
    if (cross) {
      krCross.push({
        날짜: today,
        종목코드: ticker.replace(/\.(KS|KQ)$/, ""),
        종목명: info?.name || data.name,
        시장: info?.market || "KOSPI",
        유형: cross.type,
        발생: cross.daysAgo === 0 ? "오늘" : `${cross.daysAgo}일전`,
        단기MA: Math.round(cross.ma5).toString(),
        장기MA: Math.round(cross.ma20).toString(),
        종가: Math.round(data.price).toString(),
      });
    }
  }

  // --- US_급등락: |change| >= 3% ---
  const usMovers: SheetRow[] = [];
  for (const [ticker, data] of usResults) {
    const usMarket = US_DJIA_SET.has(ticker) ? "다우존스" : "나스닥";
    if (Math.abs(data.change) >= 3) {
      usMovers.push({
        날짜: today,
        Ticker: ticker,
        종목명: data.name,
        시장: usMarket,
        종가: data.price.toFixed(2),
        "등락률(%)": data.change.toFixed(2),
        방향: data.change > 0 ? "급등" : "급락",
        거래량: data.volume > 0 ? formatVolume(data.volume) : "-",
        사유: generateReason(data),
      });
    }
  }
  usMovers.sort(
    (a, b) =>
      Math.abs(parseFloat(b["등락률(%)"])) -
      Math.abs(parseFloat(a["등락률(%)"])),
  );

  // --- US_크로스: MA5 vs MA20 golden/dead cross ---
  const usCross: SheetRow[] = [];
  for (const [ticker, data] of usResults) {
    const usMarket = US_DJIA_SET.has(ticker) ? "다우존스" : "나스닥";
    const cross = detectCross(data.closes);
    if (cross) {
      usCross.push({
        날짜: today,
        Ticker: ticker,
        종목명: data.name,
        시장: usMarket,
        유형: cross.type,
        발생: cross.daysAgo === 0 ? "오늘" : `${cross.daysAgo}일전`,
        단기MA: cross.ma5.toFixed(2),
        장기MA: cross.ma20.toFixed(2),
        종가: data.price.toFixed(2),
      });
    }
  }

  // --- 경제일정 ---
  const allCalendar: SheetRow[] = calendarData?.all || [];
  const usCalendar: SheetRow[] = calendarData?.us || [];

  // Assemble result
  const result: Record<string, SheetRow[]> = {
    상한가: sanghan,
    하한가: hahan,
    급등락: krMovers,
    크로스: krCross,
    경제일정: allCalendar,
    US_급등락: usMovers,
    US_크로스: usCross,
    US_경제일정: usCalendar,
  };

  // Merge Google Sheets data for empty tabs (if sheets data is recent)
  if (sheetsData) {
    for (const tab of TAB_NAMES) {
      if (sheetsData[tab]?.length > 0 && result[tab].length === 0) {
        result[tab] = sheetsData[tab];
      }
    }
  }

  const hasLimitData = upperStocks.length > 0 || lowerStocks.length > 0;
  const source = [
    hasLimitData ? "naver-sise" : "",
    hasNaver ? "naver-top200" : "",
    usResults.size > 0 || krCrossResults.size > 0 ? "yahoo" : "",
    sheetsData ? "sheets" : "",
  ]
    .filter(Boolean)
    .join("+") || "sample";

  return { data: result, source };
}

// ---------------------------------------------------------------------------
// GET Handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Return cache if fresh
    if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        data: cache.data,
        cachedAt: cache.timestamp,
        fresh: false,
        source: cache.source,
      });
    }

    // Fetch live data
    const { data, source } = await fetchLiveData();
    const now = Date.now();
    cache = { data, timestamp: now, source };

    return NextResponse.json({
      data,
      cachedAt: now,
      fresh: true,
      source,
    });
  } catch (error) {
    console.error("Stock daily API error:", error);

    // Return stale cache if available
    if (cache) {
      return NextResponse.json({
        data: cache.data,
        cachedAt: cache.timestamp,
        fresh: false,
        source: "cache",
      });
    }

    // Final fallback: sample data
    return NextResponse.json({
      data: getSampleData(),
      cachedAt: Date.now(),
      fresh: false,
      source: "sample",
    });
  }
}
