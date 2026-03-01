import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// CoinGecko ID mapping (for ≤365 days)
// ---------------------------------------------------------------------------
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  ATOM: "cosmos",
  UNI: "uniswap",
  NEAR: "near",
  TRX: "tron",
  MATIC: "matic-network",
  AAVE: "aave",
  LTC: "litecoin",
  SUI: "sui",
};

// CryptoCompare uses standard ticker symbols – no mapping needed

// ---------------------------------------------------------------------------
// File-based cache (.data/dca-cache/)
// ---------------------------------------------------------------------------
const CACHE_DIR = join("/tmp", "dca-cache");
const CACHE_MS = 24 * 60 * 60 * 1000; // 24h

function cp(asset: string, from: string, to: string) {
  return join(CACHE_DIR, `${asset}_${from}_${to}.json`);
}

function readCache(p: string): { date: string; price: number }[] | null {
  try {
    if (!existsSync(p)) return null;
    const d = JSON.parse(readFileSync(p, "utf-8"));
    if (Date.now() - d.ts > CACHE_MS) return null;
    return d.data;
  } catch {
    return null;
  }
}

function readStaleCache(p: string): { date: string; price: number }[] | null {
  try {
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")).data;
  } catch {
    return null;
  }
}

function writeCache(p: string, data: { date: string; price: number }[]) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(p, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
type PriceRow = { date: string; price: number };

/**
 * CoinGecko free API – max 365 days, no key required
 */
async function fetchCoinGecko(coinId: string, days: number): Promise<PriceRow[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = await res.json();
  if (!json.prices || json.prices.length === 0) return [];

  return json.prices.map(([ts, price]: [number, number]) => ({
    date: new Date(ts).toISOString().split("T")[0],
    price: Math.round(price * 1e6) / 1e6,
  }));
}

/**
 * CryptoCompare histoday – unlimited range, no key required
 * Paginates backwards with toTs; max 2000 per request
 */
async function fetchCryptoCompare(
  symbol: string,
  fromSec: number,
  toSec: number
): Promise<PriceRow[]> {
  const all: PriceRow[] = [];
  let cursor = toSec;
  const maxIterations = 10; // safety: max ~20,000 days ≈ 55 years

  for (let i = 0; i < maxIterations; i++) {
    const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=2000&toTs=${cursor}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
    const json = await res.json();

    if (json.Response !== "Success" || !json.Data?.Data?.length) {
      console.log(`[dca] CryptoCompare page ${i} for ${symbol}: Response=${json.Response}, hasData=${!!json.Data?.Data?.length}`);
      break;
    }

    const rows: PriceRow[] = json.Data.Data
      .filter((d: { time: number; close: number }) => d.close > 0)
      .map((d: { time: number; close: number }) => ({
        date: new Date(d.time * 1000).toISOString().split("T")[0],
        price: Math.round(d.close * 1e6) / 1e6,
      }));

    all.push(...rows);
    console.log(`[dca] CryptoCompare page ${i} for ${symbol}: ${rows.length} valid rows, total=${all.length}`);

    // Earliest timestamp in this batch
    const earliest = json.Data.Data[0].time;
    if (earliest <= fromSec) break; // reached start
    cursor = earliest - 1; // next page ends before this batch

    // Delay between pagination requests to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

/** CoinGecko with demo API key: range endpoint */
async function fetchWithKey(
  coinId: string,
  fromSec: number,
  toSec: number
): Promise<PriceRow[]> {
  const apiKey = process.env.COINGECKO_API_KEY!;
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromSec}&to=${toSec}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "x-cg-demo-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`CoinGecko key API ${res.status}`);
  const json = await res.json();
  if (!json.prices || json.prices.length === 0) return [];

  return json.prices.map(([ts, price]: [number, number]) => ({
    date: new Date(ts).toISOString().split("T")[0],
    price: Math.round(price * 1e6) / 1e6,
  }));
}

function dedup(rows: PriceRow[]): PriceRow[] {
  const byDate: Record<string, number> = {};
  for (const r of rows) byDate[r.date] = r.price;
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const asset = (sp.get("asset") || "BTC").toUpperCase();
  const from = sp.get("from") || "2024-01-01";
  const to = sp.get("to") || new Date().toISOString().split("T")[0];

  const coinId = COINGECKO_IDS[asset];
  if (!coinId) {
    return NextResponse.json(
      { error: `지원하지 않는 자산: ${asset}` },
      { status: 400 }
    );
  }

  // 1. Cache
  const path = cp(asset, from, to);
  const cached = readCache(path);
  if (cached) {
    return NextResponse.json({ prices: cached, cached: true });
  }

  // 2. Calculate range
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const days = Math.ceil((toMs - fromMs) / 86400000);

  if (days <= 0) {
    return NextResponse.json(
      { error: "종료일이 시작일보다 이후여야 합니다." },
      { status: 400 }
    );
  }

  let prices: PriceRow[] = [];
  const hasKey = !!process.env.COINGECKO_API_KEY;
  let source = "";

  try {
    if (days <= 365) {
      source = "coingecko";
      prices = dedup(await fetchCoinGecko(coinId, days));
    } else if (hasKey) {
      source = "coingecko-key";
      const fromSec = Math.floor(fromMs / 1000);
      const toSec = Math.floor(toMs / 1000);
      prices = dedup(await fetchWithKey(coinId, fromSec, toSec));
    } else {
      source = "cryptocompare";
      const fromSec = Math.floor(fromMs / 1000);
      const toSec = Math.floor(toMs / 1000);
      prices = dedup(await fetchCryptoCompare(asset, fromSec, toSec));
    }
  } catch (err) {
    // Fallback: try stale cache
    const stale = readStaleCache(path);
    if (stale) {
      return NextResponse.json({
        prices: stale,
        cached: true,
        stale: true,
        source: "stale-cache",
      });
    }
    return NextResponse.json(
      {
        error: "가격 데이터 API 요청에 실패했습니다. 잠시 후 다시 시도해주세요.",
        detail: err instanceof Error ? err.message : String(err),
        source,
      },
      { status: 502 }
    );
  }

  console.log(`[dca] ${asset} raw prices: ${prices.length}, source=${source}`);

  if (prices.length === 0) {
    return NextResponse.json(
      { error: "해당 기간의 가격 데이터가 없습니다.", source },
      { status: 404 }
    );
  }

  // Filter to requested range
  const beforeFilter = prices.length;
  prices = prices.filter((p) => p.date >= from && p.date <= to);
  console.log(`[dca] ${asset} after filter (${from}~${to}): ${prices.length}/${beforeFilter}, first=${prices[0]?.date} $${prices[0]?.price}, last=${prices[prices.length-1]?.date} $${prices[prices.length-1]?.price}`);

  writeCache(path, prices);

  return NextResponse.json({
    prices,
    cached: false,
    source,
    range: prices.length > 0
      ? { from: prices[0].date, to: prices[prices.length - 1].date, count: prices.length }
      : null,
  });
}
