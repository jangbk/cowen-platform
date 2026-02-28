import { NextResponse } from "next/server";

// Cache: 5 minutes
let cache: { data: Record<string, unknown>; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchJSON(url: string, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const result: Record<string, unknown> = {};

  // Fetch all in parallel
  const [fundingRes, lsRes, oiRes, mvrvRes, mktCapRes, minersRes, txVolRes, addrRes, priceHistRes] =
    await Promise.allSettled([
      // 1. Binance Funding Rate
      fetchJSON(
        "https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1"
      ),
      // 2. Binance Long/Short Ratio
      fetchJSON(
        "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1"
      ),
      // 3. Binance Open Interest
      fetchJSON(
        "https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&limit=48"
      ),
      // 4. CoinMetrics MVRV
      fetchJSON(
        "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur&frequency=1d&page_size=1&start_time=2026-01-01"
      ),
      // 5. CoinMetrics Market Cap (for NVT calculation)
      fetchJSON(
        "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMrktCurUSD&frequency=1d&page_size=1&start_time=2026-01-01"
      ),
      // 6. blockchain.com Miners Revenue (for Puell Multiple)
      fetchJSON(
        "https://api.blockchain.info/charts/miners-revenue?timespan=365days&format=json&sampled=true"
      ),
      // 7. blockchain.com Transaction Volume (for NVT)
      fetchJSON(
        "https://api.blockchain.info/charts/estimated-transaction-volume-usd?timespan=90days&format=json&sampled=true"
      ),
      // 8. blockchain.com Active Addresses
      fetchJSON(
        "https://api.blockchain.info/charts/n-unique-addresses?timespan=30days&format=json"
      ),
      // 9. CoinGecko BTC price history (1400 days for 200W MA + Pi Cycle)
      fetchJSON(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1400&interval=daily"
      ),
    ]);

  // --- Funding Rate ---
  if (fundingRes.status === "fulfilled" && Array.isArray(fundingRes.value)) {
    const item = fundingRes.value[0];
    if (item) {
      result.fundingRate = parseFloat(item.fundingRate);
      result.fundingMarkPrice = parseFloat(item.markPrice);
    }
  }

  // --- Long/Short Ratio ---
  if (lsRes.status === "fulfilled" && Array.isArray(lsRes.value)) {
    const item = lsRes.value[0];
    if (item) {
      result.longShortRatio = parseFloat(item.longShortRatio);
      result.longAccount = parseFloat(item.longAccount);
      result.shortAccount = parseFloat(item.shortAccount);
    }
  }

  // --- Open Interest ---
  if (oiRes.status === "fulfilled" && Array.isArray(oiRes.value)) {
    const items = oiRes.value;
    if (items.length > 0) {
      const latest = items[items.length - 1];
      result.openInterest = parseFloat(latest.sumOpenInterest);
      result.openInterestValue = parseFloat(latest.sumOpenInterestValue);
      // Calculate 24h OI change
      if (items.length >= 24) {
        const prev24 = items[items.length - 24];
        const prevOI = parseFloat(prev24.sumOpenInterestValue);
        const currOI = parseFloat(latest.sumOpenInterestValue);
        result.oiChange24h = ((currOI - prevOI) / prevOI) * 100;
      }
    }
  }

  // --- MVRV Z-Score ---
  if (mvrvRes.status === "fulfilled" && mvrvRes.value?.data?.length > 0) {
    const items = mvrvRes.value.data;
    const latest = items[items.length - 1];
    result.mvrv = parseFloat(latest.CapMVRVCur);
  }

  // --- Puell Multiple ---
  if (minersRes.status === "fulfilled" && minersRes.value?.values?.length > 0) {
    const vals = minersRes.value.values;
    const latestRevenue = vals[vals.length - 1].y;
    const avg365 =
      vals.reduce((sum: number, v: { y: number }) => sum + v.y, 0) / vals.length;
    result.puellMultiple = latestRevenue / avg365;
    result.minerRevenue = latestRevenue;
    result.minerRevenueAvg365 = avg365;
  }

  // --- NVT Signal ---
  if (
    txVolRes.status === "fulfilled" &&
    txVolRes.value?.values?.length > 0 &&
    mktCapRes.status === "fulfilled" &&
    mktCapRes.value?.data?.length > 0
  ) {
    const txVals = txVolRes.value.values;
    const avg90Vol =
      txVals.reduce((sum: number, v: { y: number }) => sum + v.y, 0) /
      txVals.length;
    const mktCap = parseFloat(
      mktCapRes.value.data[mktCapRes.value.data.length - 1].CapMrktCurUSD
    );
    result.nvtSignal = mktCap / avg90Vol;
    result.dailyTxVolume = txVals[txVals.length - 1].y;
    result.marketCap = mktCap;
  }

  // --- Active Addresses ---
  if (addrRes.status === "fulfilled" && addrRes.value?.values?.length > 0) {
    const vals = addrRes.value.values;
    const latest = vals[vals.length - 1].y;
    const avg30 =
      vals.reduce((sum: number, v: { y: number }) => sum + v.y, 0) / vals.length;
    result.activeAddresses = latest;
    result.activeAddressesAvg30 = avg30;
    result.activeAddressesChange = ((latest - avg30) / avg30) * 100;
  }

  // --- 200W MA Multiple & Pi Cycle Top & SOPR approx ---
  if (priceHistRes.status === "fulfilled" && priceHistRes.value?.prices?.length > 0) {
    const prices: number[] = priceHistRes.value.prices.map((p: [number, number]) => p[1]);
    const currentPrice = prices[prices.length - 1];

    // 200W MA Multiple (200 weeks = 1400 days)
    if (prices.length >= 1400) {
      const sma200w = prices.slice(-1400).reduce((a: number, b: number) => a + b, 0) / 1400;
      result.ma200wMultiple = currentPrice / sma200w;
      result.ma200wSma = sma200w;
    } else if (prices.length >= 200) {
      // Use whatever we have
      const sma = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      result.ma200wMultiple = currentPrice / sma;
      result.ma200wSma = sma;
    }

    // Pi Cycle Top: 111DMA crossing above 350DMA * 2
    if (prices.length >= 350) {
      const sma111 = prices.slice(-111).reduce((a: number, b: number) => a + b, 0) / 111;
      const sma350x2 = (prices.slice(-350).reduce((a: number, b: number) => a + b, 0) / 350) * 2;
      result.piCycleTriggered = sma111 >= sma350x2;
      result.piCycle111DMA = sma111;
      result.piCycle350DMAx2 = sma350x2;
      result.piCycleGap = ((sma350x2 - sma111) / sma350x2) * 100; // % gap, negative = triggered
    }

    result.btcCurrentPrice = currentPrice;
  }

  result.source = "binance/coinmetrics/blockchain.com/coingecko";
  result.timestamp = new Date().toISOString();

  // Cache the result
  cache = { data: result, ts: Date.now() };

  return NextResponse.json(result);
}
