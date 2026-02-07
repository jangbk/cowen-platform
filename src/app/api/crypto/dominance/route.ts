import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/dominance?type=btc|eth
// Returns daily dominance % over 365 days as [timestamp, value] pairs.
// Provides both "withStables" and "withoutStables" variants.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Generate a dominance series oscillating within [low, high] range.
// Uses layered sine waves for a realistic, non-random pattern.
// ---------------------------------------------------------------------------
function generateDominanceSeries(
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

    // Slow macro trend (~180 days)
    const macro = Math.sin(2 * Math.PI * t * 2 + seed) * halfRange * 0.55;
    // Medium cycle (~60 days)
    const medium =
      Math.sin(2 * Math.PI * t * 6 + seed * 2.1) * halfRange * 0.25;
    // Fast ripple (~14 days)
    const ripple =
      Math.sin(2 * Math.PI * t * 26 + seed * 3.7) * halfRange * 0.12;
    // Micro noise (~3 days)
    const noise =
      Math.sin(2 * Math.PI * t * 120 + seed * 5.3) * halfRange * 0.05;

    let value = mid + macro + medium + ripple + noise;
    // Clamp within bounds
    value = Math.max(low, Math.min(high, value));

    series.push([start + d * DAY_MS, parseFloat(value.toFixed(2))]);
  }

  return series;
}

// ---------------------------------------------------------------------------
// Config per type
// ---------------------------------------------------------------------------
interface DominanceConfig {
  withStables: { low: number; high: number; seed: number };
  withoutStables: { low: number; high: number; seed: number };
  label: string;
}

const TYPE_CONFIG: Record<string, DominanceConfig> = {
  btc: {
    withStables: { low: 55, high: 65, seed: 1.5 },
    withoutStables: { low: 60, high: 72, seed: 1.8 },
    label: "Bitcoin Dominance",
  },
  eth: {
    withStables: { low: 12, high: 18, seed: 3.2 },
    withoutStables: { low: 14, high: 21, seed: 3.6 },
    label: "Ethereum Dominance",
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "btc";

  if (!TYPE_CONFIG[type]) {
    return NextResponse.json(
      { error: `Invalid type "${type}". Valid: btc, eth` },
      { status: 400 },
    );
  }

  const config = TYPE_CONFIG[type];
  const days = 365;

  const withStables = generateDominanceSeries(
    config.withStables.low,
    config.withStables.high,
    days,
    config.withStables.seed,
  );

  const withoutStables = generateDominanceSeries(
    config.withoutStables.low,
    config.withoutStables.high,
    days,
    config.withoutStables.seed,
  );

  // Current values (last point)
  const currentWithStables = withStables[withStables.length - 1][1];
  const currentWithoutStables = withoutStables[withoutStables.length - 1][1];

  // 30-day change
  const idx30 = Math.max(0, withStables.length - 31);
  const change30dWithStables = parseFloat(
    (currentWithStables - withStables[idx30][1]).toFixed(2),
  );
  const change30dWithoutStables = parseFloat(
    (currentWithoutStables - withoutStables[idx30][1]).toFixed(2),
  );

  return NextResponse.json(
    {
      source: "sample",
      type,
      label: config.label,
      withStables: {
        data: withStables,
        current: currentWithStables,
        change30d: change30dWithStables,
      },
      withoutStables: {
        data: withoutStables,
        current: currentWithoutStables,
        change30d: change30dWithoutStables,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
