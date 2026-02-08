import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/history?coin=bitcoin&days=365
// Fetches historical price data from CoinGecko free API.
// Returns data in [[timestamp, price], ...] format.
// Can also return derived metrics: rsi, sma, bollinger, etc.
// ---------------------------------------------------------------------------

const VALID_COINS = [
  "bitcoin", "ethereum", "binancecoin", "solana", "ripple",
  "cardano", "dogecoin", "chainlink", "polkadot", "avalanche-2",
  "litecoin", "uniswap", "matic-network", "tron", "cosmos",
];

// ─── Fetch historical prices ────────────────────────────────────
async function fetchHistory(
  coin: string,
  days: number,
): Promise<Array<[number, number]> | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    } as RequestInit);

    if (!res.ok) return null;
    const json = await res.json();
    return json.prices ?? null;
  } catch {
    return null;
  }
}

// ─── Technical Indicator Calculators ────────────────────────────

function calculateSMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    const slice = prices.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return rsi;

  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss -= changes[i];
  }
  avgGain /= period;
  avgLoss /= period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
    rsi[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

function calculateBollinger(
  prices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2,
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = middle[i]!;
    const variance = slice.reduce((sum, p) => sum + (p - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper.push(mean + stdDevMultiplier * stdDev);
    lower.push(mean - stdDevMultiplier * stdDev);
  }

  return { upper, middle, lower };
}

function calculateMACD(
  prices: number[],
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine: (number | null)[] = prices.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? ema12[i]! - ema26[i]! : null,
  );

  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalValues = calculateEMA(macdValues, 9);
  const signal: (number | null)[] = new Array(macdLine.length).fill(null);
  let idx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      signal[i] = signalValues[idx] ?? null;
      idx++;
    }
  }

  const histogram: (number | null)[] = macdLine.map((m, i) =>
    m !== null && signal[i] !== null ? m - signal[i]! : null,
  );

  return { macd: macdLine, signal, histogram };
}

function calculateEMA(prices: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return ema;

  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  ema[period - 1] = sum / period;

  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]!) * multiplier + ema[i - 1]!;
  }
  return ema;
}

// ─── Generate realistic sample data ──────────────────────────────
function generateSample(days: number, base: number, seed: number): Array<[number, number]> {
  const now = Date.now();
  const dayMs = 86_400_000;
  const data: Array<[number, number]> = [];

  for (let d = days; d >= 0; d--) {
    const t = (days - d) / days; // 0..1 over the period
    // Realistic crypto price movement: base oscillation + trend
    const cycle1 = Math.sin(2 * Math.PI * t * 2.5 + seed) * base * 0.15;
    const cycle2 = Math.sin(2 * Math.PI * t * 6 + seed * 1.7) * base * 0.08;
    const micro = Math.sin(2 * Math.PI * t * 30 + seed * 3) * base * 0.03;
    const trend = base * 0.1 * (t - 0.5); // slight overall drift
    const price = Math.max(base * 0.5, base + cycle1 + cycle2 + micro + trend);
    data.push([now - d * dayMs, parseFloat(price.toFixed(2))]);
  }
  return data;
}

// ─── Log-linear regression helper ────────────────────────────────
function logLinearRegression(prices: number[]) {
  const n = prices.length;
  const logP = prices.map((p) => Math.log(Math.max(p, 1)));
  let sX = 0, sY = 0, sXY = 0, sX2 = 0;
  for (let i = 0; i < n; i++) {
    sX += i; sY += logP[i]; sXY += i * logP[i]; sX2 += i * i;
  }
  const denom = n * sX2 - sX * sX;
  if (denom === 0) return { slope: 0, intercept: logP[0] || 0, stdDev: 0 };
  const slope = (n * sXY - sX * sY) / denom;
  const intercept = (sY - slope * sX) / n;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (logP[i] - (slope * i + intercept)) ** 2;
  }
  return { slope, intercept, stdDev: Math.sqrt(ssRes / n) };
}

// ─── Compute indicators helper ──────────────────────────────────
function computeIndicators(
  data: Array<[number, number]>,
  metric: string | null,
): Record<string, unknown> {
  const prices = data.map((p) => p[1]);
  const timestamps = data.map((p) => p[0]);
  const extras: Record<string, unknown> = {};

  if (metric === "mvrv") {
    // MVRV Z-Score approximation: (Price - SMA200) / StdDev200
    const sma200 = calculateSMA(prices, 200);
    const mvrv: (number | null)[] = prices.map((price, i) => {
      if (i < 199 || sma200[i] === null) return null;
      const slice = prices.slice(i - 199, i + 1);
      const mean = sma200[i]!;
      const variance = slice.reduce((sum, p) => sum + (p - mean) ** 2, 0) / 200;
      const stdDev = Math.sqrt(variance);
      if (stdDev === 0) return 0;
      return (price - mean) / stdDev;
    });
    extras.indicator = timestamps.map((ts, i) => [ts, mvrv[i]]).filter((d) => d[1] !== null);
  } else if (metric === "rsi") {
    const rsi = calculateRSI(prices);
    extras.indicator = timestamps.map((ts, i) => [ts, rsi[i]]).filter((d) => d[1] !== null);
  } else if (metric === "sma") {
    const sma200 = calculateSMA(prices, 200);
    const sma50 = calculateSMA(prices, 50);
    extras.sma200 = timestamps.map((ts, i) => [ts, sma200[i]]).filter((d) => d[1] !== null);
    extras.sma50 = timestamps.map((ts, i) => [ts, sma50[i]]).filter((d) => d[1] !== null);
  } else if (metric === "bollinger") {
    const bb = calculateBollinger(prices);
    extras.upper = timestamps.map((ts, i) => [ts, bb.upper[i]]).filter((d) => d[1] !== null);
    extras.middle = timestamps.map((ts, i) => [ts, bb.middle[i]]).filter((d) => d[1] !== null);
    extras.lower = timestamps.map((ts, i) => [ts, bb.lower[i]]).filter((d) => d[1] !== null);
  } else if (metric === "macd") {
    const macdResult = calculateMACD(prices);
    extras.indicator = timestamps.map((ts, i) => [ts, macdResult.histogram[i]]).filter((d) => d[1] !== null);
  } else if (metric === "logreg") {
    // Log regression bands: exponential trend ± 2σ
    const { slope, intercept, stdDev } = logLinearRegression(prices);
    extras.regressionMiddle = timestamps.map((ts, i) => [ts, Math.exp(slope * i + intercept)]);
    extras.regressionUpper = timestamps.map((ts, i) => [ts, Math.exp(slope * i + intercept + 2 * stdDev)]);
    extras.regressionLower = timestamps.map((ts, i) => [ts, Math.exp(slope * i + intercept - 2 * stdDev)]);
  } else if (metric === "rainbow") {
    // Rainbow: 9 colored bands based on regression center
    const { slope, intercept } = logLinearRegression(prices);
    const mults = [0.45, 0.55, 0.68, 0.82, 1.0, 1.2, 1.45, 1.75, 2.2];
    for (let b = 0; b < 9; b++) {
      extras[`rainbow${b}`] = timestamps.map((ts, i) => [ts, Math.exp(slope * i + intercept) * mults[b]]);
    }
  } else if (metric === "s2f") {
    // Stock-to-Flow model line based on Bitcoin halving schedule
    const GENESIS = new Date("2009-01-03").getTime();
    // Halving dates (approximate block times)
    const HALVINGS = [
      new Date("2012-11-28").getTime(),
      new Date("2016-07-09").getTime(),
      new Date("2020-05-11").getTime(),
      new Date("2024-04-20").getTime(),
      new Date("2028-04-20").getTime(), // estimated
    ];

    extras.s2fModel = timestamps.map((ts) => {
      const days = Math.max(1, (ts - GENESIS) / 86400000);
      const totalBlocks = days * 144;
      const era = Math.min(Math.floor(totalBlocks / 210000), 9);
      const reward = 50 / Math.pow(2, era);
      let supply = 0;
      for (let e = 0; e < era; e++) supply += 210000 * 50 / Math.pow(2, e);
      supply += (totalBlocks - era * 210000) * reward;
      supply = Math.min(supply, 21000000);
      const annualFlow = 144 * 365.25 * reward;
      const s2f = annualFlow > 0 ? supply / annualFlow : 1;
      // Calibrated S2F model: exp(1.84 * ln(S2F) + 2.51)
      return [ts, Math.exp(1.84 * Math.log(Math.max(s2f, 1)) + 2.51)];
    });

    // Color segments: split BTC price into 10 segments by halving progress
    // Progress 0 = just after halving (blue), 1 = just before next halving (red)
    const NUM_SEGMENTS = 10;
    const segments: Array<Array<[number, number]>> = Array.from({ length: NUM_SEGMENTS }, () => []);
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      // Find current halving cycle
      let prevHalving = GENESIS;
      let nextHalving = HALVINGS[HALVINGS.length - 1];
      for (let h = 0; h < HALVINGS.length; h++) {
        if (ts < HALVINGS[h]) { nextHalving = HALVINGS[h]; break; }
        prevHalving = HALVINGS[h];
      }
      const cycleLen = nextHalving - prevHalving;
      const progress = cycleLen > 0 ? Math.max(0, Math.min(1, (ts - prevHalving) / cycleLen)) : 0;
      const segIdx = Math.min(NUM_SEGMENTS - 1, Math.floor(progress * NUM_SEGMENTS));
      // Add to this segment and also overlap with adjacent for continuity
      segments[segIdx].push([ts, prices[i]]);
      if (segIdx > 0 && (segments[segIdx].length === 1)) {
        segments[segIdx - 1].push([ts, prices[i]]);
      }
    }
    for (let s = 0; s < NUM_SEGMENTS; s++) {
      if (segments[s].length > 0) {
        extras[`s2fColor${s}`] = segments[s];
      }
    }
  } else if (metric === "compare_gold") {
    // Simulated Gold price normalized to BTC start, for ROI comparison
    const btcStart = prices[0];
    const goldBase = 2000; // approximate gold USD price
    const goldData: Array<[number, number]> = [];
    for (let i = 0; i < timestamps.length; i++) {
      const t = i / Math.max(timestamps.length - 1, 1);
      // Gold: slow steady growth ~8% annualized + mild oscillation
      const goldPrice = goldBase * (1 + 0.08 * t + Math.sin(2 * Math.PI * t * 3) * 0.03);
      // Normalize: both start at same base (BTC's starting price)
      const goldNorm = btcStart * (goldPrice / goldBase);
      goldData.push([timestamps[i], parseFloat(goldNorm.toFixed(2))]);
    }
    extras.compareOverlay = goldData;
    extras.compareLabel = "Gold (XAU)";
  } else if (metric === "compare_sp500") {
    // Simulated S&P 500 normalized to BTC start, for ROI comparison
    const btcStart = prices[0];
    const spBase = 5000; // approximate S&P500 level
    const spData: Array<[number, number]> = [];
    for (let i = 0; i < timestamps.length; i++) {
      const t = i / Math.max(timestamps.length - 1, 1);
      // S&P 500: ~12% annualized + moderate volatility
      const spPrice = spBase * (1 + 0.12 * t + Math.sin(2 * Math.PI * t * 4) * 0.05);
      const spNorm = btcStart * (spPrice / spBase);
      spData.push([timestamps[i], parseFloat(spNorm.toFixed(2))]);
    }
    extras.compareOverlay = spData;
    extras.compareLabel = "S&P 500";
  } else if (metric === "powerlaw") {
    // Power law: ln(price) vs ln(days_since_genesis) regression
    const GENESIS = new Date("2009-01-03").getTime();
    const logDays = timestamps.map((ts) => Math.log(Math.max((ts - GENESIS) / 86400000, 1)));
    const logP = prices.map((p) => Math.log(Math.max(p, 1)));
    const n = logDays.length;
    let sX = 0, sY = 0, sXY = 0, sX2 = 0;
    for (let i = 0; i < n; i++) {
      sX += logDays[i]; sY += logP[i]; sXY += logDays[i] * logP[i]; sX2 += logDays[i] * logDays[i];
    }
    const denom = n * sX2 - sX * sX;
    const a = denom !== 0 ? (n * sXY - sX * sY) / denom : 0;
    const b = (sY - a * sX) / n;
    let ssRes = 0;
    for (let i = 0; i < n; i++) ssRes += (logP[i] - (a * logDays[i] + b)) ** 2;
    const sd = Math.sqrt(ssRes / n);
    extras.powerlawMiddle = timestamps.map((ts, i) => [ts, Math.exp(a * logDays[i] + b)]);
    extras.powerlawUpper = timestamps.map((ts, i) => [ts, Math.exp(a * logDays[i] + b + 2 * sd)]);
    extras.powerlawLower = timestamps.map((ts, i) => [ts, Math.exp(a * logDays[i] + b - 2 * sd)]);
  }

  return extras;
}

// ─── Base prices for sample data (approximate current prices) ───
const BASE_PRICES: Record<string, number> = {
  bitcoin: 70000, ethereum: 2700, binancecoin: 580, solana: 120,
  ripple: 0.55, cardano: 0.45, dogecoin: 0.08, chainlink: 14,
  polkadot: 5.5, "avalanche-2": 22, litecoin: 72, uniswap: 6.5,
  "matic-network": 0.55, tron: 0.12, cosmos: 7.5,
};

// ─── Route Handler ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const coin = searchParams.get("coin") ?? "bitcoin";
  // CoinGecko free API caps at 365 days
  const days = Math.min(parseInt(searchParams.get("days") ?? "365", 10), 365);
  const metric = searchParams.get("metric"); // rsi, sma, bollinger, macd

  const isValidCoin = VALID_COINS.includes(coin);
  const history = isValidCoin ? await fetchHistory(coin, days) : null;

  if (history && history.length > 0) {
    const result: Record<string, unknown> = {
      source: "coingecko",
      coin,
      data: history,
      ...computeIndicators(history, metric),
    };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  }

  // Fallback sample with indicators
  const basePrice = BASE_PRICES[coin] ?? 100;
  const seed = coin.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const sampleData = generateSample(days, basePrice, seed);

  const result: Record<string, unknown> = {
    source: "sample",
    coin,
    data: sampleData,
    ...computeIndicators(sampleData, metric),
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
