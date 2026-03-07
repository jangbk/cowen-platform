import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/market-cap?type=total|btc|eth|altcoin|stablecoin
// Returns historical market-cap data as [timestamp, value] pairs.
// Combines hardcoded long-term history + CoinGecko recent 365 days.
// ---------------------------------------------------------------------------

const LABELS: Record<string, string> = {
  total: "Total Crypto Market Cap",
  btc: "Bitcoin Market Cap",
  eth: "Ethereum Market Cap",
  altcoin: "Altcoin Market Cap (excl. BTC)",
  stablecoin: "Stablecoin Market Cap",
};

// ---------------------------------------------------------------------------
// Historical milestone data (weekly samples from public records)
// Sources: CoinMarketCap historical snapshots, blockchain.com, etc.
// Format: [timestamp_ms, market_cap_usd]
// ---------------------------------------------------------------------------
function dateMs(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d).getTime();
}

// BTC Market Cap milestones (2010 ~ 2024) - weekly/monthly key points
const BTC_HISTORY: Array<[number, number]> = [
  [dateMs(2010, 7, 18), 700_000],
  [dateMs(2010, 10, 1), 800_000],
  [dateMs(2011, 1, 1), 2_000_000],
  [dateMs(2011, 3, 1), 15_000_000],
  [dateMs(2011, 6, 9), 206_000_000],    // first bubble peak ~$32
  [dateMs(2011, 11, 1), 30_000_000],
  [dateMs(2012, 1, 1), 50_000_000],
  [dateMs(2012, 6, 1), 70_000_000],
  [dateMs(2012, 11, 28), 130_000_000],  // first halving
  [dateMs(2013, 1, 1), 150_000_000],
  [dateMs(2013, 4, 10), 1_500_000_000], // $266 peak
  [dateMs(2013, 7, 1), 1_000_000_000],
  [dateMs(2013, 12, 4), 14_000_000_000], // $1,100 peak
  [dateMs(2014, 1, 1), 10_000_000_000],
  [dateMs(2014, 4, 1), 6_000_000_000],
  [dateMs(2014, 7, 1), 8_000_000_000],
  [dateMs(2014, 10, 1), 5_500_000_000],
  [dateMs(2015, 1, 14), 2_500_000_000], // bear bottom ~$170
  [dateMs(2015, 4, 1), 3_500_000_000],
  [dateMs(2015, 7, 1), 4_000_000_000],
  [dateMs(2015, 10, 1), 3_500_000_000],
  [dateMs(2016, 1, 1), 6_500_000_000],
  [dateMs(2016, 4, 1), 6_800_000_000],
  [dateMs(2016, 7, 9), 10_000_000_000],  // second halving
  [dateMs(2016, 10, 1), 10_500_000_000],
  [dateMs(2017, 1, 1), 15_500_000_000],
  [dateMs(2017, 3, 1), 19_000_000_000],
  [dateMs(2017, 5, 1), 27_000_000_000],
  [dateMs(2017, 6, 12), 44_000_000_000],
  [dateMs(2017, 7, 17), 37_000_000_000],
  [dateMs(2017, 9, 1), 75_000_000_000],
  [dateMs(2017, 10, 1), 72_000_000_000],
  [dateMs(2017, 11, 1), 100_000_000_000],
  [dateMs(2017, 12, 17), 326_000_000_000], // $19,783 ATH
  [dateMs(2018, 1, 7), 280_000_000_000],
  [dateMs(2018, 2, 6), 120_000_000_000],
  [dateMs(2018, 4, 1), 118_000_000_000],
  [dateMs(2018, 5, 6), 165_000_000_000],
  [dateMs(2018, 7, 1), 110_000_000_000],
  [dateMs(2018, 9, 1), 120_000_000_000],
  [dateMs(2018, 11, 15), 65_000_000_000],
  [dateMs(2018, 12, 15), 55_000_000_000], // bear bottom ~$3,200
  [dateMs(2019, 2, 1), 60_000_000_000],
  [dateMs(2019, 4, 1), 85_000_000_000],
  [dateMs(2019, 6, 26), 230_000_000_000], // $13,800
  [dateMs(2019, 9, 1), 170_000_000_000],
  [dateMs(2019, 12, 1), 130_000_000_000],
  [dateMs(2020, 1, 1), 130_000_000_000],
  [dateMs(2020, 2, 14), 180_000_000_000],
  [dateMs(2020, 3, 13), 92_000_000_000],  // COVID crash
  [dateMs(2020, 4, 1), 120_000_000_000],
  [dateMs(2020, 5, 11), 160_000_000_000], // third halving
  [dateMs(2020, 7, 1), 170_000_000_000],
  [dateMs(2020, 10, 1), 195_000_000_000],
  [dateMs(2020, 11, 1), 250_000_000_000],
  [dateMs(2020, 12, 1), 360_000_000_000],
  [dateMs(2020, 12, 31), 540_000_000_000],
  [dateMs(2021, 1, 8), 760_000_000_000],  // $41k
  [dateMs(2021, 2, 8), 740_000_000_000],
  [dateMs(2021, 2, 21), 1_080_000_000_000],
  [dateMs(2021, 3, 13), 1_100_000_000_000], // $61k
  [dateMs(2021, 4, 14), 1_200_000_000_000], // $64,800
  [dateMs(2021, 5, 19), 680_000_000_000],   // crash
  [dateMs(2021, 6, 22), 540_000_000_000],
  [dateMs(2021, 7, 21), 570_000_000_000],
  [dateMs(2021, 8, 1), 720_000_000_000],
  [dateMs(2021, 9, 7), 960_000_000_000],
  [dateMs(2021, 10, 1), 900_000_000_000],
  [dateMs(2021, 10, 20), 1_220_000_000_000],
  [dateMs(2021, 11, 10), 1_280_000_000_000], // $69,000 ATH
  [dateMs(2021, 12, 4), 920_000_000_000],
  [dateMs(2021, 12, 31), 900_000_000_000],
  [dateMs(2022, 1, 24), 680_000_000_000],
  [dateMs(2022, 3, 28), 900_000_000_000],
  [dateMs(2022, 5, 1), 730_000_000_000],
  [dateMs(2022, 5, 12), 560_000_000_000],   // LUNA crash
  [dateMs(2022, 6, 18), 380_000_000_000],
  [dateMs(2022, 8, 15), 460_000_000_000],
  [dateMs(2022, 9, 1), 380_000_000_000],
  [dateMs(2022, 11, 9), 330_000_000_000],   // FTX collapse
  [dateMs(2022, 11, 21), 310_000_000_000],  // ~$15,500 bottom
  [dateMs(2022, 12, 31), 320_000_000_000],
  [dateMs(2023, 1, 14), 400_000_000_000],
  [dateMs(2023, 2, 16), 480_000_000_000],
  [dateMs(2023, 3, 14), 480_000_000_000],
  [dateMs(2023, 4, 14), 590_000_000_000],   // $30k
  [dateMs(2023, 6, 1), 530_000_000_000],
  [dateMs(2023, 7, 14), 590_000_000_000],
  [dateMs(2023, 9, 1), 510_000_000_000],
  [dateMs(2023, 10, 16), 530_000_000_000],
  [dateMs(2023, 10, 24), 670_000_000_000],  // ETF speculation
  [dateMs(2023, 12, 1), 740_000_000_000],
  [dateMs(2023, 12, 31), 830_000_000_000],
  [dateMs(2024, 1, 11), 900_000_000_000],   // ETF approved
  [dateMs(2024, 2, 14), 1_000_000_000_000],
  [dateMs(2024, 3, 14), 1_400_000_000_000], // new ATH $73,700
  [dateMs(2024, 4, 20), 1_250_000_000_000], // fourth halving
  [dateMs(2024, 5, 1), 1_220_000_000_000],
  [dateMs(2024, 6, 1), 1_340_000_000_000],
  [dateMs(2024, 7, 1), 1_230_000_000_000],
  [dateMs(2024, 8, 5), 1_050_000_000_000],  // yen carry trade unwind
  [dateMs(2024, 9, 1), 1_140_000_000_000],
  [dateMs(2024, 10, 1), 1_230_000_000_000],
  [dateMs(2024, 11, 5), 1_350_000_000_000],
  [dateMs(2024, 11, 22), 1_900_000_000_000],
  [dateMs(2024, 12, 5), 2_000_000_000_000],
  [dateMs(2024, 12, 17), 2_100_000_000_000], // $108k ATH
  [dateMs(2025, 1, 1), 1_860_000_000_000],
  [dateMs(2025, 1, 20), 2_060_000_000_000],
  [dateMs(2025, 2, 1), 1_950_000_000_000],
  [dateMs(2025, 2, 20), 1_900_000_000_000],
];

// Total Crypto Market Cap milestones
const TOTAL_HISTORY: Array<[number, number]> = [
  [dateMs(2013, 4, 28), 1_600_000_000],
  [dateMs(2013, 12, 4), 15_000_000_000],
  [dateMs(2014, 1, 1), 11_000_000_000],
  [dateMs(2014, 6, 1), 8_000_000_000],
  [dateMs(2015, 1, 14), 3_500_000_000],
  [dateMs(2015, 7, 1), 5_000_000_000],
  [dateMs(2016, 1, 1), 7_500_000_000],
  [dateMs(2016, 6, 1), 9_000_000_000],
  [dateMs(2017, 1, 1), 18_000_000_000],
  [dateMs(2017, 3, 1), 24_000_000_000],
  [dateMs(2017, 5, 22), 82_000_000_000],
  [dateMs(2017, 6, 12), 110_000_000_000],
  [dateMs(2017, 7, 17), 70_000_000_000],
  [dateMs(2017, 9, 1), 170_000_000_000],
  [dateMs(2017, 11, 1), 200_000_000_000],
  [dateMs(2017, 12, 7), 400_000_000_000],
  [dateMs(2018, 1, 7), 830_000_000_000],  // ATH
  [dateMs(2018, 2, 6), 300_000_000_000],
  [dateMs(2018, 5, 5), 440_000_000_000],
  [dateMs(2018, 8, 14), 200_000_000_000],
  [dateMs(2018, 11, 25), 120_000_000_000],
  [dateMs(2018, 12, 15), 100_000_000_000],
  [dateMs(2019, 1, 1), 130_000_000_000],
  [dateMs(2019, 4, 1), 145_000_000_000],
  [dateMs(2019, 6, 26), 370_000_000_000],
  [dateMs(2019, 12, 1), 200_000_000_000],
  [dateMs(2020, 2, 14), 305_000_000_000],
  [dateMs(2020, 3, 13), 130_000_000_000],
  [dateMs(2020, 5, 11), 240_000_000_000],
  [dateMs(2020, 8, 1), 340_000_000_000],
  [dateMs(2020, 11, 1), 400_000_000_000],
  [dateMs(2020, 12, 31), 770_000_000_000],
  [dateMs(2021, 1, 10), 1_050_000_000_000],
  [dateMs(2021, 2, 10), 1_400_000_000_000],
  [dateMs(2021, 4, 14), 2_300_000_000_000],
  [dateMs(2021, 5, 12), 2_500_000_000_000],
  [dateMs(2021, 5, 19), 1_500_000_000_000],
  [dateMs(2021, 6, 22), 1_250_000_000_000],
  [dateMs(2021, 8, 1), 1_600_000_000_000],
  [dateMs(2021, 9, 7), 2_300_000_000_000],
  [dateMs(2021, 11, 10), 3_000_000_000_000], // ATH
  [dateMs(2021, 12, 4), 2_200_000_000_000],
  [dateMs(2022, 1, 1), 2_200_000_000_000],
  [dateMs(2022, 3, 28), 2_100_000_000_000],
  [dateMs(2022, 5, 12), 1_200_000_000_000],
  [dateMs(2022, 6, 18), 850_000_000_000],
  [dateMs(2022, 8, 15), 1_100_000_000_000],
  [dateMs(2022, 11, 9), 900_000_000_000],
  [dateMs(2022, 12, 31), 800_000_000_000],
  [dateMs(2023, 2, 1), 1_050_000_000_000],
  [dateMs(2023, 4, 14), 1_300_000_000_000],
  [dateMs(2023, 6, 1), 1_150_000_000_000],
  [dateMs(2023, 10, 24), 1_300_000_000_000],
  [dateMs(2023, 12, 31), 1_700_000_000_000],
  [dateMs(2024, 3, 14), 2_700_000_000_000],
  [dateMs(2024, 4, 20), 2_400_000_000_000],
  [dateMs(2024, 8, 5), 1_900_000_000_000],
  [dateMs(2024, 11, 22), 3_400_000_000_000],
  [dateMs(2024, 12, 17), 3_700_000_000_000],
  [dateMs(2025, 1, 1), 3_300_000_000_000],
  [dateMs(2025, 2, 20), 3_200_000_000_000],
];

// ETH Market Cap milestones
const ETH_HISTORY: Array<[number, number]> = [
  [dateMs(2015, 8, 7), 75_000_000],
  [dateMs(2016, 1, 1), 70_000_000],
  [dateMs(2016, 3, 14), 900_000_000],
  [dateMs(2016, 6, 18), 1_500_000_000],  // DAO hack
  [dateMs(2016, 12, 1), 700_000_000],
  [dateMs(2017, 3, 1), 3_500_000_000],
  [dateMs(2017, 6, 12), 36_000_000_000],
  [dateMs(2017, 7, 17), 16_000_000_000],
  [dateMs(2017, 12, 1), 45_000_000_000],
  [dateMs(2018, 1, 13), 135_000_000_000], // $1,430 ATH
  [dateMs(2018, 4, 1), 40_000_000_000],
  [dateMs(2018, 9, 12), 20_000_000_000],
  [dateMs(2018, 12, 15), 10_000_000_000],
  [dateMs(2019, 6, 26), 33_000_000_000],
  [dateMs(2019, 12, 1), 16_000_000_000],
  [dateMs(2020, 3, 13), 13_000_000_000],
  [dateMs(2020, 8, 1), 43_000_000_000],
  [dateMs(2020, 12, 31), 85_000_000_000],
  [dateMs(2021, 2, 20), 220_000_000_000],
  [dateMs(2021, 5, 12), 500_000_000_000],
  [dateMs(2021, 6, 22), 220_000_000_000],
  [dateMs(2021, 11, 10), 560_000_000_000], // $4,867 ATH
  [dateMs(2021, 12, 31), 440_000_000_000],
  [dateMs(2022, 6, 18), 120_000_000_000],
  [dateMs(2022, 12, 31), 150_000_000_000],
  [dateMs(2023, 4, 14), 230_000_000_000],
  [dateMs(2023, 12, 31), 280_000_000_000],
  [dateMs(2024, 3, 14), 430_000_000_000],
  [dateMs(2024, 8, 5), 290_000_000_000],
  [dateMs(2024, 12, 17), 470_000_000_000],
  [dateMs(2025, 2, 20), 330_000_000_000],
];

// Interpolate between milestones to create daily data
function interpolateHistory(
  milestones: Array<[number, number]>,
): Array<[number, number]> {
  if (milestones.length < 2) return milestones;
  const DAY_MS = 86_400_000;
  const result: Array<[number, number]> = [];

  for (let i = 0; i < milestones.length - 1; i++) {
    const [t0, v0] = milestones[i];
    const [t1, v1] = milestones[i + 1];
    const days = Math.round((t1 - t0) / DAY_MS);

    // Use log-space interpolation for exponential growth
    const lnV0 = Math.log(Math.max(v0, 1));
    const lnV1 = Math.log(Math.max(v1, 1));

    for (let d = 0; d < days; d++) {
      const frac = d / days;
      const ts = t0 + d * DAY_MS;
      const lnVal = lnV0 + (lnV1 - lnV0) * frac;
      result.push([ts, Math.round(Math.exp(lnVal))]);
    }
  }
  // Add last point
  result.push(milestones[milestones.length - 1]);
  return result;
}

// Merge history + live data (prefer live data for overlapping dates)
function mergeHistoryAndLive(
  history: Array<[number, number]>,
  live: Array<[number, number]> | null,
): Array<[number, number]> {
  if (!live || live.length === 0) return history;

  const liveStart = live[0][0];
  // Keep history before live data starts, then append live
  const historicalPart = history.filter(([ts]) => ts < liveStart);
  return [...historicalPart, ...live];
}

const HISTORY_MAP: Record<string, Array<[number, number]>> = {
  btc: BTC_HISTORY,
  total: TOTAL_HISTORY,
  eth: ETH_HISTORY,
};

// ---------------------------------------------------------------------------
// Fetch market_caps from CoinGecko free API (365 day limit)
// ---------------------------------------------------------------------------
async function fetchMarketCaps(
  coinId: string,
): Promise<Array<[number, number]> | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=365&interval=daily`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = await res.json();
    return json.market_caps ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch current BTC dominance from /global
// ---------------------------------------------------------------------------
async function fetchBtcDominance(): Promise<number | null> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.market_cap_percentage?.btc ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trendline: simple linear regression
// ---------------------------------------------------------------------------
function computeTrendline(
  series: Array<[number, number]>,
): { slope: number; intercept: number; r2: number } {
  const n = series.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i][1];
    sumXY += i * series[i][1];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (series[i][1] - (slope * i + intercept)) ** 2;
    ssTot += (series[i][1] - yMean) ** 2;
  }
  return {
    slope: parseFloat(slope.toFixed(2)),
    intercept: parseFloat(intercept.toFixed(2)),
    r2: parseFloat((ssTot === 0 ? 0 : 1 - ssRes / ssTot).toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Logarithmic Regression Trendline (Into The Cryptoverse style)
// ln(price) = a * ln(days_since_genesis) + b
// Returns: fairValue, upperBand (+2σ), lowerBand (-2σ) as [ts, value][]
// ---------------------------------------------------------------------------
function computeLogRegression(
  series: Array<[number, number]>,
  extensionYears: number = 3,
): {
  fairValue: Array<[number, number]>;
  upperBand: Array<[number, number]>;
  lowerBand: Array<[number, number]>;
  r2: number;
} | null {
  if (series.length < 10) return null;

  const genesisTs = series[0][0];
  const DAY_MS = 86_400_000;

  // Build regression: ln(value) = a * ln(daysSinceGenesis) + b
  // Sample every 7th point to avoid over-weighting recent interpolated data
  const points: Array<{ lnX: number; lnY: number }> = [];
  for (let i = 0; i < series.length; i += 7) {
    const [ts, val] = series[i];
    const days = (ts - genesisTs) / DAY_MS + 1;
    if (val > 0 && days > 0) {
      points.push({ lnX: Math.log(days), lnY: Math.log(val) });
    }
  }

  const n = points.length;
  if (n < 10) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX += p.lnX;
    sumY += p.lnY;
    sumXY += p.lnX * p.lnY;
    sumX2 += p.lnX * p.lnX;
  }
  const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - a * sumX) / n;

  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const predicted = a * p.lnX + b;
    ssRes += (p.lnY - predicted) ** 2;
    ssTot += (p.lnY - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const sigma = Math.sqrt(ssRes / (n - 2));

  const lastTs = series[series.length - 1][0];
  const extensionEnd = lastTs + extensionYears * 365 * DAY_MS;
  const WEEK_MS = 7 * DAY_MS;
  const fairValue: Array<[number, number]> = [];
  const upperBand: Array<[number, number]> = [];
  const lowerBand: Array<[number, number]> = [];

  for (let ts = series[0][0]; ts <= extensionEnd; ts += WEEK_MS) {
    const days = (ts - genesisTs) / DAY_MS + 1;
    const lnX = Math.log(days);
    const lnFair = a * lnX + b;

    fairValue.push([ts, Math.round(Math.exp(lnFair))]);
    upperBand.push([ts, Math.round(Math.exp(lnFair + 2 * sigma))]);
    lowerBand.push([ts, Math.round(Math.exp(lnFair - 2 * sigma))]);
  }

  return { fairValue, upperBand, lowerBand, r2: parseFloat(r2.toFixed(4)) };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "total";

  if (!LABELS[type]) {
    return NextResponse.json(
      { error: `Invalid type "${type}". Valid: total, btc, eth, altcoin, stablecoin` },
      { status: 400 },
    );
  }

  const label = LABELS[type];
  let liveData: Array<[number, number]> | null = null;

  // ── BTC / ETH: direct market_caps from CoinGecko ──
  if (type === "btc") {
    liveData = await fetchMarketCaps("bitcoin");
  } else if (type === "eth") {
    liveData = await fetchMarketCaps("ethereum");
  }
  // ── Total: BTC market cap / BTC dominance ──
  else if (type === "total") {
    const [btcCaps, dominance] = await Promise.all([
      fetchMarketCaps("bitcoin"),
      fetchBtcDominance(),
    ]);
    if (btcCaps && dominance && dominance > 0) {
      const ratio = dominance / 100;
      liveData = btcCaps.map(([ts, val]) => [ts, Math.round(val / ratio)] as [number, number]);
    }
  }
  // ── Altcoin: Total - BTC ──
  else if (type === "altcoin") {
    const [btcCaps, dominance] = await Promise.all([
      fetchMarketCaps("bitcoin"),
      fetchBtcDominance(),
    ]);
    if (btcCaps && dominance && dominance > 0) {
      const ratio = dominance / 100;
      liveData = btcCaps.map(([ts, val]) => {
        const total = val / ratio;
        return [ts, Math.round(total - val)] as [number, number];
      });
    }
  }
  // ── Stablecoin: USDT + USDC ──
  else if (type === "stablecoin") {
    const [usdtCaps, usdcCaps] = await Promise.all([
      fetchMarketCaps("tether"),
      fetchMarketCaps("usd-coin"),
    ]);
    if (usdtCaps && usdcCaps) {
      const usdcMap = new Map(usdcCaps.map(([ts, v]) => [ts, v]));
      liveData = usdtCaps.map(([ts, usdtVal]) => {
        const usdcVal = usdcMap.get(ts) ?? 0;
        return [ts, Math.round(usdtVal + usdcVal)] as [number, number];
      });
    } else if (usdtCaps) {
      liveData = usdtCaps;
    }
  }

  // Filter out zero/null entries
  if (liveData) {
    liveData = liveData.filter(([, val]) => val > 0);
  }

  // Merge historical milestones with live data for long-term view
  const historyMilestones = HISTORY_MAP[type];
  let fullData: Array<[number, number]>;

  if (historyMilestones) {
    const interpolated = interpolateHistory(historyMilestones);
    fullData = mergeHistoryAndLive(interpolated, liveData);
  } else if (liveData && liveData.length > 0) {
    fullData = liveData;
  } else {
    // No history for this type (altcoin, stablecoin), use live only or empty
    fullData = liveData || [];
  }

  if (fullData.length > 0) {
    const logReg = computeLogRegression(fullData);
    return NextResponse.json(
      {
        source: historyMilestones ? "history+coingecko" : "coingecko",
        type,
        label,
        data: fullData,
        trendline: computeTrendline(fullData),
        ...(logReg && {
          regressionMiddle: logReg.fairValue,
          regressionUpper: logReg.upperBand,
          regressionLower: logReg.lowerBand,
          regressionR2: logReg.r2,
        }),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  // Fallback: empty
  return NextResponse.json(
    { source: "empty", type, label, data: [], trendline: { slope: 0, intercept: 0, r2: 0 } },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
