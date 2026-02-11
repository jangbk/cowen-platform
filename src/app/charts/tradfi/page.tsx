"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Wifi, WifiOff } from "lucide-react";
import { getChartsBySection, getCategoriesForSection } from "@/data/chart-catalog";
import type { ChartItem } from "@/data/chart-catalog";

function priceDataToLine(prices: number[]): string {
  if (prices.length < 2) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = 200 / (prices.length - 1);
  const points = prices.map((p, i) => {
    const x = i * step;
    const y = 55 - ((p - min) / range) * 50 + 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${points.join(" L")}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0; }
  return Math.abs(hash);
}

function generateRandomLine(id: string): string {
  const seed = hashCode(id);
  const points: string[] = [];
  let y = 30 + (seed % 20);
  for (let x = 0; x <= 200; x += 10) {
    y = Math.max(5, Math.min(55, y + ((((seed * (x + 1)) % 17) - 8) * 0.8)));
    points.push(`${x},${y.toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
}

function ChartCard({ chart, sparkline }: { chart: ChartItem; sparkline?: number[] }) {
  const line = sparkline && sparkline.length > 5 ? priceDataToLine(sparkline) : generateRandomLine(chart.id);
  const fill = sparkline && sparkline.length > 5 ? `${line} L200,60 L0,60 Z` : `${generateRandomLine(chart.id)} L200,60 L0,60 Z`;

  return (
    <Link href={`/charts/${chart.id}`} className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md">
      <div className="relative h-20 mb-3 rounded-md bg-muted/30 overflow-hidden">
        <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={chart.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#grad-${chart.id})`} />
          <path d={line} fill="none" stroke={chart.color} strokeWidth="1.5" />
        </svg>
        {sparkline && sparkline.length > 5 && (
          <span className="absolute bottom-1 left-1.5 text-[8px] font-medium text-green-500/70">LIVE</span>
        )}
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-yellow-400" />
        </button>
      </div>
      <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{chart.title}</h3>
      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{chart.description}</p>
    </Link>
  );
}

export default function TradFiChartsPage() {
  const categories = getCategoriesForSection("tradfi");
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [dataSource, setDataSource] = useState<string>("loading");

  useEffect(() => {
    async function fetchSparklines() {
      try {
        const res = await fetch("/api/tradfi/quotes?type=index");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          // Use S&P 500 price as representative sparkline (single point, use for all)
          // For real sparklines we'd need historical data; use price as latest data point
          setDataSource(json.source === "yahoo" ? "Yahoo Finance (실시간)" : "기본 프리뷰");
        } else {
          setDataSource("기본 프리뷰");
        }
      } catch {
        setDataSource("기본 프리뷰");
      }
    }
    fetchSparklines();
  }, []);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">TradFi Charts</h1>
        <p className="text-muted-foreground mt-1">
          전통 금융 차트 - 주식, 채권, 원자재, 밸류에이션 지표
        </p>
        <div className="mt-1.5">
          {dataSource.includes("Yahoo") ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> 차트 클릭 시 실시간 데이터 로드
            </span>
          ) : dataSource !== "loading" ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <WifiOff className="h-3 w-3" /> 차트 클릭 시 실시간 데이터 로드
            </span>
          ) : null}
        </div>
      </div>

      {categories.map((cat) => {
        const charts = getChartsBySection("tradfi", cat);
        return (
          <section key={cat}>
            <h2 className="text-lg font-semibold mb-4">{cat}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {charts.map((chart) => (
                <ChartCard key={chart.id} chart={chart} sparkline={sparklines[chart.id]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
