"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { getChartsBySection, getCategoriesForSection } from "@/data/chart-catalog";
import type { ChartItem } from "@/data/chart-catalog";

function ChartCard({ chart }: { chart: ChartItem }) {
  return (
    <Link
      href={`/charts/${chart.id}`}
      className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
    >
      {/* Mini chart preview */}
      <div className="relative h-20 mb-3 rounded-md bg-muted/30 overflow-hidden">
        <svg
          viewBox="0 0 200 60"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={chart.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={generateRandomPath(chart.id)}
            fill={`url(#grad-${chart.id})`}
          />
          <path
            d={generateRandomLine(chart.id)}
            fill="none"
            stroke={chart.color}
            strokeWidth="1.5"
          />
        </svg>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-yellow-400" />
        </button>
      </div>

      <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
        {chart.title}
      </h3>
      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
        {chart.description}
      </p>
    </Link>
  );
}

// Deterministic pseudo-random path based on chart ID
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
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

function generateRandomPath(id: string): string {
  const line = generateRandomLine(id);
  return `${line} L200,60 L0,60 Z`;
}

export default function CryptoChartsPage() {
  const categories = getCategoriesForSection("crypto");

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Crypto Charts</h1>
        <p className="text-muted-foreground mt-1">
          비트코인 및 암호화폐 차트 라이브러리 - 리스크, 회귀 모델, 기술적 분석, 모멘텀
        </p>
      </div>

      {categories.map((cat) => {
        const charts = getChartsBySection("crypto", cat);
        return (
          <section key={cat}>
            <h2 className="text-lg font-semibold mb-4">{cat}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {charts.map((chart) => (
                <ChartCard key={chart.id} chart={chart} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
