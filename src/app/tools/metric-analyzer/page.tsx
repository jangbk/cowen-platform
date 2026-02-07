"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Layers, BarChart3, Loader2 } from "lucide-react";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Metric definitions
// ---------------------------------------------------------------------------
interface MetricDef {
  id: string;
  name: string;
  category: string;
}

const METRICS: MetricDef[] = [
  { id: "mvrv-z", name: "MVRV Z-Score", category: "On-Chain" },
  { id: "nupl", name: "NUPL", category: "On-Chain" },
  { id: "sopr", name: "SOPR", category: "On-Chain" },
  { id: "reserve-risk", name: "Reserve Risk", category: "On-Chain" },
  { id: "puell", name: "Puell Multiple", category: "On-Chain" },
  { id: "rsi-14", name: "RSI (14D)", category: "Technical" },
  { id: "macd", name: "MACD", category: "Technical" },
  { id: "stoch-rsi", name: "Stochastic RSI", category: "Technical" },
  { id: "fear-greed", name: "Fear & Greed", category: "Sentiment" },
  { id: "funding", name: "Funding Rate", category: "Derivatives" },
  { id: "dxy", name: "US Dollar Index", category: "Macro" },
  { id: "btc-price", name: "BTC Price", category: "Price" },
];

// Generate deterministic metric time series
function generateMetricData(
  metricId: string,
  days: number
): Array<{ time: string; value: number }> {
  let seed = 0;
  for (let i = 0; i < metricId.length; i++) seed = ((seed << 5) - seed + metricId.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const base: Record<string, number> = {
    "mvrv-z": 2, "nupl": 0.5, "sopr": 1.02, "reserve-risk": 0.003,
    "puell": 1.2, "rsi-14": 55, "macd": 0.5, "stoch-rsi": 0.6,
    "fear-greed": 55, "funding": 0.01, "dxy": 104, "btc-price": 60000,
  };
  const vol: Record<string, number> = {
    "mvrv-z": 0.15, "nupl": 0.05, "sopr": 0.008, "reserve-risk": 0.001,
    "puell": 0.1, "rsi-14": 5, "macd": 0.2, "stoch-rsi": 0.08,
    "fear-greed": 8, "funding": 0.005, "dxy": 0.8, "btc-price": 3000,
  };

  const b = base[metricId] || 50;
  const v = vol[metricId] || 5;
  const data: Array<{ time: string; value: number }> = [];
  let val = b;
  const now = new Date();

  for (let d = days; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    val += Math.sin(d * 0.06 + seed) * v * 0.3 + Math.sin(d * 0.02 + seed * 2) * v * 0.5;
    val = Math.max(b * 0.1, val);
    data.push({
      time: date.toISOString().split("T")[0],
      value: Math.round(val * 10000) / 10000,
    });
  }
  return data;
}

// Moving average
function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
}

// Cross detection
function detectCrosses(
  fast: (number | null)[],
  slow: (number | null)[]
): Array<{ index: number; type: "golden" | "death" }> {
  const crosses: Array<{ index: number; type: "golden" | "death" }> = [];
  for (let i = 1; i < fast.length; i++) {
    if (fast[i] == null || fast[i - 1] == null || slow[i] == null || slow[i - 1] == null) continue;
    const prevAbove = fast[i - 1]! > slow[i - 1]!;
    const currAbove = fast[i]! > slow[i]!;
    if (!prevAbove && currAbove) crosses.push({ index: i, type: "golden" });
    if (prevAbove && !currAbove) crosses.push({ index: i, type: "death" });
  }
  return crosses;
}

// Forward returns
function computeForwardReturns(
  values: number[],
  eventIndices: number[],
  periods: number[]
): Record<string, { avg: number; median: number; positive: number; count: number }> {
  const result: Record<string, { avg: number; median: number; positive: number; count: number }> = {};

  for (const p of periods) {
    const returns: number[] = [];
    for (const idx of eventIndices) {
      if (idx + p < values.length) {
        const ret = ((values[idx + p] - values[idx]) / values[idx]) * 100;
        returns.push(ret);
      }
    }
    if (returns.length === 0) {
      result[p.toString()] = { avg: 0, median: 0, positive: 0, count: 0 };
    } else {
      const sorted = [...returns].sort((a, b) => a - b);
      result[p.toString()] = {
        avg: returns.reduce((s, r) => s + r, 0) / returns.length,
        median: sorted[Math.floor(sorted.length / 2)],
        positive: (returns.filter((r) => r > 0).length / returns.length) * 100,
        count: returns.length,
      };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MetricAnalyzerPage() {
  const [primaryMetric, setPrimaryMetric] = useState("mvrv-z");
  const [compareMetric, setCompareMetric] = useState("btc-price");
  const [fastPeriod, setFastPeriod] = useState(20);
  const [slowPeriod, setSlowPeriod] = useState(50);
  const [lookbackDays, setLookbackDays] = useState(730);

  const primaryName = METRICS.find((m) => m.id === primaryMetric)?.name || primaryMetric;
  const compareName = METRICS.find((m) => m.id === compareMetric)?.name || compareMetric;

  const primaryData = useMemo(
    () => generateMetricData(primaryMetric, lookbackDays),
    [primaryMetric, lookbackDays]
  );

  const compareData = useMemo(
    () => generateMetricData(compareMetric, lookbackDays),
    [compareMetric, lookbackDays]
  );

  // MA cross analysis on primary metric
  const crossAnalysis = useMemo(() => {
    const values = primaryData.map((d) => d.value);
    const fastMA = sma(values, fastPeriod);
    const slowMA = sma(values, slowPeriod);
    const crosses = detectCrosses(fastMA, slowMA);

    const goldenIndices = crosses.filter((c) => c.type === "golden").map((c) => c.index);
    const deathIndices = crosses.filter((c) => c.type === "death").map((c) => c.index);

    // Forward returns for compare metric (e.g., BTC price) after cross events
    const compareValues = compareData.map((d) => d.value);
    const periods = [1, 7, 30, 90, 180, 365];

    const goldenReturns = computeForwardReturns(compareValues, goldenIndices, periods);
    const deathReturns = computeForwardReturns(compareValues, deathIndices, periods);

    return {
      crosses,
      goldenCount: goldenIndices.length,
      deathCount: deathIndices.length,
      goldenReturns,
      deathReturns,
      periods,
    };
  }, [primaryData, compareData, fastPeriod, slowPeriod]);

  // Correlation
  const correlation = useMemo(() => {
    if (primaryData.length !== compareData.length) return 0;
    const n = primaryData.length;
    const xVals = primaryData.map((d) => d.value);
    const yVals = compareData.map((d) => d.value);
    const xMean = xVals.reduce((s, v) => s + v, 0) / n;
    const yMean = yVals.reduce((s, v) => s + v, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xVals[i] - xMean;
      const dy = yVals[i] - yMean;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den > 0 ? num / den : 0;
  }, [primaryData, compareData]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Metric Analyzer</h1>
        </div>
        <p className="text-muted-foreground">
          지표 간 상관관계 분석 + 이동평균 크로스 분석 + Forward Returns 테이블
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="text-[10px] text-muted-foreground">Primary Metric</label>
          <select
            value={primaryMetric}
            onChange={(e) => setPrimaryMetric(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
          >
            {METRICS.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.category})</option>)}
          </select>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="text-[10px] text-muted-foreground">Compare With</label>
          <select
            value={compareMetric}
            onChange={(e) => setCompareMetric(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
          >
            {METRICS.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.category})</option>)}
          </select>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="text-[10px] text-muted-foreground">Fast MA</label>
          <input type="number" value={fastPeriod} onChange={(e) => setFastPeriod(parseInt(e.target.value) || 10)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="text-[10px] text-muted-foreground">Slow MA</label>
          <input type="number" value={slowPeriod} onChange={(e) => setSlowPeriod(parseInt(e.target.value) || 30)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="text-[10px] text-muted-foreground">Lookback (일)</label>
          <select value={lookbackDays} onChange={(e) => setLookbackDays(parseInt(e.target.value))} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs">
            <option value="365">1년</option>
            <option value="730">2년</option>
            <option value="1460">4년</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">상관관계</p>
          <p className={`text-lg font-bold ${correlation >= 0 ? "text-green-500" : "text-red-500"}`}>
            {correlation >= 0 ? "+" : ""}{correlation.toFixed(3)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {Math.abs(correlation) > 0.6 ? "Strong" : Math.abs(correlation) > 0.3 ? "Moderate" : "Weak"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">Golden Crosses</p>
          <p className="text-lg font-bold text-green-500">{crossAnalysis.goldenCount}회</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">Death Crosses</p>
          <p className="text-lg font-bold text-red-500">{crossAnalysis.deathCount}회</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">분석 기간</p>
          <p className="text-lg font-bold">{lookbackDays}일</p>
        </div>
      </div>

      {/* Primary Metric Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">{primaryName}</h3>
        <LightweightChartWrapper
          data={primaryData}
          type="line"
          color="#2962FF"
          height={280}
          showGrid
        />
      </div>

      {/* Compare Metric Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">{compareName}</h3>
        <LightweightChartWrapper
          data={compareData}
          type="area"
          color="#10b981"
          height={280}
          showGrid
        />
      </div>

      {/* Forward Returns Table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">
          Forward Returns ({compareName} after {primaryName} MA Cross)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">이벤트</th>
                {crossAnalysis.periods.map((p) => (
                  <th key={p} className="px-3 py-2 text-center font-medium text-muted-foreground">
                    {p}일
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Golden Cross */}
              <tr className="border-b border-border">
                <td colSpan={crossAnalysis.periods.length + 1} className="px-3 py-1.5 text-[10px] font-semibold text-green-500 bg-green-500/5">
                  Golden Cross ({crossAnalysis.goldenCount}회) - 평균 수익률 (%)
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-3 py-2 font-medium">평균</td>
                {crossAnalysis.periods.map((p) => {
                  const r = crossAnalysis.goldenReturns[p.toString()];
                  return (
                    <td key={p} className={`px-3 py-2 text-center font-mono ${r && r.avg >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {r ? `${r.avg >= 0 ? "+" : ""}${r.avg.toFixed(1)}%` : "-"}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-border">
                <td className="px-3 py-2 font-medium">승률</td>
                {crossAnalysis.periods.map((p) => {
                  const r = crossAnalysis.goldenReturns[p.toString()];
                  return (
                    <td key={p} className="px-3 py-2 text-center font-mono text-muted-foreground">
                      {r && r.count > 0 ? `${r.positive.toFixed(0)}%` : "-"}
                    </td>
                  );
                })}
              </tr>

              {/* Death Cross */}
              <tr className="border-b border-border">
                <td colSpan={crossAnalysis.periods.length + 1} className="px-3 py-1.5 text-[10px] font-semibold text-red-500 bg-red-500/5">
                  Death Cross ({crossAnalysis.deathCount}회) - 평균 수익률 (%)
                </td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-3 py-2 font-medium">평균</td>
                {crossAnalysis.periods.map((p) => {
                  const r = crossAnalysis.deathReturns[p.toString()];
                  return (
                    <td key={p} className={`px-3 py-2 text-center font-mono ${r && r.avg >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {r ? `${r.avg >= 0 ? "+" : ""}${r.avg.toFixed(1)}%` : "-"}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-border">
                <td className="px-3 py-2 font-medium">승률</td>
                {crossAnalysis.periods.map((p) => {
                  const r = crossAnalysis.deathReturns[p.toString()];
                  return (
                    <td key={p} className="px-3 py-2 text-center font-mono text-muted-foreground">
                      {r && r.count > 0 ? `${r.positive.toFixed(0)}%` : "-"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Correlation Table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">상관관계 매트릭스 (vs {compareName})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">지표</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">상관관계</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">강도</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">카테고리</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.filter((m) => m.id !== compareMetric)
                .map((m) => {
                  // Quick correlation estimation
                  const data1 = generateMetricData(m.id, 365);
                  const data2 = generateMetricData(compareMetric, 365);
                  const n = Math.min(data1.length, data2.length);
                  const x = data1.slice(0, n).map((d) => d.value);
                  const y = data2.slice(0, n).map((d) => d.value);
                  const xm = x.reduce((s, v) => s + v, 0) / n;
                  const ym = y.reduce((s, v) => s + v, 0) / n;
                  let num2 = 0, dx2 = 0, dy2 = 0;
                  for (let i = 0; i < n; i++) {
                    num2 += (x[i] - xm) * (y[i] - ym);
                    dx2 += (x[i] - xm) ** 2;
                    dy2 += (y[i] - ym) ** 2;
                  }
                  const corr2 = Math.sqrt(dx2 * dy2) > 0 ? num2 / Math.sqrt(dx2 * dy2) : 0;

                  return { ...m, corr: corr2 };
                })
                .sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr))
                .map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${row.corr >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {row.corr >= 0 ? "+" : ""}{row.corr.toFixed(3)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="h-2 w-16 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${Math.abs(row.corr) > 0.6 ? "bg-green-500" : Math.abs(row.corr) > 0.3 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${Math.abs(row.corr) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-12">
                          {Math.abs(row.corr) > 0.6 ? "Strong" : Math.abs(row.corr) > 0.3 ? "Moderate" : "Weak"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
