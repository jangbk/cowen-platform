"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ExternalLink, RefreshCw, Play, ChevronRight } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import SparklineChart from "@/components/ui/SparklineChart";
import {
  formatCurrency,
  formatPercent,
  formatCompactNumber,
} from "@/lib/formatters";

// Dynamic import for Lightweight Charts (needs window object)
const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// ─── Types ───────────────────────────────────────────────────────
interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d: { price: number[] };
}

interface MarketCapData {
  data: Array<[number, number]>;
  trendline?: { slope: number; intercept: number; r2: number };
}

interface DominanceData {
  withStables: { data: Array<[number, number]>; current: number };
  withoutStables: { data: Array<[number, number]>; current: number };
}

interface MacroData {
  data: Array<{ date: string; value: string }>;
  label: string;
  unit: string;
}

// ─── Skeleton ────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="h-48 rounded bg-muted/50 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      차트 로딩 중...
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Macro Calendar Data ─────────────────────────────────────────
const MACRO_CALENDAR = [
  { name: "비농업 고용 변동", date: "금 22:30", prev: "256K", forecast: "170K", importance: "high" },
  { name: "실업률", date: "금 22:30", prev: "4.1%", forecast: "4.1%", importance: "high" },
  { name: "미시간 소비자 심리지수", date: "토 0:00", prev: "64.7", forecast: "68.0", importance: "medium" },
  { name: "CPI (전년비)", date: "수 22:30", prev: "2.9%", forecast: "2.8%", importance: "high" },
  { name: "소매 판매 MoM", date: "금 22:30", prev: "0.4%", forecast: "0.3%", importance: "medium" },
];

// ─── Main Dashboard ──────────────────────────────────────────────
export default function DashboardPage() {
  // State
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const [mcapTab, setMcapTab] = useState<"total" | "btc" | "eth">("total");
  const [mcapData, setMcapData] = useState<MarketCapData | null>(null);
  const [mcapLoading, setMcapLoading] = useState(true);

  const [domTab, setDomTab] = useState<"btc" | "eth">("btc");
  const [domData, setDomData] = useState<DominanceData | null>(null);
  const [domLoading, setDomLoading] = useState(true);

  const [riskTab, setRiskTab] = useState("BTC");
  const [macroTab, setMacroTab] = useState("unemployment");
  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [macroLoading, setMacroLoading] = useState(true);

  // ─── Fetch crypto prices ───────────────────────────────────────
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/crypto/prices");
        const json = await res.json();
        setAssets(json.data || []);
      } catch {
        console.error("Failed to fetch prices");
      } finally {
        setAssetsLoading(false);
      }
    }
    fetchPrices();
  }, []);

  // ─── Fetch market cap ─────────────────────────────────────────
  useEffect(() => {
    async function fetchMcap() {
      setMcapLoading(true);
      try {
        const res = await fetch(`/api/crypto/market-cap?type=${mcapTab}`);
        const json = await res.json();
        setMcapData(json);
      } catch {
        console.error("Failed to fetch market cap");
      } finally {
        setMcapLoading(false);
      }
    }
    fetchMcap();
  }, [mcapTab]);

  // ─── Fetch dominance ──────────────────────────────────────────
  useEffect(() => {
    async function fetchDom() {
      setDomLoading(true);
      try {
        const res = await fetch(`/api/crypto/dominance?type=${domTab}`);
        const json = await res.json();
        setDomData(json);
      } catch {
        console.error("Failed to fetch dominance");
      } finally {
        setDomLoading(false);
      }
    }
    fetchDom();
  }, [domTab]);

  // ─── Fetch macro data ─────────────────────────────────────────
  useEffect(() => {
    async function fetchMacro() {
      setMacroLoading(true);
      try {
        const res = await fetch(`/api/macro/indicators?indicator=${macroTab}`);
        const json = await res.json();
        setMacroData(json);
      } catch {
        console.error("Failed to fetch macro");
      } finally {
        setMacroLoading(false);
      }
    }
    fetchMacro();
  }, [macroTab]);

  // ─── Transform data for charts ────────────────────────────────
  const mcapChartData = useMemo(() => {
    if (!mcapData?.data) return [];
    return mcapData.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [mcapData]);

  const domChartData = useMemo(() => {
    if (!domData?.withStables?.data) return [];
    return domData.withStables.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [domData]);

  const macroChartData = useMemo(() => {
    if (!macroData?.data) return [];
    return macroData.data.map((d) => ({
      time: d.date,
      value: parseFloat(d.value),
    }));
  }, [macroData]);

  // Latest market cap value
  const latestMcap = mcapData?.data?.length
    ? mcapData.data[mcapData.data.length - 1][1]
    : 0;

  // Risk sample data (simulated based on tab)
  const riskValues: Record<string, number> = {
    TOTAL: 0.306, TOTAL6: 0.285, BTC: 0.386, "BTC.D": 0.512,
    ETH: 0.424, BNB: 0.295, SOL: 0.326, XRP: 0.428,
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ──── Main Content ──────────────────────────────────── */}
        <div className="space-y-6">
          {/* Favorite Assets Table */}
          <section className="rounded-lg border border-border bg-card p-3 sm:p-4" aria-label="주요 자산">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Favorite Assets</h2>
              <button
                onClick={() => {
                  setAssetsLoading(true);
                  fetch("/api/crypto/prices")
                    .then((r) => r.json())
                    .then((j) => setAssets(j.data || []))
                    .finally(() => setAssetsLoading(false));
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${assetsLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
            </div>
            {assetsLoading ? (
              <TableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4 text-right">Price</th>
                      <th className="pb-3 pr-4 text-right">24h %</th>
                      <th className="pb-3 pr-4 text-right">7d %</th>
                      <th className="pb-3 pr-4 text-right">Market Cap</th>
                      <th className="pb-3 text-right">Last 7 Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.slice(0, 20).map((asset, i) => (
                      <tr
                        key={asset.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {asset.image ? (
                              <img
                                src={asset.image}
                                alt={asset.symbol}
                                className="h-6 w-6 rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-primary/20" />
                            )}
                            <span className="font-medium">{asset.name}</span>
                            <span className="text-xs text-muted-foreground uppercase">
                              {asset.symbol}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {formatCurrency(asset.current_price)}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-mono ${
                            asset.price_change_percentage_24h >= 0
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {formatPercent(asset.price_change_percentage_24h)}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-mono ${
                            (asset.price_change_percentage_7d_in_currency ?? 0) >= 0
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {formatPercent(
                            asset.price_change_percentage_7d_in_currency ?? 0
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {formatCurrency(asset.market_cap, 0)}
                        </td>
                        <td className="py-3 text-right">
                          {asset.sparkline_in_7d?.price ? (
                            <SparklineChart
                              data={asset.sparkline_in_7d.price}
                              width={80}
                              height={32}
                            />
                          ) : (
                            <div className="inline-block h-8 w-20 rounded bg-muted" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Risk Gauges */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Crypto Risk */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Crypto Risk Indicators</h3>
                <Link
                  href="/crypto/indicators"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-col items-center py-4">
                <GaugeChart
                  value={0.117}
                  label="Crypto Risk Summary"
                  size="md"
                  subMetrics={[
                    { label: "Summary", value: 0.117, color: "#3b82f6" },
                    { label: "Price", value: 0.075, color: "#f97316" },
                    { label: "On-Chain", value: 0.238, color: "#10b981" },
                    { label: "Social", value: 0.037, color: "#8b5cf6" },
                  ]}
                />
              </div>
            </section>

            {/* Macro Recession Risk */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Macro Recession Risk</h3>
                <Link
                  href="/macro/indicators"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-col items-center py-4">
                <GaugeChart
                  value={0.071}
                  label="Recession Risk Summary"
                  size="md"
                  subMetrics={[
                    { label: "Employment", value: 0.071, color: "#3b82f6" },
                    { label: "Nat'l Income", value: 0.092, color: "#ef4444" },
                    { label: "Production", value: 0.028, color: "#10b981" },
                  ]}
                />
              </div>
            </section>
          </div>

          {/* Market Cap & Dominance Charts */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Market Cap */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {(["total", "btc", "eth"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMcapTab(tab)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        mcapTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab === "total" ? "Total" : tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                CMC: {formatCurrency(latestMcap, 0)}
                {mcapData?.trendline &&
                  ` - R²: ${mcapData.trendline.r2.toFixed(3)}`}
              </p>
              {mcapLoading ? (
                <ChartSkeleton />
              ) : (
                <LightweightChartWrapper
                  data={mcapChartData}
                  type="area"
                  color="#2962FF"
                  height={200}
                  showGrid
                  logarithmic
                />
              )}
            </section>

            {/* Dominance */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {(["btc", "eth"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDomTab(tab)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        domTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab.toUpperCase()}.D
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {domData
                  ? `With Stables: ${domData.withStables.current.toFixed(2)}% · Without Stables: ${domData.withoutStables.current.toFixed(2)}%`
                  : "Loading..."}
              </p>
              {domLoading ? (
                <ChartSkeleton />
              ) : (
                <LightweightChartWrapper
                  data={domChartData}
                  type="area"
                  color="#E040FB"
                  height={200}
                  showGrid
                />
              )}
            </section>
          </div>

          {/* Risk per Asset & Macro Indicators */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Risk per Asset */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
                {Object.keys(riskValues).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRiskTab(tab)}
                    className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${
                      riskTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Current risk: {riskValues[riskTab]?.toFixed(3)}
              </p>
              <div className="flex flex-col items-center py-4">
                <GaugeChart
                  value={riskValues[riskTab] ?? 0.3}
                  label={`${riskTab} Fiat Risk`}
                  size="lg"
                />
              </div>
            </section>

            {/* Macro Indicators */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
                {[
                  { key: "unemployment", label: "실업률" },
                  { key: "inflation", label: "인플레이션" },
                  { key: "rgdp", label: "RGDP" },
                  { key: "fedfunds", label: "기준금리" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setMacroTab(tab.key)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                      macroTab === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {macroData
                  ? `Latest: ${macroData.data[macroData.data.length - 1]?.value}${macroData.unit} (${macroData.data[macroData.data.length - 1]?.date})`
                  : "Loading..."}
              </p>
              {macroLoading ? (
                <ChartSkeleton />
              ) : (
                <LightweightChartWrapper
                  data={macroChartData}
                  type="line"
                  color={
                    macroTab === "unemployment"
                      ? "#ef4444"
                      : macroTab === "inflation"
                        ? "#f97316"
                        : macroTab === "fedfunds"
                          ? "#8b5cf6"
                          : "#10b981"
                  }
                  height={200}
                  showGrid
                />
              )}
            </section>
          </div>
        </div>

        {/* ──── Right Sidebar ─────────────────────────────────── */}
        <aside className="space-y-6">
          {/* Latest Video */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Latest Video</h3>
            <Link href="/content/video-summaries" className="block group">
              <div className="relative aspect-video rounded-lg bg-slate-800 overflow-hidden">
                <img
                  src="https://img.youtube.com/vi/eAzoXY1GfIo/mqdefault.jpg"
                  alt="Latest video thumbnail"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm font-medium group-hover:text-primary transition-colors">
                Bitcoin: Dubious Speculation
              </p>
              <p className="text-xs text-muted-foreground">Benjamin Cowen</p>
            </Link>
          </section>

          {/* Macro Calendar */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">매크로 캘린더</h3>
              <Link
                href="/macro/calendar"
                className="text-xs text-primary hover:underline"
              >
                더보기
              </Link>
            </div>
            <div className="space-y-3">
              {MACRO_CALENDAR.map((event) => (
                <div
                  key={event.name}
                  className="border-b border-border/50 pb-2 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          event.importance === "high"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <span className="text-sm font-medium">{event.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {event.date}
                    </span>
                  </div>
                  <div className="mt-1 ml-3 text-xs text-muted-foreground">
                    이전: {event.prev}
                    {event.forecast && ` · 예상: ${event.forecast}`}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Fear & Greed */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Fear & Greed Index</h3>
            <div className="flex flex-col items-center">
              <GaugeChart value={0.21} label="Extreme Fear" size="sm" />
            </div>
          </section>

          {/* Quick Links */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Quick Links</h3>
            <div className="space-y-1">
              {[
                { label: "Event Calendar", href: "/crypto/events" },
                { label: "Bot Performance", href: "/tools/bot-performance" },
                { label: "Backtest", href: "/tools/backtest" },
                { label: "Video Summaries", href: "/content/video-summaries" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
