import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/fear-greed-history
// Returns ~365 days of Fear & Greed Index history from Alternative.me
// ---------------------------------------------------------------------------

interface FngEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

async function fetchFearGreedHistory(): Promise<
  Array<{ date: string; value: number; classification: string }> | null
> {
  try {
    const res = await fetch(
      "https://api.alternative.me/fng/?limit=365&format=json",
      { next: { revalidate: 3600 } } as RequestInit,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const entries: FngEntry[] = json.data ?? [];
    if (entries.length === 0) return null;

    return entries
      .map((e) => ({
        date: new Date(parseInt(e.timestamp) * 1000)
          .toISOString()
          .split("T")[0],
        value: parseInt(e.value),
        classification: e.value_classification,
      }))
      .reverse(); // oldest first
  } catch {
    return null;
  }
}

function generateSample(): Array<{
  date: string;
  value: number;
  classification: string;
}> {
  const data: Array<{ date: string; value: number; classification: string }> =
    [];
  const now = new Date();

  for (let d = 365; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const t = (365 - d) / 365;

    const base = 45;
    const cycle = 25 * Math.sin(2 * Math.PI * t * 3 + 1.2);
    const micro = 10 * Math.sin(2 * Math.PI * t * 15 + 2.5);
    const value = Math.max(5, Math.min(95, Math.round(base + cycle + micro)));

    let classification = "Neutral";
    if (value <= 20) classification = "Extreme Fear";
    else if (value <= 40) classification = "Fear";
    else if (value <= 60) classification = "Neutral";
    else if (value <= 80) classification = "Greed";
    else classification = "Extreme Greed";

    data.push({
      date: date.toISOString().split("T")[0],
      value,
      classification,
    });
  }
  return data;
}

export async function GET() {
  const live = await fetchFearGreedHistory();

  if (live && live.length > 0) {
    return NextResponse.json(
      { source: "alternative_me", data: live },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  return NextResponse.json(
    { source: "sample", data: generateSample() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    },
  );
}
