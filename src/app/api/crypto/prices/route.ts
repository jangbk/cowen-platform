import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/prices
// Fetches top-30 crypto market data from the CoinGecko FREE API.
// Falls back to realistic sample data when the fetch fails.
// Cached for 60 seconds via Cache-Control.
// ---------------------------------------------------------------------------

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=true&price_change_percentage=24h,7d";

// ---------------------------------------------------------------------------
// Helper: generate a realistic-looking 7-day sparkline (168 hourly points)
// around a given base price with a specified volatility (fraction).
// ---------------------------------------------------------------------------
function generateSparkline(
  base: number,
  volatility: number,
  trend: number = 0,
): number[] {
  const points: number[] = [];
  let price = base * (1 - trend * 0.5); // start a bit lower/higher depending on trend
  for (let i = 0; i < 168; i++) {
    const drift = (trend * base) / 168;
    const noise = (Math.random() - 0.5) * 2 * volatility * base;
    price = Math.max(price + drift + noise, base * 0.8);
    points.push(parseFloat(price.toFixed(2)));
  }
  return points;
}

// ---------------------------------------------------------------------------
// Sample data for 20 major assets
// ---------------------------------------------------------------------------
function getSampleData() {
  const assets: Array<{
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d_in_currency: number;
    market_cap: number;
    total_volume: number;
    volatility: number;
    trend: number;
  }> = [
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
      current_price: 97250.0,
      price_change_percentage_24h: 1.42,
      price_change_percentage_7d_in_currency: 4.87,
      market_cap: 1_912_000_000_000,
      total_volume: 42_300_000_000,
      volatility: 0.015,
      trend: 0.05,
    },
    {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
      current_price: 3285.0,
      price_change_percentage_24h: -0.38,
      price_change_percentage_7d_in_currency: 2.14,
      market_cap: 395_000_000_000,
      total_volume: 18_700_000_000,
      volatility: 0.02,
      trend: 0.02,
    },
    {
      id: "binancecoin",
      symbol: "bnb",
      name: "BNB",
      image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
      current_price: 685.5,
      price_change_percentage_24h: 0.75,
      price_change_percentage_7d_in_currency: 1.23,
      market_cap: 102_000_000_000,
      total_volume: 2_100_000_000,
      volatility: 0.018,
      trend: 0.01,
    },
    {
      id: "ripple",
      symbol: "xrp",
      name: "XRP",
      image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
      current_price: 2.48,
      price_change_percentage_24h: 3.12,
      price_change_percentage_7d_in_currency: 8.45,
      market_cap: 138_000_000_000,
      total_volume: 8_400_000_000,
      volatility: 0.035,
      trend: 0.08,
    },
    {
      id: "solana",
      symbol: "sol",
      name: "Solana",
      image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
      current_price: 198.5,
      price_change_percentage_24h: 2.15,
      price_change_percentage_7d_in_currency: 6.32,
      market_cap: 94_000_000_000,
      total_volume: 5_200_000_000,
      volatility: 0.03,
      trend: 0.06,
    },
    {
      id: "tron",
      symbol: "trx",
      name: "TRON",
      image: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
      current_price: 0.248,
      price_change_percentage_24h: 0.52,
      price_change_percentage_7d_in_currency: -1.03,
      market_cap: 21_400_000_000,
      total_volume: 890_000_000,
      volatility: 0.022,
      trend: -0.01,
    },
    {
      id: "dogecoin",
      symbol: "doge",
      name: "Dogecoin",
      image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
      current_price: 0.372,
      price_change_percentage_24h: 4.28,
      price_change_percentage_7d_in_currency: 12.5,
      market_cap: 54_800_000_000,
      total_volume: 4_100_000_000,
      volatility: 0.04,
      trend: 0.12,
    },
    {
      id: "cardano",
      symbol: "ada",
      name: "Cardano",
      image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
      current_price: 1.02,
      price_change_percentage_24h: 1.87,
      price_change_percentage_7d_in_currency: 5.63,
      market_cap: 36_200_000_000,
      total_volume: 1_800_000_000,
      volatility: 0.032,
      trend: 0.05,
    },
    {
      id: "chainlink",
      symbol: "link",
      name: "Chainlink",
      image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
      current_price: 24.85,
      price_change_percentage_24h: -1.12,
      price_change_percentage_7d_in_currency: 3.25,
      market_cap: 15_800_000_000,
      total_volume: 1_200_000_000,
      volatility: 0.028,
      trend: 0.03,
    },
    {
      id: "monero",
      symbol: "xmr",
      name: "Monero",
      image: "https://assets.coingecko.com/coins/images/69/large/monero_logo.png",
      current_price: 215.4,
      price_change_percentage_24h: 0.35,
      price_change_percentage_7d_in_currency: -0.72,
      market_cap: 3_960_000_000,
      total_volume: 85_000_000,
      volatility: 0.022,
      trend: -0.007,
    },
    {
      id: "avalanche-2",
      symbol: "avax",
      name: "Avalanche",
      image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
      current_price: 38.7,
      price_change_percentage_24h: 2.45,
      price_change_percentage_7d_in_currency: 7.12,
      market_cap: 15_900_000_000,
      total_volume: 620_000_000,
      volatility: 0.035,
      trend: 0.07,
    },
    {
      id: "polkadot",
      symbol: "dot",
      name: "Polkadot",
      image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
      current_price: 7.85,
      price_change_percentage_24h: 1.03,
      price_change_percentage_7d_in_currency: 4.18,
      market_cap: 11_200_000_000,
      total_volume: 380_000_000,
      volatility: 0.03,
      trend: 0.04,
    },
    {
      id: "matic-network",
      symbol: "matic",
      name: "Polygon",
      image: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
      current_price: 0.52,
      price_change_percentage_24h: -0.64,
      price_change_percentage_7d_in_currency: 1.35,
      market_cap: 5_200_000_000,
      total_volume: 310_000_000,
      volatility: 0.032,
      trend: 0.01,
    },
    {
      id: "shiba-inu",
      symbol: "shib",
      name: "Shiba Inu",
      image: "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
      current_price: 0.0000232,
      price_change_percentage_24h: 3.58,
      price_change_percentage_7d_in_currency: 9.82,
      market_cap: 13_700_000_000,
      total_volume: 1_050_000_000,
      volatility: 0.045,
      trend: 0.1,
    },
    {
      id: "litecoin",
      symbol: "ltc",
      name: "Litecoin",
      image: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
      current_price: 108.3,
      price_change_percentage_24h: 0.92,
      price_change_percentage_7d_in_currency: 2.48,
      market_cap: 8_100_000_000,
      total_volume: 560_000_000,
      volatility: 0.025,
      trend: 0.02,
    },
    {
      id: "uniswap",
      symbol: "uni",
      name: "Uniswap",
      image: "https://assets.coingecko.com/coins/images/12504/large/uniswap.png",
      current_price: 13.45,
      price_change_percentage_24h: -1.87,
      price_change_percentage_7d_in_currency: 0.56,
      market_cap: 8_100_000_000,
      total_volume: 320_000_000,
      volatility: 0.035,
      trend: 0.005,
    },
    {
      id: "cosmos",
      symbol: "atom",
      name: "Cosmos",
      image: "https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png",
      current_price: 9.42,
      price_change_percentage_24h: 1.65,
      price_change_percentage_7d_in_currency: 5.12,
      market_cap: 3_680_000_000,
      total_volume: 215_000_000,
      volatility: 0.03,
      trend: 0.05,
    },
    {
      id: "aptos",
      symbol: "apt",
      name: "Aptos",
      image: "https://assets.coingecko.com/coins/images/26455/large/aptos_round.png",
      current_price: 11.28,
      price_change_percentage_24h: 2.85,
      price_change_percentage_7d_in_currency: 8.94,
      market_cap: 5_480_000_000,
      total_volume: 340_000_000,
      volatility: 0.038,
      trend: 0.09,
    },
    {
      id: "arbitrum",
      symbol: "arb",
      name: "Arbitrum",
      image: "https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg",
      current_price: 1.18,
      price_change_percentage_24h: -0.42,
      price_change_percentage_7d_in_currency: 3.67,
      market_cap: 4_250_000_000,
      total_volume: 450_000_000,
      volatility: 0.035,
      trend: 0.04,
    },
    {
      id: "optimism",
      symbol: "op",
      name: "Optimism",
      image: "https://assets.coingecko.com/coins/images/25244/large/Optimism.png",
      current_price: 2.35,
      price_change_percentage_24h: 1.28,
      price_change_percentage_7d_in_currency: 4.52,
      market_cap: 3_120_000_000,
      total_volume: 280_000_000,
      volatility: 0.036,
      trend: 0.045,
    },
  ];

  return assets.map(
    ({
      id,
      symbol,
      name,
      image,
      current_price,
      price_change_percentage_24h,
      price_change_percentage_7d_in_currency,
      market_cap,
      total_volume,
      volatility,
      trend,
    }) => ({
      id,
      symbol,
      name,
      image,
      current_price,
      price_change_percentage_24h,
      price_change_percentage_7d_in_currency,
      market_cap,
      total_volume,
      sparkline_in_7d: {
        price: generateSparkline(current_price, volatility, trend),
      },
    }),
  );
}

export async function GET() {
  try {
    const res = await fetch(COINGECKO_URL, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    } as RequestInit);

    if (!res.ok) {
      throw new Error(`CoinGecko responded with status ${res.status}`);
    }

    const data = await res.json();

    return NextResponse.json(
      { source: "coingecko", data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.warn(
      "[/api/crypto/prices] CoinGecko fetch failed, returning sample data:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { source: "sample", data: getSampleData() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }
}
