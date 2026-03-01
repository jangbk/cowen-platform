import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/macro/calendar
// Fetches upcoming economic events from free sources.
// Primary: Forex Factory (nfs.faireconomy.media)
// Fallback: static calendar with common recurring US events.
// ---------------------------------------------------------------------------

interface CalendarEvent {
  name: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:MM
  prev: string;
  forecast: string;
  importance: "high" | "medium" | "low";
  country: string;
}

async function fetchForexFactory(): Promise<CalendarEvent[] | null> {
  try {
    const res = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
      { next: { revalidate: 3600 } } as RequestInit,
    );

    if (!res.ok) return null;

    const json = await res.json();

    // Filter for USD (US) high/medium impact events
    const events = (json ?? [])
      .filter(
        (e: { country: string; impact: string }) =>
          (e.impact === "High" || e.impact === "Medium"),
      )
      .slice(0, 20)
      .map(
        (e: {
          title: string;
          date: string;
          previous: string;
          forecast: string;
          impact: string;
          country: string;
        }) => {
          const d = new Date(e.date);
          const isoDate = d.toISOString().split("T")[0];
          const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

          // Map ForexFactory country codes (USD, EUR, GBP, etc.) to 2-letter codes
          const countryMap: Record<string, string> = {
            USD: "US", EUR: "EU", GBP: "UK", JPY: "JP", CNY: "CN",
            AUD: "AU", CAD: "CA", CHF: "CH", NZD: "NZ", KRW: "KR",
          };

          return {
            name: e.title,
            date: isoDate,
            time: timeStr,
            prev: e.previous || "-",
            forecast: e.forecast || "-",
            importance:
              e.impact === "High"
                ? ("high" as const)
                : ("medium" as const),
            country: countryMap[e.country] || e.country,
          };
        },
      );

    return events.length > 0 ? events : null;
  } catch {
    return null;
  }
}

// Fallback: generate plausible near-term calendar with ISO dates
function getStaticCalendar(): CalendarEvent[] {
  // Generate dates relative to current week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const dayISO = (offset: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return d.toISOString().split("T")[0];
  };

  return [
    { name: "ISM 제조업 PMI", date: dayISO(0), time: "00:00", prev: "49.3", forecast: "49.5", importance: "high", country: "US" },
    { name: "CPI (전년비)", date: dayISO(2), time: "22:30", prev: "2.9%", forecast: "2.8%", importance: "high", country: "US" },
    { name: "FOMC 의사록", date: dayISO(3), time: "04:00", prev: "-", forecast: "-", importance: "high", country: "US" },
    { name: "비농업 고용 변동 (NFP)", date: dayISO(4), time: "22:30", prev: "256K", forecast: "170K", importance: "high", country: "US" },
    { name: "실업률", date: dayISO(4), time: "22:30", prev: "4.1%", forecast: "4.1%", importance: "high", country: "US" },
    { name: "소매 판매 (MoM)", date: dayISO(4), time: "22:30", prev: "0.4%", forecast: "0.3%", importance: "medium", country: "US" },
    { name: "미시간 소비자 심리지수", date: dayISO(4), time: "00:00", prev: "64.7", forecast: "68.0", importance: "medium", country: "US" },
  ];
}

export async function GET() {
  const live = await fetchForexFactory();

  if (live && live.length > 0) {
    return NextResponse.json(
      { source: "forexfactory", events: live },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  return NextResponse.json(
    { source: "sample", events: getStaticCalendar() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    },
  );
}
