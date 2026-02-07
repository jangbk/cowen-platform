import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/market-cap?type=total|btc|eth
// Returns historical market-cap data as [timestamp, value] pairs (365 days).
// Uses CoinGecko Pro API if COINGECKO_PRO_KEY is set, otherwise sample data.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Helper: simple seeded-ish deterministic-looking series generator.
// We use sin-based oscillation layered with smaller harmonics to produce
// realistic-looking market-cap curves that are reproducible per type.
// ---------------------------------------------------------------------------
function generateMarketCapSeries(
  baseValue: number,
  amplitude: number,
  days: number,
  seed: number,
): Array<[number, number]> {
  const now = Date.now();
  const start = now - days * DAY_MS;
  const series: Array<[number, number]> = [];

  for (let d = 0; d <= days; d++) {
    const t = d / days; // 0..1
    // Primary cycle (~120 days)
    const primary = Math.sin(2 * Math.PI * t * 3 + seed) * amplitude * 0.5;
    // Secondary cycle (~45 days)
    const secondary =
      Math.sin(2 * Math.PI * t * 8 + seed * 1.7) * amplitude * 0.25;
    // Tertiary micro-noise (~7 days)
    const tertiary =
      Math.sin(2 * Math.PI * t * 52 + seed * 3.1) * amplitude * 0.1;
    // Slight upward drift over the year
    const drift = amplitude * 0.15 * t;

    const value = baseValue + primary + secondary + tertiary + drift;
    const timestamp = start + d * DAY_MS;
    series.push([timestamp, parseFloat(value.toFixed(0))]);
  }

  return series;
}

// ---------------------------------------------------------------------------
// Trendline: simple linear regression on the series
// ---------------------------------------------------------------------------
function computeTrendline(
  series: Array<[number, number]>,
): { slope: number; intercept: number; r2: number } {
  const n = series.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = series[i][1];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (series[i][1] - predicted) ** 2;
    ssTot += (series[i][1] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return {
    slope: parseFloat(slope.toFixed(2)),
    intercept: parseFloat(intercept.toFixed(2)),
    r2: parseFloat(r2.toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Config per type
// ---------------------------------------------------------------------------
const TYPE_CONFIG: Record<
  string,
  { base: number; amplitude: number; seed: number; label: string }
> = {
  total: {
    base: 2_500_000_000_000,
    amplitude: 500_000_000_000,
    seed: 1.0,
    label: "Total Crypto Market Cap",
  },
  btc: {
    base: 1_400_000_000_000,
    amplitude: 400_000_000_000,
    seed: 2.3,
    label: "Bitcoin Market Cap",
  },
  eth: {
    base: 300_000_000_000,
    amplitude: 100_000_000_000,
    seed: 4.7,
    label: "Ethereum Market Cap",
  },
};

// ---------------------------------------------------------------------------
// Try CoinGecko Pro API (requires paid key)
// ---------------------------------------------------------------------------
async function fetchFromCoinGeckoPro(
  apiKey: string,
  type: string,
): Promise<Array<[number, number]> | null> {
  try {
    // The /global/market-cap-chart endpoint is Pro-only
    const url = `https://pro-api.coingecko.com/api/v3/global/market_cap_chart?days=365&vs_currency=usd`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-cg-pro-api-key": apiKey,
      },
      next: { revalidate: 300 },
    } as RequestInit);

    if (!res.ok) return null;

    const json = await res.json();

    if (type === "total") {
      return json.market_cap_chart?.market_cap ?? null;
    }
    // Pro endpoint may not split by coin; fall back for btc/eth
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "total";

  if (!TYPE_CONFIG[type]) {
    return NextResponse.json(
      { error: `Invalid type "${type}". Valid: total, btc, eth` },
      { status: 400 },
    );
  }

  // Attempt live data from CoinGecko Pro
  const proKey = process.env.COINGECKO_PRO_KEY;
  if (proKey) {
    const liveData = await fetchFromCoinGeckoPro(proKey, type);
    if (liveData && liveData.length > 0) {
      return NextResponse.json(
        {
          source: "coingecko_pro",
          type,
          label: TYPE_CONFIG[type].label,
          data: liveData,
          trendline: computeTrendline(liveData),
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=300, stale-while-revalidate=600",
          },
        },
      );
    }
  }

  // Fallback: sample data
  const { base, amplitude, seed, label } = TYPE_CONFIG[type];
  const series = generateMarketCapSeries(base, amplitude, 365, seed);
  const trendline = computeTrendline(series);

  return NextResponse.json(
    {
      source: "sample",
      type,
      label,
      data: series,
      trendline,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
