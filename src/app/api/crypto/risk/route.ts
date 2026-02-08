import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/risk?asset=bitcoin
// Calculates a composite Fiat Risk score (0-1) for any CoinGecko asset.
// Uses 365-day historical prices to compute:
//   1. Position in yearly range (min-max normalization)
//   2. Distance from 200-day SMA (relative)
//   3. Short-term momentum (30d vs 90d SMA)
// Falls back to sample data when CoinGecko fails.
// ---------------------------------------------------------------------------

const ASSETS = [
  "bitcoin", "ethereum", "binancecoin", "solana", "ripple",
  "cardano", "dogecoin", "chainlink",
];

const ASSET_LABELS: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", binancecoin: "BNB", solana: "SOL",
  ripple: "XRP", cardano: "ADA", dogecoin: "DOGE", chainlink: "LINK",
};

function calculateRisk(prices: number[]): {
  risk: number;
  priceRisk: number;
  momentumRisk: number;
  volatilityRisk: number;
} {
  if (prices.length < 30) {
    return { risk: 0.5, priceRisk: 0.5, momentumRisk: 0.5, volatilityRisk: 0.5 };
  }

  // 1. Position in yearly range (0 = bottom, 1 = top)
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const current = prices[prices.length - 1];
  const priceRisk = max === min ? 0.5 : (current - min) / (max - min);

  // 2. Distance from 200-day SMA
  const sma200 =
    prices.length >= 200
      ? prices.slice(-200).reduce((a, b) => a + b, 0) / 200
      : prices.reduce((a, b) => a + b, 0) / prices.length;
  const smaRatio = current / sma200;
  // Normalize: ratio 0.5 → risk 0, ratio 1.0 → risk 0.5, ratio 2.0 → risk 1.0
  const momentumRisk = Math.max(0, Math.min(1, (smaRatio - 0.5) / 1.5));

  // 3. Volatility (30-day annualized)
  const recent30 = prices.slice(-30);
  const returns = recent30.slice(1).map((p, i) => Math.log(p / recent30[i]));
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + r * r, 0) / returns.length -
      (returns.reduce((sum, r) => sum + r, 0) / returns.length) ** 2,
  );
  const annualizedVol = stdDev * Math.sqrt(365);
  // Normalize: 0% vol → 0, 100% vol → 0.5, 200%+ → 1.0
  const volatilityRisk = Math.max(0, Math.min(1, annualizedVol / 2));

  // Composite: weighted average
  const risk = priceRisk * 0.45 + momentumRisk * 0.35 + volatilityRisk * 0.2;

  return {
    risk: parseFloat(risk.toFixed(3)),
    priceRisk: parseFloat(priceRisk.toFixed(3)),
    momentumRisk: parseFloat(momentumRisk.toFixed(3)),
    volatilityRisk: parseFloat(volatilityRisk.toFixed(3)),
  };
}

async function fetchHistoricalPrices(
  asset: string,
): Promise<number[] | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${asset}/market_chart?vs_currency=usd&days=365&interval=daily`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    } as RequestInit);

    if (!res.ok) return null;

    const json = await res.json();
    return (json.prices ?? []).map((p: [number, number]) => p[1]);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const assetParam = searchParams.get("asset");

  // If no asset specified, return risk for all major assets
  if (!assetParam || assetParam === "all") {
    const results: Record<string, { risk: number; label: string }> = {};

    // Fetch all in parallel
    const promises = ASSETS.map(async (asset) => {
      const prices = await fetchHistoricalPrices(asset);
      if (prices) {
        const { risk } = calculateRisk(prices);
        results[ASSET_LABELS[asset] || asset.toUpperCase()] = {
          risk,
          label: ASSET_LABELS[asset] || asset.toUpperCase(),
        };
      }
    });

    await Promise.allSettled(promises);

    // If we got at least some data
    if (Object.keys(results).length > 0) {
      // Calculate TOTAL as average of all
      const allRisks = Object.values(results).map((r) => r.risk);
      const totalRisk = allRisks.reduce((a, b) => a + b, 0) / allRisks.length;
      results["TOTAL"] = { risk: parseFloat(totalRisk.toFixed(3)), label: "TOTAL" };

      return NextResponse.json(
        { source: "coingecko", risks: results },
        {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
          },
        },
      );
    }

    // Fallback sample
    return NextResponse.json(
      {
        source: "sample",
        risks: {
          TOTAL: { risk: 0.306, label: "TOTAL" },
          BTC: { risk: 0.386, label: "BTC" },
          ETH: { risk: 0.424, label: "ETH" },
          BNB: { risk: 0.295, label: "BNB" },
          SOL: { risk: 0.326, label: "SOL" },
          XRP: { risk: 0.428, label: "XRP" },
          ADA: { risk: 0.312, label: "ADA" },
          DOGE: { risk: 0.358, label: "DOGE" },
          LINK: { risk: 0.345, label: "LINK" },
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  // Single asset
  const prices = await fetchHistoricalPrices(assetParam);
  if (prices) {
    const result = calculateRisk(prices);
    return NextResponse.json(
      { source: "coingecko", asset: assetParam, ...result },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  return NextResponse.json(
    {
      source: "sample",
      asset: assetParam,
      risk: 0.35,
      priceRisk: 0.4,
      momentumRisk: 0.3,
      volatilityRisk: 0.25,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    },
  );
}
