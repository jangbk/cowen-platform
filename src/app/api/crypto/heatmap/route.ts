import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/heatmap
// Fetches top 100 crypto by market cap from CoinGecko FREE API.
// Returns data needed for the treemap heatmap visualization.
// ---------------------------------------------------------------------------

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h,24h,7d,30d";

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
  total_volume: number;
}

// ---------------------------------------------------------------------------
// Sector classification for sample data
// ---------------------------------------------------------------------------
const SECTOR_MAP: Record<string, string> = {
  bitcoin: "Layer 1",
  ethereum: "Layer 1",
  binancecoin: "Layer 1",
  solana: "Layer 1",
  ripple: "Layer 1",
  cardano: "Layer 1",
  avalanche: "Layer 1",
  polkadot: "Layer 1",
  tron: "Layer 1",
  cosmos: "Layer 1",
  near: "Layer 1",
  aptos: "Layer 1",
  sui: "Layer 1",
  ton: "Layer 1",
  dogecoin: "Meme",
  "shiba-inu": "Meme",
  pepe: "Meme",
  floki: "Meme",
  bonk: "Meme",
  chainlink: "DeFi",
  uniswap: "DeFi",
  aave: "DeFi",
  maker: "DeFi",
  "lido-dao": "DeFi",
  arbitrum: "Layer 2",
  optimism: "Layer 2",
  "matic-network": "Layer 2",
  starknet: "Layer 2",
};

function getSector(id: string): string {
  return SECTOR_MAP[id] || "Other";
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
function getSampleData(): CoinData[] {
  const coins = [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin", price: 97250, cap: 1912e9, vol: 42.3e9, h1: 0.12, h24: 1.42, d7: 4.87, d30: 12.3 },
    { id: "ethereum", symbol: "eth", name: "Ethereum", price: 3285, cap: 395e9, vol: 18.7e9, h1: -0.08, h24: -0.38, d7: 2.14, d30: 8.5 },
    { id: "binancecoin", symbol: "bnb", name: "BNB", price: 685, cap: 102e9, vol: 2.1e9, h1: 0.34, h24: 0.75, d7: 1.23, d30: 5.2 },
    { id: "ripple", symbol: "xrp", name: "XRP", price: 2.48, cap: 138e9, vol: 8.4e9, h1: -0.22, h24: 3.12, d7: 8.45, d30: 22.1 },
    { id: "solana", symbol: "sol", name: "Solana", price: 198, cap: 94e9, vol: 5.2e9, h1: 0.56, h24: 2.15, d7: 6.32, d30: 15.8 },
    { id: "dogecoin", symbol: "doge", name: "Dogecoin", price: 0.372, cap: 54.8e9, vol: 4.1e9, h1: 0.42, h24: 4.28, d7: 12.5, d30: 28.3 },
    { id: "cardano", symbol: "ada", name: "Cardano", price: 1.02, cap: 36.2e9, vol: 1.8e9, h1: 0.18, h24: 1.87, d7: 5.63, d30: 14.2 },
    { id: "tron", symbol: "trx", name: "TRON", price: 0.248, cap: 21.4e9, vol: 890e6, h1: 0.52, h24: 0.52, d7: -1.03, d30: 2.4 },
    { id: "avalanche", symbol: "avax", name: "Avalanche", price: 38.7, cap: 15.9e9, vol: 620e6, h1: -0.14, h24: 2.45, d7: 7.12, d30: 18.5 },
    { id: "chainlink", symbol: "link", name: "Chainlink", price: 24.85, cap: 15.8e9, vol: 1.2e9, h1: -0.31, h24: -1.12, d7: 3.25, d30: 9.8 },
    { id: "polkadot", symbol: "dot", name: "Polkadot", price: 7.85, cap: 11.2e9, vol: 380e6, h1: 0.08, h24: 1.03, d7: 4.18, d30: 11.2 },
    { id: "shiba-inu", symbol: "shib", name: "Shiba Inu", price: 0.0000232, cap: 13.7e9, vol: 1.05e9, h1: 0.67, h24: 3.58, d7: 9.82, d30: 24.5 },
    { id: "uniswap", symbol: "uni", name: "Uniswap", price: 13.45, cap: 8.1e9, vol: 320e6, h1: 0.14, h24: -1.87, d7: 0.56, d30: 6.3 },
    { id: "litecoin", symbol: "ltc", name: "Litecoin", price: 108.3, cap: 8.1e9, vol: 560e6, h1: 0.92, h24: 0.92, d7: 2.48, d30: 7.8 },
    { id: "cosmos", symbol: "atom", name: "Cosmos", price: 9.42, cap: 3.68e9, vol: 215e6, h1: 0.31, h24: 1.65, d7: 5.12, d30: 13.4 },
    { id: "arbitrum", symbol: "arb", name: "Arbitrum", price: 1.18, cap: 4.25e9, vol: 450e6, h1: -0.42, h24: -0.42, d7: 3.67, d30: 10.2 },
    { id: "optimism", symbol: "op", name: "Optimism", price: 2.35, cap: 3.12e9, vol: 280e6, h1: 0.28, h24: 1.28, d7: 4.52, d30: 11.8 },
    { id: "aptos", symbol: "apt", name: "Aptos", price: 11.28, cap: 5.48e9, vol: 340e6, h1: 0.85, h24: 2.85, d7: 8.94, d30: 19.2 },
    { id: "near", symbol: "near", name: "NEAR Protocol", price: 5.82, cap: 6.42e9, vol: 410e6, h1: 0.44, h24: 1.92, d7: 6.78, d30: 15.1 },
    { id: "sui", symbol: "sui", name: "Sui", price: 4.12, cap: 5.2e9, vol: 520e6, h1: 1.2, h24: 5.42, d7: 14.3, d30: 32.1 },
    { id: "matic-network", symbol: "pol", name: "Polygon", price: 0.52, cap: 5.2e9, vol: 310e6, h1: -0.64, h24: -0.64, d7: 1.35, d30: 4.8 },
    { id: "ton", symbol: "ton", name: "Toncoin", price: 5.85, cap: 14.4e9, vol: 280e6, h1: 0.15, h24: 0.85, d7: 2.14, d30: 6.5 },
    { id: "aave", symbol: "aave", name: "Aave", price: 285, cap: 4.28e9, vol: 320e6, h1: -0.28, h24: 1.42, d7: 5.82, d30: 14.8 },
    { id: "maker", symbol: "mkr", name: "Maker", price: 1850, cap: 1.67e9, vol: 120e6, h1: 0.12, h24: -0.52, d7: 2.14, d30: 8.2 },
    { id: "render-token", symbol: "rndr", name: "Render", price: 8.45, cap: 4.38e9, vol: 380e6, h1: 0.92, h24: 3.85, d7: 11.2, d30: 25.4 },
    { id: "injective-protocol", symbol: "inj", name: "Injective", price: 24.5, cap: 2.45e9, vol: 180e6, h1: 0.44, h24: 2.12, d7: 7.85, d30: 18.2 },
    { id: "filecoin", symbol: "fil", name: "Filecoin", price: 5.42, cap: 3.12e9, vol: 220e6, h1: -0.18, h24: 1.28, d7: 4.52, d30: 10.8 },
    { id: "lido-dao", symbol: "ldo", name: "Lido DAO", price: 2.85, cap: 2.56e9, vol: 180e6, h1: 0.22, h24: -0.85, d7: 2.42, d30: 7.5 },
    { id: "pepe", symbol: "pepe", name: "Pepe", price: 0.0000185, cap: 7.8e9, vol: 2.1e9, h1: 1.85, h24: 6.42, d7: 18.5, d30: 42.3 },
    { id: "bonk", symbol: "bonk", name: "Bonk", price: 0.0000285, cap: 1.92e9, vol: 520e6, h1: 2.12, h24: 8.42, d7: 22.1, d30: 48.5 },
  ];

  return coins.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: `https://assets.coingecko.com/coins/images/1/large/${c.symbol}.png`,
    current_price: c.price,
    market_cap: c.cap,
    price_change_percentage_1h_in_currency: c.h1,
    price_change_percentage_24h: c.h24,
    price_change_percentage_7d_in_currency: c.d7,
    price_change_percentage_30d_in_currency: c.d30,
    total_volume: c.vol,
  }));
}

export async function GET() {
  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    } as RequestInit);

    if (!res.ok) {
      throw new Error(`CoinGecko responded with status ${res.status}`);
    }

    const raw = await res.json();
    const data: CoinData[] = raw.map((c: Record<string, unknown>) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      current_price: c.current_price,
      market_cap: c.market_cap,
      price_change_percentage_1h_in_currency: c.price_change_percentage_1h_in_currency ?? 0,
      price_change_percentage_24h: c.price_change_percentage_24h ?? 0,
      price_change_percentage_7d_in_currency: c.price_change_percentage_7d_in_currency ?? 0,
      price_change_percentage_30d_in_currency: c.price_change_percentage_30d_in_currency ?? 0,
      total_volume: c.total_volume,
    }));

    const enriched = data.map((c) => ({ ...c, sector: getSector(c.id) }));

    return NextResponse.json(
      { source: "coingecko", data: enriched },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
        },
      },
    );
  } catch (error) {
    console.warn(
      "[/api/crypto/heatmap] CoinGecko fetch failed, returning sample data:",
      error instanceof Error ? error.message : error,
    );

    const sample = getSampleData().map((c) => ({ ...c, sector: getSector(c.id) }));

    return NextResponse.json(
      { source: "sample", data: sample },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
        },
      },
    );
  }
}
