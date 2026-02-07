import { NextResponse } from "next/server";

// CoinMarketCal API proxy
// Docs: https://coinmarketcal.com/en/api
// Free tier available for developers

const COINMARKETCAL_BASE_URL = "https://developers.coinmarketcal.com/v1";

interface CoinMarketCalEvent {
  title: { en: string };
  coins: Array<{ id: string; symbol: string; name: string }>;
  date_event: string;
  categories: Array<{ id: number; name: string }>;
  description: { en: string };
  proof: string;
  source: string;
  percentage: number; // confidence score
  is_hot: boolean;
  vote_count: number;
  positive_vote_count: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  const max = searchParams.get("max") || "50";
  const coins = searchParams.get("coins") || "";
  const categories = searchParams.get("categories") || "";

  // If API key is not set, return sample data
  const apiKey = process.env.COINMARKETCAL_API_KEY;

  if (!apiKey) {
    // Return sample data when API key is not configured
    return NextResponse.json({
      status: "ok",
      source: "sample",
      data: [
        {
          id: 1,
          title: "Bitcoin Halving Countdown",
          coin: "BTC",
          coinName: "Bitcoin",
          date: "2026-03-15",
          category: "Halving",
          importance: "high",
          description: "Bitcoin block reward halving event.",
          confidence: 95,
        },
        {
          id: 2,
          title: "Ethereum Dencun Upgrade Phase 2",
          coin: "ETH",
          coinName: "Ethereum",
          date: "2026-02-20",
          category: "Hard Fork",
          importance: "high",
          description: "Major network upgrade improving L2 scalability.",
          confidence: 88,
        },
        {
          id: 3,
          title: "BNB Chain Quarterly Token Burn",
          coin: "BNB",
          coinName: "BNB",
          date: "2026-02-15",
          category: "Token Burn",
          importance: "medium",
          description: "Scheduled quarterly BNB token burn event.",
          confidence: 95,
        },
      ],
    });
  }

  try {
    const params = new URLSearchParams({
      page,
      max,
      ...(coins && { coins }),
      ...(categories && { categories }),
    });

    const response = await fetch(
      `${COINMARKETCAL_BASE_URL}/events?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`CoinMarketCal API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our format
    const events = data.body.map(
      (event: CoinMarketCalEvent, index: number) => ({
        id: index + 1,
        title: event.title.en,
        coin: event.coins[0]?.symbol || "CRYPTO",
        coinName: event.coins[0]?.name || "General",
        date: event.date_event,
        category: event.categories[0]?.name || "Other",
        importance:
          event.percentage >= 80
            ? "high"
            : event.percentage >= 50
              ? "medium"
              : "low",
        description: event.description?.en || "",
        confidence: event.percentage,
        source: event.source,
        isHot: event.is_hot,
        voteCount: event.vote_count,
      })
    );

    return NextResponse.json({
      status: "ok",
      source: "coinmarketcal",
      data: events,
    });
  } catch (error) {
    console.error("CoinMarketCal API error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
