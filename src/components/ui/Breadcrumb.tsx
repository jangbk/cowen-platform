"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const PATH_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  charts: "Charts",
  crypto: "Crypto",
  macro: "Macro",
  tradfi: "TradFi",
  tools: "Tools",
  content: "Content",
  screener: "Screener",
  indicators: "Indicators",
  heatmap: "Heatmap",
  treasuries: "Treasuries",
  events: "Events",
  calendar: "Calendar",
  indexes: "Indexes",
  stocks: "Stocks",
  metals: "Metals",
  "dca-simulation": "DCA Simulation",
  "exit-strategies": "Exit Strategies",
  "modern-portfolio-theory": "MPT",
  "portfolio-strategy-tester": "Strategy Tester",
  "weighted-risk": "Weighted Risk",
  "metric-analyzer": "Metric Analyzer",
  "bot-performance": "Bot Performance",
  backtest: "Backtest",
  studies: "Crypto News",
  "premium-videos": "Crypto Channels",
  "video-summaries": "Video Summaries",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav aria-label="경로 탐색" className="px-4 sm:px-6 pt-3 pb-0">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <li>
          <Link href="/dashboard" className="hover:text-primary transition-colors" aria-label="홈">
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {segments.map((segment, idx) => {
          const path = "/" + segments.slice(0, idx + 1).join("/");
          const isLast = idx === segments.length - 1;
          const label = PATH_LABELS[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

          return (
            <li key={path} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link href={path} className="hover:text-primary transition-colors">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
