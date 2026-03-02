import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/dominance?type=btc|eth
// Returns daily dominance % over 365 days as [timestamp, value] pairs.
// Uses CoinGecko free API to compute dominance from market cap histories.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

const LABELS: Record<string, string> = {
  btc: "Bitcoin Dominance",
  eth: "Ethereum Dominance",
};

// ---------------------------------------------------------------------------
// CoinGecko API helpers
// ---------------------------------------------------------------------------

interface GlobalSnapshot {
  btcPct: number;
  ethPct: number;
  usdtPct: number;
  stablePct: number; // usdt + usdc + dai + ...
}

async function fetchGlobalData(): Promise<GlobalSnapshot | null> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = await res.json();
    const pct = json.data?.market_cap_percentage;
    if (!pct) return null;

    return {
      btcPct: pct.btc ?? 0,
      ethPct: pct.eth ?? 0,
      usdtPct: pct.usdt ?? 0,
      stablePct: (pct.usdt ?? 0) + (pct.usdc ?? 0) + (pct.dai ?? 0),
    };
  } catch {
    return null;
  }
}

async function fetchMarketCaps(
  coinId: string,
  days = 365,
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
// Compute dominance series from market cap histories
// ---------------------------------------------------------------------------
function computeDominanceSeries(
  coinCaps: Array<[number, number]>,
  btcCaps: Array<[number, number]>,
  ethCaps: Array<[number, number]>,
  usdtCaps: Array<[number, number]>,
  global: GlobalSnapshot,
): {
  withStables: Array<[number, number]>;
  withoutStables: Array<[number, number]>;
} {
  const combinedPct = global.btcPct + global.ethPct + global.usdtPct;
  if (combinedPct <= 0) return { withStables: [], withoutStables: [] };

  const toDay = (ts: number) => Math.round(ts / DAY_MS);

  // Build all lookup maps keyed by day-index
  const btcMap = new Map(btcCaps.map(([ts, v]) => [toDay(ts), v]));
  const ethMap = new Map(ethCaps.map(([ts, v]) => [toDay(ts), v]));
  const usdtMap = new Map(usdtCaps.map(([ts, v]) => [toDay(ts), v]));

  // Stablecoin expansion: total_stables / usdt
  const stableExpand = global.usdtPct > 0 ? global.stablePct / global.usdtPct : 1;

  const withStables: Array<[number, number]> = [];
  const withoutStables: Array<[number, number]> = [];

  // Iterate over coinCaps (the coin we're computing dominance for)
  for (const [ts, coinVal] of coinCaps) {
    const dk = toDay(ts);
    const btcVal = btcMap.get(dk) ?? 0;
    const ethVal = ethMap.get(dk) ?? 0;
    const usdtVal = usdtMap.get(dk) ?? 0;

    if (btcVal === 0 || coinVal === 0) continue;

    // Estimate total: (BTC + ETH + USDT) / their combined %
    const totalEstimate = (btcVal + ethVal + usdtVal) / (combinedPct / 100);

    // withStables dominance
    const domWith = (coinVal / totalEstimate) * 100;
    withStables.push([ts, parseFloat(domWith.toFixed(2))]);

    // withoutStables: subtract estimated stablecoin cap from total
    const stableCapEstimate = usdtVal * stableExpand;
    const totalNoStables = totalEstimate - stableCapEstimate;
    const domWithout = totalNoStables > 0 ? (coinVal / totalNoStables) * 100 : 0;
    withoutStables.push([ts, parseFloat(domWithout.toFixed(2))]);
  }

  return { withStables, withoutStables };
}

// ---------------------------------------------------------------------------
// Fallback: sample data (sine-wave simulation)
// ---------------------------------------------------------------------------
interface FallbackConfig {
  withStables: { low: number; high: number; seed: number };
  withoutStables: { low: number; high: number; seed: number };
}

const FALLBACK_CONFIG: Record<string, FallbackConfig> = {
  btc: {
    withStables: { low: 55, high: 65, seed: 1.5 },
    withoutStables: { low: 60, high: 72, seed: 1.8 },
  },
  eth: {
    withStables: { low: 12, high: 18, seed: 3.2 },
    withoutStables: { low: 14, high: 21, seed: 3.6 },
  },
};

function generateFallbackSeries(
  low: number,
  high: number,
  days: number,
  seed: number,
): Array<[number, number]> {
  const now = Date.now();
  const start = now - days * DAY_MS;
  const mid = (low + high) / 2;
  const halfRange = (high - low) / 2;
  const series: Array<[number, number]> = [];

  for (let d = 0; d <= days; d++) {
    const t = d / days;
    const macro = Math.sin(2 * Math.PI * t * 2 + seed) * halfRange * 0.55;
    const medium = Math.sin(2 * Math.PI * t * 6 + seed * 2.1) * halfRange * 0.25;
    const ripple = Math.sin(2 * Math.PI * t * 26 + seed * 3.7) * halfRange * 0.12;
    const noise = Math.sin(2 * Math.PI * t * 120 + seed * 5.3) * halfRange * 0.05;
    let value = mid + macro + medium + ripple + noise;
    value = Math.max(low, Math.min(high, value));
    series.push([start + d * DAY_MS, parseFloat(value.toFixed(2))]);
  }
  return series;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "btc";

  if (!LABELS[type]) {
    return NextResponse.json(
      { error: `Invalid type "${type}". Valid: btc, eth` },
      { status: 400 },
    );
  }

  // Fetch all data in parallel
  const [global, btcCaps, ethCaps, usdtCaps] = await Promise.all([
    fetchGlobalData(),
    fetchMarketCaps("bitcoin"),
    fetchMarketCaps("ethereum"),
    fetchMarketCaps("tether"),
  ]);

  const coinCaps = type === "btc" ? btcCaps : ethCaps;

  if (global && btcCaps && ethCaps && usdtCaps && coinCaps && coinCaps.length > 0) {
    const { withStables, withoutStables } = computeDominanceSeries(
      coinCaps,
      btcCaps,
      ethCaps,
      usdtCaps,
      global,
    );

    if (withStables.length > 0) {
      const currentWith = withStables[withStables.length - 1][1];
      const currentWithout = withoutStables[withoutStables.length - 1][1];
      const idx30 = Math.max(0, withStables.length - 31);

      return NextResponse.json(
        {
          source: "coingecko",
          type,
          label: LABELS[type],
          withStables: {
            data: withStables,
            current: currentWith,
            change30d: parseFloat((currentWith - withStables[idx30][1]).toFixed(2)),
          },
          withoutStables: {
            data: withoutStables,
            current: currentWithout,
            change30d: parseFloat((currentWithout - withoutStables[idx30][1]).toFixed(2)),
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        },
      );
    }
  }

  // Fallback: sample data
  const config = FALLBACK_CONFIG[type];
  const days = 365;
  const withStables = generateFallbackSeries(config.withStables.low, config.withStables.high, days, config.withStables.seed);
  const withoutStables = generateFallbackSeries(config.withoutStables.low, config.withoutStables.high, days, config.withoutStables.seed);
  const currentWith = withStables[withStables.length - 1][1];
  const currentWithout = withoutStables[withoutStables.length - 1][1];
  const idx30 = Math.max(0, withStables.length - 31);

  return NextResponse.json(
    {
      source: "sample",
      type,
      label: LABELS[type],
      withStables: {
        data: withStables,
        current: currentWith,
        change30d: parseFloat((currentWith - withStables[idx30][1]).toFixed(2)),
      },
      withoutStables: {
        data: withoutStables,
        current: currentWithout,
        change30d: parseFloat((currentWithout - withoutStables[idx30][1]).toFixed(2)),
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
