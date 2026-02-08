import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/fear-greed
// Fetches Fear & Greed Index from Alternative.me (free, no key required).
// Returns: { value: 0-100, classification: string, timestamp: string }
// ---------------------------------------------------------------------------

const API_URL = "https://api.alternative.me/fng/?limit=1&format=json";

export async function GET() {
  try {
    const res = await fetch(API_URL, {
      next: { revalidate: 300 },
    } as RequestInit);

    if (!res.ok) throw new Error(`Alternative.me responded ${res.status}`);

    const json = await res.json();
    const entry = json?.data?.[0];

    if (!entry) throw new Error("No data returned");

    return NextResponse.json(
      {
        source: "alternative.me",
        value: parseInt(entry.value, 10),
        classification: entry.value_classification,
        timestamp: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.warn(
      "[/api/crypto/fear-greed] fetch failed, returning sample:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        source: "sample",
        value: 35,
        classification: "Fear",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  }
}
