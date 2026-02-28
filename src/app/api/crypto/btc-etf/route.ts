import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/btc-etf
// Fetches latest BTC ETF holdings from CoinGlass public data.
// Falls back to curated default data when the external API is unavailable.
// ---------------------------------------------------------------------------

interface ETFHolding {
  name: string;
  ticker: string;
  held: number;
  aum: number;
  flows30d: number;
}

// Curated fallback data (updated periodically)
const FALLBACK_ETFS: ETFHolding[] = [
  { name: "iShares Bitcoin Trust", ticker: "IBIT", held: 575_000, aum: 56.6e9, flows30d: 2.4e9 },
  { name: "Grayscale Bitcoin Trust", ticker: "GBTC", held: 204_000, aum: 20.1e9, flows30d: -320e6 },
  { name: "Fidelity Wise Origin", ticker: "FBTC", held: 200_000, aum: 19.7e9, flows30d: 840e6 },
  { name: "ARK 21Shares", ticker: "ARKB", held: 48_000, aum: 4.73e9, flows30d: 210e6 },
  { name: "Bitwise Bitcoin ETF", ticker: "BITB", held: 42_000, aum: 4.14e9, flows30d: 180e6 },
  { name: "Grayscale BTC Mini", ticker: "BTC", held: 30_000, aum: 2.95e9, flows30d: 95e6 },
  { name: "VanEck Bitcoin ETF", ticker: "HODL", held: 14_000, aum: 1.38e9, flows30d: 45e6 },
];

let cache: { data: ETFHolding[]; source: string; ts: number } | null = null;
const CACHE_TTL = 3600_000; // 1 hour

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(
      { etfs: cache.data, source: cache.source, cached: true },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
    );
  }

  try {
    // Try CoinGlass BTC ETF endpoint (public, no key needed for basic data)
    const res = await fetch("https://open-api.coinglass.com/public/v2/indicator/etf/bitcoin_balance_list", {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const mapped: ETFHolding[] = json.data
          .filter((item: Record<string, unknown>) => item.symbol && item.totalBalance)
          .slice(0, 10)
          .map((item: Record<string, unknown>, i: number) => ({
            name: (item.name as string) || (item.symbol as string) || `ETF ${i + 1}`,
            ticker: (item.symbol as string) || "",
            held: Math.round(Number(item.totalBalance) || 0),
            aum: Number(item.totalValue) || 0,
            flows30d: Number(item.changeBalance30d) || 0,
          }))
          .sort((a: ETFHolding, b: ETFHolding) => b.held - a.held);

        if (mapped.length > 0) {
          cache = { data: mapped, source: "CoinGlass (실시간)", ts: Date.now() };
          return NextResponse.json(
            { etfs: mapped, source: "CoinGlass (실시간)" },
            { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
          );
        }
      }
    }
  } catch {
    // External API failed, fall through to fallback
  }

  // Fallback
  cache = { data: FALLBACK_ETFS, source: "기본값 (2025 Q4)", ts: Date.now() };
  return NextResponse.json(
    { etfs: FALLBACK_ETFS, source: "기본값 (2025 Q4)" },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
