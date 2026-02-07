"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react";

const CALENDAR_EVENTS = [
  { date: "2026-02-07", time: "08:30", event: "US Non-Farm Payrolls", actual: "216K", forecast: "185K", previous: "256K", impact: "high", country: "US" },
  { date: "2026-02-07", time: "08:30", event: "US Unemployment Rate", actual: "3.9%", forecast: "4.0%", previous: "3.8%", impact: "high", country: "US" },
  { date: "2026-02-07", time: "10:00", event: "US ISM Non-Manufacturing PMI", actual: "", forecast: "53.5", previous: "54.1", impact: "medium", country: "US" },
  { date: "2026-02-10", time: "02:00", event: "China CPI YoY", actual: "", forecast: "0.8%", previous: "0.7%", impact: "medium", country: "CN" },
  { date: "2026-02-10", time: "10:00", event: "US Wholesale Inventories", actual: "", forecast: "0.2%", previous: "0.2%", impact: "low", country: "US" },
  { date: "2026-02-11", time: "05:00", event: "UK GDP QoQ", actual: "", forecast: "0.2%", previous: "0.1%", impact: "high", country: "UK" },
  { date: "2026-02-12", time: "08:30", event: "US CPI YoY", actual: "", forecast: "3.0%", previous: "3.1%", impact: "high", country: "US" },
  { date: "2026-02-12", time: "08:30", event: "US Core CPI MoM", actual: "", forecast: "0.2%", previous: "0.3%", impact: "high", country: "US" },
  { date: "2026-02-13", time: "08:30", event: "US PPI YoY", actual: "", forecast: "1.8%", previous: "1.9%", impact: "medium", country: "US" },
  { date: "2026-02-13", time: "08:30", event: "US Initial Jobless Claims", actual: "", forecast: "220K", previous: "218K", impact: "medium", country: "US" },
  { date: "2026-02-14", time: "08:30", event: "US Retail Sales MoM", actual: "", forecast: "0.3%", previous: "-0.1%", impact: "high", country: "US" },
  { date: "2026-02-14", time: "09:15", event: "US Industrial Production MoM", actual: "", forecast: "0.2%", previous: "0.1%", impact: "medium", country: "US" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MacroCalendarPage() {
  const [selectedDate, setSelectedDate] = useState("2026-02-07");
  const [impactFilter, setImpactFilter] = useState("all");

  const filteredEvents = CALENDAR_EVENTS.filter(
    (e) => impactFilter === "all" || e.impact === impactFilter
  );

  const groupedEvents: Record<string, typeof CALENDAR_EVENTS> = {};
  filteredEvents.forEach((event) => {
    if (!groupedEvents[event.date]) groupedEvents[event.date] = [];
    groupedEvents[event.date].push(event);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Economic Calendar</h1>
        </div>
        <p className="text-muted-foreground">
          Upcoming and recent macroeconomic data releases with forecasts, actuals, and market impact ratings.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <button className="hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium min-w-[140px] text-center">February 7 - 14, 2026</span>
          <button className="hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {["all", "high", "medium", "low"].map((level) => (
            <button
              key={level}
              onClick={() => setImpactFilter(level)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                impactFilter === level ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {level === "all" ? "All Impact" : level}
            </button>
          ))}
        </div>
        <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option>All Countries</option>
          <option>United States</option>
          <option>Eurozone</option>
          <option>United Kingdom</option>
          <option>China</option>
          <option>Japan</option>
        </select>
      </div>

      {/* Calendar Events */}
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, events]) => {
          const d = new Date(date + "T00:00:00");
          const dayName = WEEKDAYS[d.getDay()];
          const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const isToday = date === "2026-02-07";

          return (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                  {dayName}, {dateStr}
                  {isToday && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Today</span>}
                </h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-16">Time</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground w-12"></th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Event</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground w-16">Impact</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Actual</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Forecast</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {event.time}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex h-5 w-7 items-center justify-center rounded bg-muted text-[10px] font-bold">
                            {event.country}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{event.event}</td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex justify-center gap-0.5">
                            {[1, 2, 3].map((n) => (
                              <div
                                key={n}
                                className={`h-2.5 w-2.5 rounded-full ${
                                  n <= (event.impact === "high" ? 3 : event.impact === "medium" ? 2 : 1)
                                    ? event.impact === "high" ? "bg-red-500" : event.impact === "medium" ? "bg-yellow-500" : "bg-green-500"
                                    : "bg-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono font-semibold ${event.actual ? "text-foreground" : "text-muted-foreground"}`}>
                          {event.actual || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{event.forecast}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{event.previous}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
