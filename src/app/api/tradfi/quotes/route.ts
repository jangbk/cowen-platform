import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/tradfi/quotes?symbols=AAPL,MSFT&type=stock
// Fetches real-time quotes from Yahoo Finance (free, no API key needed).
// Falls back to sample data on failure.
// ---------------------------------------------------------------------------

interface YahooQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  trailingPE?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  ytdReturn?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
}

const STOCK_SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
  "BRK-B", "JPM", "V", "UNH", "XOM",
];

const INDEX_SYMBOLS = [
  "^GSPC",   // S&P 500
  "^DJI",    // Dow Jones
  "^IXIC",   // Nasdaq Composite
  "^NDX",    // Nasdaq 100
  "^RUT",    // Russell 2000
  "^FTSE",   // FTSE 100
  "^GDAXI",  // DAX
  "^N225",   // Nikkei 225
  "000001.SS", // Shanghai Composite
  "^HSI",    // Hang Seng
  "^KS11",   // KOSPI
];

const METAL_SYMBOLS = [
  "GC=F",  // Gold
  "SI=F",  // Silver
  "PL=F",  // Platinum
  "PA=F",  // Palladium
  "HG=F",  // Copper
  "ALI=F", // Aluminum (CME)
];

const SYMBOL_MAP: Record<string, string[]> = {
  stock: STOCK_SYMBOLS,
  index: INDEX_SYMBOLS,
  metal: METAL_SYMBOLS,
};

const DISPLAY_NAMES: Record<string, { name: string; sector?: string; unit?: string }> = {
  // Stocks
  AAPL: { name: "Apple Inc.", sector: "Technology" },
  MSFT: { name: "Microsoft Corp.", sector: "Technology" },
  NVDA: { name: "NVIDIA Corp.", sector: "Technology" },
  GOOGL: { name: "Alphabet Inc.", sector: "Communication" },
  AMZN: { name: "Amazon.com Inc.", sector: "Consumer" },
  META: { name: "Meta Platforms", sector: "Communication" },
  TSLA: { name: "Tesla Inc.", sector: "Consumer" },
  "BRK-B": { name: "Berkshire Hathaway", sector: "Financials" },
  JPM: { name: "JPMorgan Chase", sector: "Financials" },
  V: { name: "Visa Inc.", sector: "Financials" },
  UNH: { name: "UnitedHealth Group", sector: "Healthcare" },
  XOM: { name: "Exxon Mobil", sector: "Energy" },
  // Indexes
  "^GSPC": { name: "S&P 500" },
  "^DJI": { name: "Dow Jones" },
  "^IXIC": { name: "Nasdaq Composite" },
  "^NDX": { name: "Nasdaq 100" },
  "^RUT": { name: "Russell 2000" },
  "^FTSE": { name: "FTSE 100" },
  "^GDAXI": { name: "DAX" },
  "^N225": { name: "Nikkei 225" },
  "000001.SS": { name: "Shanghai Composite" },
  "^HSI": { name: "Hang Seng" },
  "^KS11": { name: "KOSPI" },
  // Metals
  "GC=F": { name: "Gold", unit: "oz" },
  "SI=F": { name: "Silver", unit: "oz" },
  "PL=F": { name: "Platinum", unit: "oz" },
  "PA=F": { name: "Palladium", unit: "oz" },
  "HG=F": { name: "Copper", unit: "lb" },
  "ALI=F": { name: "Aluminum", unit: "MT" },
};

async function fetchYahooQuotes(symbols: string[]): Promise<YahooQuote[] | null> {
  const symbolStr = symbols.join(",");

  // Try multiple Yahoo Finance endpoints
  const endpoints = [
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolStr)}`,
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolStr)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.warn(`Yahoo Finance responded with ${res.status} from ${url}`);
        continue;
      }

      const data = await res.json();
      const results = data?.quoteResponse?.result;
      if (results && results.length > 0) return results;
    } catch (error) {
      console.warn(`Yahoo Finance fetch failed from ${url}:`, error);
      continue;
    }
  }

  // Fallback: try fetching individual chart data (v8 endpoint)
  try {
    const quotes: YahooQuote[] = [];

    // Process in batches of 4 to avoid rate limits
    for (let i = 0; i < symbols.length; i += 4) {
      const batch = symbols.slice(i, i + 4);
      if (i > 0) await new Promise((r) => setTimeout(r, 500)); // Small delay between batches

      const results = await Promise.allSettled(
        batch.map(async (sym) => {
          const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
          const res = await fetch(chartUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const result = data?.chart?.result?.[0];
          if (!result) return null;
          const meta = result.meta;
          const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
          const price = meta.regularMarketPrice || 0;
          const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
          const changeAbs = prevClose > 0 ? price - prevClose : 0;

          return {
            symbol: meta.symbol,
            shortName: meta.shortName || meta.longName,
            longName: meta.longName,
            regularMarketPrice: price,
            regularMarketChangePercent: changePct,
            regularMarketChange: changeAbs,
            regularMarketVolume: meta.regularMarketVolume || 0,
            regularMarketDayHigh: meta.regularMarketDayHigh || 0,
            regularMarketDayLow: meta.regularMarketDayLow || 0,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
          } as YahooQuote;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) quotes.push(r.value);
      }
    }
    if (quotes.length > 0) return quotes;
  } catch (e) {
    console.warn("Yahoo chart fallback failed:", e);
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "stock";
  const customSymbols = searchParams.get("symbols");

  const symbols = customSymbols
    ? customSymbols.split(",").map((s) => s.trim())
    : SYMBOL_MAP[type] || STOCK_SYMBOLS;

  const quotes = await fetchYahooQuotes(symbols);

  if (quotes && quotes.length > 0) {
    const formatted = quotes.map((q) => {
      const info = DISPLAY_NAMES[q.symbol] || {};
      return {
        symbol: q.symbol,
        name: info.name || q.shortName || q.longName || q.symbol,
        sector: info.sector,
        unit: info.unit,
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChangePercent ?? 0,
        changeAbs: q.regularMarketChange ?? 0,
        marketCap: q.marketCap ?? 0,
        pe: q.trailingPE ?? 0,
        divYield: (q.dividendYield ?? 0) * 100,
        volume: q.regularMarketVolume ?? 0,
        high52w: q.fiftyTwoWeekHigh ?? 0,
        low52w: q.fiftyTwoWeekLow ?? 0,
        dayHigh: q.regularMarketDayHigh ?? 0,
        dayLow: q.regularMarketDayLow ?? 0,
      };
    });

    return NextResponse.json(
      { source: "yahoo", data: formatted },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }

  // Fallback: return empty with source indicator
  return NextResponse.json(
    { source: "unavailable", data: [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
