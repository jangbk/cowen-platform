import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/market-cap?type=total|btc|eth|altcoin|stablecoin
// Returns historical market-cap data as [timestamp, value] pairs (365 days).
// Uses CoinGecko FREE API for all types.
// ---------------------------------------------------------------------------

const LABELS: Record<string, string> = {
  total: "Total Crypto Market Cap",
  btc: "Bitcoin Market Cap",
  eth: "Ethereum Market Cap",
  altcoin: "Altcoin Market Cap (excl. BTC)",
  stablecoin: "Stablecoin Market Cap",
};

// ---------------------------------------------------------------------------
// Fetch market_caps from CoinGecko free API for a single coin
// ---------------------------------------------------------------------------
async function fetchMarketCaps(
  coinId: string,
  days: number = 365,
): Promise<Array<[number, number]> | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
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
// Sample data fallback
// ---------------------------------------------------------------------------
function generateSample(
  baseValue: number,
  amplitude: number,
  seed: number,
): Array<[number, number]> {
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const days = 365;
  const series: Array<[number, number]> = [];
  for (let d = 0; d <= days; d++) {
    const t = d / days;
    const value =
      baseValue +
      Math.sin(2 * Math.PI * t * 3 + seed) * amplitude * 0.5 +
      Math.sin(2 * Math.PI * t * 8 + seed * 1.7) * amplitude * 0.25 +
      Math.sin(2 * Math.PI * t * 52 + seed * 3.1) * amplitude * 0.1 +
      amplitude * 0.15 * t;
    series.push([now - (days - d) * DAY_MS, parseFloat(value.toFixed(0))]);
  }
  return series;
}

const SAMPLE_CONFIG: Record<string, { base: number; amp: number; seed: number }> = {
  total: { base: 2_500_000_000_000, amp: 500_000_000_000, seed: 1.0 },
  btc: { base: 1_400_000_000_000, amp: 400_000_000_000, seed: 2.3 },
  eth: { base: 300_000_000_000, amp: 100_000_000_000, seed: 4.7 },
  altcoin: { base: 1_100_000_000_000, amp: 300_000_000_000, seed: 3.5 },
  stablecoin: { base: 160_000_000_000, amp: 15_000_000_000, seed: 6.1 },
};

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
      const ratio = dominance / 100; // e.g. 0.57
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
      // Align by timestamp (both should be daily)
      const usdcMap = new Map(usdcCaps.map(([ts, v]) => [ts, v]));
      liveData = usdtCaps.map(([ts, usdtVal]) => {
        const usdcVal = usdcMap.get(ts) ?? 0;
        return [ts, Math.round(usdtVal + usdcVal)] as [number, number];
      });
    } else if (usdtCaps) {
      liveData = usdtCaps;
    }
  }

  if (liveData && liveData.length > 0) {
    return NextResponse.json(
      {
        source: "coingecko",
        type,
        label,
        data: liveData,
        trendline: computeTrendline(liveData),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  // Fallback: sample data
  const cfg = SAMPLE_CONFIG[type] || SAMPLE_CONFIG.total;
  const series = generateSample(cfg.base, cfg.amp, cfg.seed);
  return NextResponse.json(
    { source: "sample", type, label, data: series, trendline: computeTrendline(series) },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
