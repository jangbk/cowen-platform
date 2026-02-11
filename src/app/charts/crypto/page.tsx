"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Wifi, WifiOff } from "lucide-react";
import { getChartsBySection, getCategoriesForSection } from "@/data/chart-catalog";
import type { ChartItem } from "@/data/chart-catalog";

// Generate SVG line from real price data (normalized to 0-60 range)
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

function ChartCard({ chart, sparkline }: { chart: ChartItem; sparkline?: number[] }) {
  const line = sparkline && sparkline.length > 5
    ? priceDataToLine(sparkline)
    : generateRandomLine(chart.id);
  const fill = sparkline && sparkline.length > 5
    ? `${line} L200,60 L0,60 Z`
    : generateRandomPath(chart.id);

  return (
    <Link
      href={`/charts/${chart.id}`}
      className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
    >
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

function generateRandomPath(id: string): string {
  return `${generateRandomLine(id)} L200,60 L0,60 Z`;
}

export default function CryptoChartsPage() {
  const categories = getCategoriesForSection("crypto");
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [dataSource, setDataSource] = useState<string>("loading");

  useEffect(() => {
    async function fetchSparklines() {
      try {
        // Fetch BTC 30-day sparkline from CoinGecko
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily"
        );
        if (!res.ok) throw new Error("CoinGecko error");
        const data = await res.json();
        const btcPrices = data.prices.map((p: [number, number]) => p[1]);

        // Also fetch ETH
        const ethRes = await fetch(
          "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=30&interval=daily"
        );
        const ethData = ethRes.ok ? await ethRes.json() : null;
        const ethPrices = ethData?.prices?.map((p: [number, number]) => p[1]) || [];

        setSparklines({ btc: btcPrices, eth: ethPrices });
        setDataSource("CoinGecko (실시간 미니차트)");
      } catch {
        setDataSource("프리뷰 이미지");
      }
    }
    fetchSparklines();
  }, []);

  // Assign sparklines to relevant charts
  function getSparkline(chartId: string): number[] | undefined {
    if (chartId.includes("btc") || chartId.includes("bitcoin") || chartId.includes("risk") || chartId.includes("rsi") || chartId.includes("macd") || chartId.includes("mvrv") || chartId.includes("log") || chartId.includes("rainbow") || chartId.includes("s2f") || chartId.includes("power") || chartId.includes("golden") || chartId.includes("pi-cycle") || chartId.includes("200w") || chartId.includes("2y-ma") || chartId.includes("fear") || chartId.includes("nupl") || chartId.includes("reserve") || chartId.includes("bollinger") || chartId.includes("stoch") || chartId.includes("support") || chartId.includes("fibonacci") || chartId.includes("momentum")) {
      return sparklines.btc;
    }
    if (chartId.includes("eth")) return sparklines.eth;
    return undefined;
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Crypto Charts</h1>
        <p className="text-muted-foreground mt-1">
          비트코인 및 암호화폐 차트 라이브러리 - 리스크, 회귀 모델, 기술적 분석, 모멘텀
        </p>
        <div className="mt-1.5">
          {dataSource.includes("CoinGecko") ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> {dataSource}
            </span>
          ) : dataSource !== "loading" ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> {dataSource}
            </span>
          ) : null}
        </div>
      </div>

      {categories.map((cat) => {
        const charts = getChartsBySection("crypto", cat);
        return (
          <section key={cat}>
            <h2 className="text-lg font-semibold mb-4">{cat}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {charts.map((chart) => (
                <ChartCard key={chart.id} chart={chart} sparkline={getSparkline(chart.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
