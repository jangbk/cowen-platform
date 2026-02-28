"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Layers, Loader2, Info, ChevronDown, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";

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
  realData?: boolean; // true if computed from real price data
  refUrl?: string; // URL to check live value manually
}

const METRICS: MetricDef[] = [
  { id: "btc-price", name: "BTC Price", category: "Price", realData: true },
  { id: "rsi-14", name: "RSI (14D)", category: "Technical", realData: true },
  { id: "macd", name: "MACD Histogram", category: "Technical", realData: true },
  { id: "bb-width", name: "Bollinger Band Width", category: "Technical", realData: true },
  { id: "volatility", name: "30D Volatility", category: "Technical", realData: true },
  { id: "mvrv-z", name: "MVRV Z-Score", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/mvrv-zscore/" },
  { id: "nupl", name: "NUPL", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/relative-unrealized-profit--loss/" },
  { id: "sopr", name: "SOPR", category: "On-Chain", refUrl: "https://www.coinglass.com/pro/i/sopr" },
  { id: "reserve-risk", name: "Reserve Risk", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/reserve-risk/" },
  { id: "puell", name: "Puell Multiple", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/puell-multiple/" },
  { id: "fear-greed", name: "Fear & Greed", category: "Sentiment", refUrl: "https://alternative.me/crypto/fear-and-greed-index/" },
  { id: "funding", name: "Funding Rate", category: "Derivatives", refUrl: "https://www.coinglass.com/FundingRate" },
  { id: "dxy", name: "US Dollar Index", category: "Macro", refUrl: "https://www.tradingview.com/symbols/TVC-DXY/" },
];

// ---------------------------------------------------------------------------
// Technical indicator calculators (from real price data)
// ---------------------------------------------------------------------------
function calcRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (prices.length < period + 1) return prices.map(() => 50);

  let gainSum = 0, lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gainSum += diff; else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  for (let i = 0; i < period; i++) rsi.push(50);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(Math.round((100 - 100 / (1 + rs2)) * 100) / 100);
  }
  return rsi;
}

function calcMACD(prices: number[]): number[] {
  const ema = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  };
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(macdLine, 9);
  return macdLine.map((v, i) => Math.round((v - signal[i]) * 100) / 100);
}

function calcBBWidth(prices: number[], period: number = 20): number[] {
  return prices.map((_, i) => {
    if (i < period - 1) return 0;
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return mean > 0 ? Math.round((4 * std / mean) * 10000) / 10000 : 0;
  });
}

function calcVolatility(prices: number[], period: number = 30): number[] {
  return prices.map((_, i) => {
    if (i < period) return 0;
    const slice = prices.slice(i - period, i + 1);
    const returns = slice.slice(1).map((p, j) => Math.log(p / slice[j]));
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
    return Math.round(std * Math.sqrt(365) * 10000) / 10000;
  });
}

// Generate deterministic simulated data for on-chain/sentiment metrics
function generateMetricData(
  metricId: string,
  days: number
): Array<{ time: string; value: number }> {
  let seed = 0;
  for (let i = 0; i < metricId.length; i++) seed = ((seed << 5) - seed + metricId.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const base: Record<string, number> = {
    "mvrv-z": 2, "nupl": 0.5, "sopr": 1.02, "reserve-risk": 0.003,
    "puell": 1.2, "fear-greed": 55, "funding": 0.01, "dxy": 104,
  };
  const vol: Record<string, number> = {
    "mvrv-z": 0.15, "nupl": 0.05, "sopr": 0.008, "reserve-risk": 0.001,
    "puell": 0.1, "fear-greed": 8, "funding": 0.005, "dxy": 0.8,
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

// Mapping: metric-analyzer id → weighted-risk metric name
const METRIC_TO_RISK_NAME: Record<string, string> = {
  "mvrv-z": "MVRV Z-Score",
  "nupl": "NUPL",
  "sopr": "SOPR",
  "reserve-risk": "Reserve Risk",
  "puell": "Puell Multiple",
};

// Read weighted-risk manual input value from localStorage
function getWeightedRiskValue(metricId: string): number | null {
  if (typeof window === "undefined") return null;
  const riskName = METRIC_TO_RISK_NAME[metricId];
  if (!riskName) return null;
  try {
    const raw = localStorage.getItem("weighted-risk-metrics");
    if (!raw) return null;
    const metrics: Array<{ name: string; value: number; live?: boolean }> = JSON.parse(raw);
    const found = metrics.find((m) => m.name === riskName);
    if (!found || found.live) return null; // skip live-fetched values
    return found.value;
  } catch {
    return null;
  }
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
  const [primaryMetric, setPrimaryMetric] = useState("rsi-14");
  const [compareMetric, setCompareMetric] = useState("btc-price");
  const [fastPeriod, setFastPeriod] = useState(20);
  const [slowPeriod, setSlowPeriod] = useState(50);
  const [lookbackDays, setLookbackDays] = useState(730);
  const [showGuide, setShowGuide] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);

  // Real price data
  const [realPrices, setRealPrices] = useState<Array<{ date: string; price: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("");

  // Manual values from weighted-risk page (localStorage)
  const [manualValues, setManualValues] = useState<Record<string, number>>({});

  const fetchRealData = useCallback(() => {
    setLoading(true);
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - lookbackDays);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = now.toISOString().split("T")[0];

    fetch(`/api/tools/dca-history?asset=BTC&from=${fromStr}&to=${toStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.prices && data.prices.length > 0) {
          setRealPrices(data.prices);
          setDataSource(data.source || "api");
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [lookbackDays]);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);

  // Load manual values from weighted-risk localStorage
  useEffect(() => {
    const values: Record<string, number> = {};
    for (const metricId of Object.keys(METRIC_TO_RISK_NAME)) {
      const val = getWeightedRiskValue(metricId);
      if (val !== null) values[metricId] = val;
    }
    setManualValues(values);
  }, []);

  // Compute derived metrics from real price data
  const derivedMetrics = useMemo(() => {
    if (realPrices.length === 0) return {};

    const prices = realPrices.map((p) => p.price);
    const dates = realPrices.map((p) => p.date);

    const rsi = calcRSI(prices, 14);
    const macd = calcMACD(prices);
    const bbWidth = calcBBWidth(prices, 20);
    const vol = calcVolatility(prices, 30);

    const toTimeSeries = (values: number[]) =>
      values.map((v, i) => ({ time: dates[i], value: v }));

    return {
      "btc-price": toTimeSeries(prices),
      "rsi-14": toTimeSeries(rsi),
      "macd": toTimeSeries(macd),
      "bb-width": toTimeSeries(bbWidth),
      "volatility": toTimeSeries(vol),
    } as Record<string, Array<{ time: string; value: number }>>;
  }, [realPrices]);

  // Get metric data — real if available, manual from weighted-risk, or simulated
  const getMetricData = useCallback(
    (metricId: string): Array<{ time: string; value: number }> => {
      if (derivedMetrics[metricId]) return derivedMetrics[metricId];
      const simData = generateMetricData(metricId, lookbackDays);
      // If weighted-risk has a manual value, replace the last data point
      if (manualValues[metricId] !== undefined) {
        const updated = [...simData];
        if (updated.length > 0) {
          updated[updated.length - 1] = { ...updated[updated.length - 1], value: manualValues[metricId] };
        }
        return updated;
      }
      return simData;
    },
    [derivedMetrics, lookbackDays, manualValues]
  );

  const primaryDef = METRICS.find((m) => m.id === primaryMetric);
  const compareDef = METRICS.find((m) => m.id === compareMetric);
  const primaryName = primaryDef?.name || primaryMetric;
  const compareName = compareDef?.name || compareMetric;
  const primaryIsReal = primaryDef?.realData;
  const compareIsReal = compareDef?.realData;

  const primaryData = useMemo(() => getMetricData(primaryMetric), [primaryMetric, getMetricData]);
  const compareData = useMemo(() => getMetricData(compareMetric), [compareMetric, getMetricData]);

  // MA cross analysis on primary metric
  const crossAnalysis = useMemo(() => {
    const values = primaryData.map((d) => d.value);
    const fastMA = sma(values, fastPeriod);
    const slowMA = sma(values, slowPeriod);
    const crosses = detectCrosses(fastMA, slowMA);

    const goldenIndices = crosses.filter((c) => c.type === "golden").map((c) => c.index);
    const deathIndices = crosses.filter((c) => c.type === "death").map((c) => c.index);

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
    const len = Math.min(primaryData.length, compareData.length);
    if (len < 10) return 0;
    const xVals = primaryData.slice(-len).map((d) => d.value);
    const yVals = compareData.slice(-len).map((d) => d.value);
    const xMean = xVals.reduce((s, v) => s + v, 0) / len;
    const yMean = yVals.reduce((s, v) => s + v, 0) / len;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < len; i++) {
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

      {/* Usage Guide */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            사용법 안내
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </button>
        {showGuide && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Metric Analyzer란?</h4>
              <p>
                다양한 시장 지표 간 <strong>상관관계</strong>를 분석하고,
                이동평균 <strong>골든/데스 크로스</strong> 이벤트 이후 가격 변화(Forward Returns)를 통계적으로 측정하는 도구입니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">1. 지표 선택</h4>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><strong>Primary Metric</strong>: 이동평균 크로스 분석의 대상 지표. 이 지표의 Fast/Slow MA 크로스를 감지합니다.</li>
                <li><strong>Compare With</strong>: Forward Returns 및 상관관계 분석의 기준 지표. 크로스 이벤트 이후 이 지표의 수익률을 측정합니다.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">2. 이동평균 크로스 분석</h4>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><strong>Golden Cross</strong>: Fast MA가 Slow MA를 상향 돌파 — 일반적으로 강세 신호</li>
                <li><strong>Death Cross</strong>: Fast MA가 Slow MA를 하향 돌파 — 일반적으로 약세 신호</li>
                <li>Fast/Slow MA 기간을 조절하여 민감도를 변경할 수 있습니다 (짧을수록 민감)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">3. Forward Returns 테이블</h4>
              <p>
                크로스 이벤트 발생 후 1일, 7일, 30일, 90일, 180일, 365일 후의
                <strong> 평균 수익률</strong>과 <strong>승률</strong>(양수 수익 비율)을 표시합니다.
                과거 패턴이 반복될지는 보장되지 않습니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">4. 상관관계 매트릭스</h4>
              <p>
                모든 지표와 Compare 지표 간 <strong>피어슨 상관계수</strong>를 계산합니다.
                +1에 가까우면 같은 방향, -1에 가까우면 반대 방향, 0에 가까우면 무관합니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Data Status */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${realPrices.length > 0 ? "bg-green-500" : "bg-yellow-500"}`} />
            <span>
              BTC 가격 데이터: {realPrices.length > 0
                ? `${dataSource} (${realPrices.length.toLocaleString()}일)`
                : "로드 실패"}
              {realPrices.length > 0 && ` | ${realPrices[0].date} ~ ${realPrices[realPrices.length - 1].date}`}
            </span>
          </div>
          <button
            onClick={fetchRealData}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted text-xs"
          >
            <RefreshCw className="h-3 w-3" /> 새로고침
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="text-[10px] text-muted-foreground">Primary Metric</label>
          <select
            value={primaryMetric}
            onChange={(e) => setPrimaryMetric(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
          >
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.category}){m.realData ? " *" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <label className="text-[10px] text-muted-foreground">Compare With</label>
          <select
            value={compareMetric}
            onChange={(e) => setCompareMetric(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
          >
            {METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.category}){m.realData ? " *" : ""}
              </option>
            ))}
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
          <label className="text-[10px] text-muted-foreground">Lookback (기간)</label>
          <select value={lookbackDays} onChange={(e) => setLookbackDays(parseInt(e.target.value))} className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs">
            <option value="90">3개월</option>
            <option value="180">6개월</option>
            <option value="365">1년</option>
            <option value="730">2년</option>
            <option value="1095">3년</option>
            <option value="1460">4년 (1 사이클)</option>
          </select>
        </div>
      </div>

      {/* Data source legend */}
      <div className="text-[10px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> * 실제 데이터 (BTC 가격 기반 계산)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> 수동입력 (Weighted Risk에서 입력)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> 시뮬레이션 데이터 (온체인/매크로)
          </span>
        </div>
        {Object.keys(manualValues).length === 0 && (
          <p className="text-muted-foreground/70">
            온체인 지표를 직접 입력하려면{" "}
            <Link href="/tools/weighted-risk" className="text-blue-500 hover:text-blue-400 underline underline-offset-2">
              Weighted Risk Assessment
            </Link>
            {" "}페이지에서 입력하세요. 입력된 값은 이 페이지에 자동 반영됩니다.
          </p>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">BTC 가격 데이터를 불러오는 중...</p>
        </div>
      ) : (
        <>
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
              <p className="text-lg font-bold">{primaryData.length}일</p>
              <p className="text-[10px] text-muted-foreground">
                {primaryData.length > 0 && `${primaryData[0].time} ~ ${primaryData[primaryData.length - 1].time}`}
              </p>
            </div>
          </div>

          {/* Primary Metric Chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">{primaryName}</h3>
              {primaryIsReal ? (
                <span className="rounded-full bg-green-500/10 text-green-500 px-2 py-0.5 text-[10px] font-medium">실제 데이터</span>
              ) : manualValues[primaryMetric] !== undefined ? (
                <Link href="/tools/weighted-risk" className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-500 px-2 py-0.5 text-[10px] font-medium hover:bg-blue-500/20 transition-colors">
                  수동입력 ({manualValues[primaryMetric]})
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 text-yellow-500 px-2 py-0.5 text-[10px] font-medium">
                  시뮬레이션
                  {primaryDef?.refUrl && (
                    <a href={primaryDef.refUrl} target="_blank" rel="noopener noreferrer" title="실시간 데이터 확인" className="hover:text-yellow-400">
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </span>
              )}
            </div>
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
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">{compareName}</h3>
              {compareIsReal ? (
                <span className="rounded-full bg-green-500/10 text-green-500 px-2 py-0.5 text-[10px] font-medium">실제 데이터</span>
              ) : manualValues[compareMetric] !== undefined ? (
                <Link href="/tools/weighted-risk" className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-500 px-2 py-0.5 text-[10px] font-medium hover:bg-blue-500/20 transition-colors">
                  수동입력 ({manualValues[compareMetric]})
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 text-yellow-500 px-2 py-0.5 text-[10px] font-medium">
                  시뮬레이션
                  {compareDef?.refUrl && (
                    <a href={compareDef.refUrl} target="_blank" rel="noopener noreferrer" title="실시간 데이터 확인" className="hover:text-yellow-400">
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </span>
              )}
            </div>
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
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">현재값</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">데이터</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.filter((m) => m.id !== compareMetric)
                    .map((m) => {
                      const data1 = getMetricData(m.id);
                      const data2 = getMetricData(compareMetric);
                      const n = Math.min(data1.length, data2.length);
                      if (n < 10) return { ...m, corr: 0, latestValue: data1.length > 0 ? data1[data1.length - 1].value : null };
                      const x = data1.slice(-n).map((d) => d.value);
                      const y = data2.slice(-n).map((d) => d.value);
                      const xm = x.reduce((s, v) => s + v, 0) / n;
                      const ym = y.reduce((s, v) => s + v, 0) / n;
                      let num2 = 0, dx2 = 0, dy2 = 0;
                      for (let i = 0; i < n; i++) {
                        num2 += (x[i] - xm) * (y[i] - ym);
                        dx2 += (x[i] - xm) ** 2;
                        dy2 += (y[i] - ym) ** 2;
                      }
                      const corr2 = Math.sqrt(dx2 * dy2) > 0 ? num2 / Math.sqrt(dx2 * dy2) : 0;
                      const latestValue = data1.length > 0 ? data1[data1.length - 1].value : null;
                      return { ...m, corr: corr2, latestValue };
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
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {row.latestValue !== null ? (
                            Math.abs(row.latestValue) >= 1000
                              ? row.latestValue.toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : Math.abs(row.latestValue) >= 1
                                ? row.latestValue.toFixed(2)
                                : row.latestValue.toFixed(4)
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.realData ? (
                            <span className="text-green-500 text-[10px]">Real</span>
                          ) : manualValues[row.id] !== undefined ? (
                            <Link
                              href="/tools/weighted-risk"
                              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors"
                              title="Weighted Risk에서 입력된 값"
                            >
                              <span className="text-[10px]">수동</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-yellow-500 text-[10px]">Sim</span>
                              {row.refUrl && (
                                <a
                                  href={row.refUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-yellow-500 hover:text-yellow-400 transition-colors"
                                  title={`${row.name} 실시간 확인`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Criteria & Standards */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowCriteria(!showCriteria)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            지표 해석 기준
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showCriteria ? "rotate-180" : ""}`} />
        </button>
        {showCriteria && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">상관관계 해석 기준</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-green-500/30 bg-green-500/5 p-2.5 text-center">
                  <p className="text-xs font-bold text-green-500">Strong</p>
                  <p className="text-[10px] mt-1">|r| &gt; 0.6</p>
                  <p className="text-[10px]">높은 연관성</p>
                </div>
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5 text-center">
                  <p className="text-xs font-bold text-yellow-500">Moderate</p>
                  <p className="text-[10px] mt-1">0.3 &lt; |r| &lt; 0.6</p>
                  <p className="text-[10px]">중간 연관성</p>
                </div>
                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2.5 text-center">
                  <p className="text-xs font-bold text-red-500">Weak</p>
                  <p className="text-[10px] mt-1">|r| &lt; 0.3</p>
                  <p className="text-[10px]">낮은 연관성</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">기술적 지표 기준 (실제 데이터)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">지표</th>
                      <th className="px-3 py-2 text-left font-medium">과매도</th>
                      <th className="px-3 py-2 text-left font-medium">중립</th>
                      <th className="px-3 py-2 text-left font-medium">과매수</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 font-medium">RSI (14D)</td>
                      <td className="px-3 py-2 text-green-500">&lt; 30</td>
                      <td className="px-3 py-2">30 ~ 70</td>
                      <td className="px-3 py-2 text-red-500">&gt; 70</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 font-medium">MACD Histogram</td>
                      <td className="px-3 py-2 text-green-500">음수 → 양수 전환</td>
                      <td className="px-3 py-2">0 부근</td>
                      <td className="px-3 py-2 text-red-500">양수 → 음수 전환</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 font-medium">BB Width</td>
                      <td className="px-3 py-2 text-green-500">&lt; 0.05 (스퀴즈)</td>
                      <td className="px-3 py-2">0.05 ~ 0.15</td>
                      <td className="px-3 py-2 text-red-500">&gt; 0.15 (확장)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium">30D Volatility</td>
                      <td className="px-3 py-2 text-green-500">&lt; 0.3 (저변동)</td>
                      <td className="px-3 py-2">0.3 ~ 0.8</td>
                      <td className="px-3 py-2 text-red-500">&gt; 0.8 (고변동)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">MA 크로스 해석</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-green-500/5 border border-green-500/20 p-2.5">
                  <p className="text-xs font-bold text-green-500 mb-1">Golden Cross (강세)</p>
                  <p className="text-[10px]">
                    Fast MA가 Slow MA를 상향 돌파. 상승 추세 시작 신호로 해석됩니다.
                    Forward Returns가 양수이면 역사적으로 해당 이벤트 후 상승한 경우가 많았음을 의미합니다.
                  </p>
                </div>
                <div className="rounded-md bg-red-500/5 border border-red-500/20 p-2.5">
                  <p className="text-xs font-bold text-red-500 mb-1">Death Cross (약세)</p>
                  <p className="text-[10px]">
                    Fast MA가 Slow MA를 하향 돌파. 하락 추세 시작 신호로 해석됩니다.
                    승률이 높아도 평균 수익률이 음수이면 대형 손실 이벤트가 포함되어 있을 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimers */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li>
            <strong>BTC Price, RSI, MACD, BB Width, Volatility</strong>는 CryptoCompare/CoinGecko <strong>실제 가격 데이터</strong>에서 계산됩니다.
          </li>
          <li>
            <strong>온체인 지표(MVRV, NUPL, SOPR 등), Sentiment, Macro</strong>는 현재 <strong>시뮬레이션 데이터</strong>입니다.
            Glassnode 등 API 연동 시 실제 데이터로 대체됩니다.
          </li>
          <li>
            상관관계는 <strong>인과관계를 의미하지 않습니다</strong>. 두 지표가 함께 움직인다고 해서 하나가 다른 하나를 유발하는 것은 아닙니다.
          </li>
          <li>
            <strong>과거의 MA 크로스 패턴이 미래에 반복될 보장은 없습니다.</strong> Forward Returns는 참고용 통계입니다.
          </li>
          <li>
            암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험 자산입니다.
            본 도구는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이 아닙니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
