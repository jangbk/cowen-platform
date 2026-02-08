import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/macro/calendar
// Fetches upcoming economic events from free sources.
// Primary: Forex Factory (nfs.faireconomy.media)
// Fallback: static calendar with common recurring US events.
// ---------------------------------------------------------------------------

interface CalendarEvent {
  name: string;
  date: string;
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
          e.country === "USD" &&
          (e.impact === "High" || e.impact === "Medium"),
      )
      .slice(0, 10)
      .map(
        (e: {
          title: string;
          date: string;
          previous: string;
          forecast: string;
          impact: string;
        }) => {
          // Parse date to Korean-friendly format
          const d = new Date(e.date);
          const days = ["일", "월", "화", "수", "목", "금", "토"];
          const dayStr = days[d.getDay()];
          const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

          return {
            name: e.title,
            date: `${dayStr} ${timeStr}`,
            prev: e.previous || "-",
            forecast: e.forecast || "-",
            importance:
              e.impact === "High"
                ? ("high" as const)
                : ("medium" as const),
            country: "US",
          };
        },
      );

    return events.length > 0 ? events : null;
  } catch {
    return null;
  }
}

// Fallback: generate plausible near-term calendar
function getStaticCalendar(): CalendarEvent[] {
  const now = new Date();
  const thisWeek: CalendarEvent[] = [
    {
      name: "비농업 고용 변동 (NFP)",
      date: "금 22:30",
      prev: "256K",
      forecast: "170K",
      importance: "high",
      country: "US",
    },
    {
      name: "실업률",
      date: "금 22:30",
      prev: "4.1%",
      forecast: "4.1%",
      importance: "high",
      country: "US",
    },
    {
      name: "CPI (전년비)",
      date: "수 22:30",
      prev: "2.9%",
      forecast: "2.8%",
      importance: "high",
      country: "US",
    },
    {
      name: "미시간 소비자 심리지수",
      date: "금 00:00",
      prev: "64.7",
      forecast: "68.0",
      importance: "medium",
      country: "US",
    },
    {
      name: "소매 판매 (MoM)",
      date: "금 22:30",
      prev: "0.4%",
      forecast: "0.3%",
      importance: "medium",
      country: "US",
    },
    {
      name: "FOMC 의사록",
      date: "목 04:00",
      prev: "-",
      forecast: "-",
      importance: "high",
      country: "US",
    },
    {
      name: "ISM 제조업 PMI",
      date: "월 00:00",
      prev: "49.3",
      forecast: "49.5",
      importance: "high",
      country: "US",
    },
  ];

  // Return first 5
  return thisWeek.slice(0, 5);
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
