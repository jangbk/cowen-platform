"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Star,
  Share2,
  Maximize2,
  Loader2,
} from "lucide-react";
import { getChartById, CHART_CATALOG } from "@/data/chart-catalog";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "All"] as const;

export default function ChartDetailPage() {
  const params = useParams();
  const chartId = typeof params.chartId === "string" ? params.chartId : "";
  const chart = getChartById(chartId);

  const [period, setPeriod] = useState<string>("1Y");
  const [scaleType, setScaleType] = useState<"linear" | "log">("linear");
  const [isFavorited, setIsFavorited] = useState(false);
  const [chartData, setChartData] = useState<
    Array<{ time: string; value: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Fallback title from URL slug
  const chartTitle =
    chart?.title ||
    chartId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const chartColor = chart?.color || "#2962FF";
  const backHref = chart
    ? `/charts/${chart.section}`
    : "/charts/crypto";

  // Fetch data from API or generate sample
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      if (chart?.apiEndpoint) {
        try {
          const params = new URLSearchParams(chart.apiParams || {});
          const res = await fetch(`${chart.apiEndpoint}?${params}`);
          const json = await res.json();

          if (json.data && Array.isArray(json.data)) {
            // Market cap format: [[ts, val], ...]
            if (Array.isArray(json.data[0])) {
              setChartData(
                json.data.map(([ts, val]: [number, number]) => ({
                  time: new Date(ts).toISOString().split("T")[0],
                  value: val,
                }))
              );
            }
            // Macro format: [{date, value}, ...]
            else if (json.data[0]?.date) {
              setChartData(
                json.data.map((d: { date: string; value: string }) => ({
                  time: d.date,
                  value: parseFloat(d.value),
                }))
              );
            }
          } else if (json.withStables?.data) {
            setChartData(
              json.withStables.data.map(([ts, val]: [number, number]) => ({
                time: new Date(ts).toISOString().split("T")[0],
                value: val,
              }))
            );
          }
        } catch {
          generateSampleData();
        }
      } else {
        generateSampleData();
      }

      setLoading(false);
    }

    function generateSampleData() {
      // Generate deterministic sample data based on chartId
      let hash = 0;
      for (let i = 0; i < chartId.length; i++) {
        hash = ((hash << 5) - hash + chartId.charCodeAt(i)) | 0;
      }
      hash = Math.abs(hash);

      const days = period === "1M" ? 30 : period === "3M" ? 90 : period === "6M" ? 180 : period === "2Y" ? 730 : period === "All" ? 1460 : 365;
      const data: Array<{ time: string; value: number }> = [];
      let value = 100 + (hash % 900);
      const now = new Date();

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const noise =
          Math.sin(i * 0.05 + hash) * 10 +
          Math.sin(i * 0.02 + hash * 2) * 20 +
          (Math.random() - 0.5) * 5;
        value = Math.max(10, value + noise * 0.1);
        data.push({
          time: date.toISOString().split("T")[0],
          value: Math.round(value * 100) / 100,
        });
      }
      setChartData(data);
    }

    fetchData();
  }, [chartId, chart, period]);

  // Statistics from data
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const values = chartData.map((d) => d.value);
    const current = values[values.length - 1];
    const first = values[0];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = ((current - first) / first) * 100;

    return {
      current,
      high,
      low,
      change,
      startDate: chartData[0].time,
      endDate: chartData[chartData.length - 1].time,
    };
  }, [chartData]);

  // Related charts
  const relatedCharts = chart
    ? CHART_CATALOG.filter(
        (c) =>
          c.section === chart.section &&
          c.category === chart.category &&
          c.id !== chart.id
      ).slice(0, 4)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{chartTitle}</h1>
            {chart && (
              <p className="text-sm text-muted-foreground">
                {chart.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorited(!isFavorited)}
            className="rounded-md border border-border p-2 hover:bg-muted transition-colors"
          >
            <Star
              className={`h-4 w-4 ${isFavorited ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-border" />
        <select
          value={scaleType}
          onChange={(e) =>
            setScaleType(e.target.value as "linear" | "log")
          }
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="linear">Linear</option>
          <option value="log">Logarithmic</option>
        </select>
        {chart && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: chart.color }}
            />
            <span className="text-xs text-muted-foreground">
              {chart.section.toUpperCase()} · {chart.category}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        {loading ? (
          <div className="h-[480px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <LightweightChartWrapper
            data={chartData}
            type={chart?.chartType === "area" ? "area" : "line"}
            color={chartColor}
            height={480}
            showGrid
            logarithmic={scaleType === "log"}
          />
        )}
      </div>

      {/* Description & Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">About This Chart</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {chart?.description ||
              `${chartTitle} 차트입니다. 기간 선택, 스케일 타입(선형/로그) 변경, 즐겨찾기 등의 기능을 사용할 수 있습니다.`}
          </p>
          {chart && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.section}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.category}
              </span>
              {chart.subcategory && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {chart.subcategory}
                </span>
              )}
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.chartType}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Key Statistics</h2>
          {stats ? (
            <dl className="space-y-3">
              {[
                {
                  label: "Current",
                  value: stats.current.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Period High",
                  value: stats.high.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Period Low",
                  value: stats.low.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Change",
                  value: `${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)}%`,
                  color:
                    stats.change >= 0
                      ? "text-positive"
                      : "text-negative",
                },
                { label: "Start Date", value: stats.startDate },
                { label: "End Date", value: stats.endDate },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between"
                >
                  <dt className="text-sm text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd
                    className={`text-sm font-semibold ${"color" in stat ? stat.color : ""}`}
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </div>
      </div>

      {/* Related Charts */}
      {relatedCharts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Related Charts</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedCharts.map((rc) => (
              <Link
                key={rc.id}
                href={`/charts/${rc.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="h-12 mb-2 rounded-md bg-muted/30 overflow-hidden">
                  <div
                    className="h-full w-full opacity-30"
                    style={{ backgroundColor: rc.color }}
                  />
                </div>
                <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {rc.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {rc.category}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
