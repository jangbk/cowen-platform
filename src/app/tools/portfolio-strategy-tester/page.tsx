"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  FlaskConical,
  Loader2,
  Info,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

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
// Types & Strategies
// ---------------------------------------------------------------------------
interface Strategy {
  name: string;
  description: string;
  weights: Record<string, number>;
  rebalance: "none" | "monthly" | "quarterly" | "annually";
}

const CRYPTO_ASSETS = new Set(["BTC", "ETH", "XRP", "SOL"]);
const TRADFI_ASSETS = new Set(["SPX", "XAU", "AGG", "STBL"]);

const STRATEGIES: Strategy[] = [
  { name: "BTC/ETH/XRP", description: "BTC 50%, ETH 30%, XRP 20%", weights: { BTC: 50, ETH: 30, XRP: 20 }, rebalance: "monthly" },
  { name: "Crypto + TradFi 균형", description: "BTC 25%, ETH 15%, SPX 35%, Gold 15%, Bonds 10%", weights: { BTC: 25, ETH: 15, SPX: 35, XAU: 15, AGG: 10 }, rebalance: "quarterly" },
  { name: "올웨더 크립토", description: "BTC 40%, ETH 20%, SOL 10%, 스테이블 30%", weights: { BTC: 40, ETH: 20, SOL: 10, STBL: 30 }, rebalance: "monthly" },
  { name: "100% 비트코인", description: "BTC 100%", weights: { BTC: 100 }, rebalance: "none" },
  { name: "100% 이더리움", description: "ETH 100%", weights: { ETH: 100 }, rebalance: "none" },
  { name: "100% XRP", description: "XRP 100%", weights: { XRP: 100 }, rebalance: "none" },
];

// ---------------------------------------------------------------------------
// TradFi synthetic price generator (SPX, XAU, AGG, STBL only)
// ---------------------------------------------------------------------------
function genSyntheticDaily(
  asset: string,
  dates: string[]
): Record<string, number> {
  let seed = 0;
  for (let i = 0; i < asset.length; i++)
    seed = ((seed << 5) - seed + asset.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const base: Record<string, number> = { SPX: 4800, XAU: 2000, AGG: 100, STBL: 1 };
  const vol: Record<string, number> = { SPX: 0.01, XAU: 0.008, AGG: 0.002, STBL: 0.0001 };
  const drift: Record<string, number> = { SPX: 0.0004, XAU: 0.0003, AGG: 0.0001, STBL: 0 };

  const b = base[asset] || 100;
  const v = vol[asset] || 0.01;
  const d = drift[asset] || 0.0002;

  const out: Record<string, number> = {};
  let p = b;
  for (let i = 0; i < dates.length; i++) {
    const noise =
      Math.sin(i * 0.07 + seed) * v * b * 0.6 +
      Math.sin(i * 0.025 + seed * 3) * v * b;
    p = Math.max(b * 0.3, p + noise + d * b);
    out[dates[i]] = p;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Backtest Engine — each strategy finds its own common dates
// ---------------------------------------------------------------------------
interface BacktestResult {
  equityCurve: Array<{ time: string; value: number }>;
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  yearlyReturns: Array<{ year: string; ret: number }>;
  dataRange: { from: string; to: string; days: number };
}

function emptyResult(): BacktestResult {
  return {
    equityCurve: [],
    totalReturn: 0,
    cagr: 0,
    maxDrawdown: 0,
    sharpe: 0,
    sortino: 0,
    yearlyReturns: [],
    dataRange: { from: "", to: "", days: 0 },
  };
}

function runBacktest(
  strategy: Strategy,
  pricesByAsset: Record<string, Record<string, number>>,
  initialInvestment: number
): BacktestResult {
  const assets = Object.keys(strategy.weights);

  // Find common dates among THIS strategy's assets ONLY
  const dateSets = assets.map((a) => {
    const prices = pricesByAsset[a];
    return prices ? new Set(Object.keys(prices)) : new Set<string>();
  });

  // If any asset has no data, can't run
  if (dateSets.some((s) => s.size === 0)) return emptyResult();

  let commonSet = dateSets[0];
  for (let i = 1; i < dateSets.length; i++) {
    commonSet = new Set([...commonSet].filter((d) => dateSets[i].has(d)));
  }

  const dates = [...commonSet].sort();
  if (dates.length < 14) return emptyResult();

  const holdings: Record<string, number> = {};

  // Initial allocation
  for (const a of assets) {
    const weight = strategy.weights[a] / 100;
    const price = pricesByAsset[a][dates[0]];
    if (!price) return emptyResult();
    holdings[a] = (initialInvestment * weight) / price;
  }

  const equityCurve: Array<{ time: string; value: number }> = [];
  let peak = initialInvestment;
  let maxDD = 0;
  const dailyReturns: number[] = [];
  let prevValue = initialInvestment;

  for (let d = 0; d < dates.length; d++) {
    const dateStr = dates[d];
    const date = new Date(dateStr);

    let value = 0;
    for (const a of assets) {
      value += holdings[a] * pricesByAsset[a][dateStr];
    }

    // Rebalance
    if (d > 0 && strategy.rebalance !== "none") {
      const prevDate = new Date(dates[d - 1]);
      const monthChanged = prevDate.getMonth() !== date.getMonth();

      const shouldRebalance =
        (strategy.rebalance === "monthly" && monthChanged) ||
        (strategy.rebalance === "quarterly" && monthChanged && date.getMonth() % 3 === 0) ||
        (strategy.rebalance === "annually" && monthChanged && date.getMonth() === 0);

      if (shouldRebalance) {
        for (const a of assets) {
          const weight = strategy.weights[a] / 100;
          holdings[a] = (value * weight) / pricesByAsset[a][dateStr];
        }
      }
    }

    const dailyReturn = prevValue > 0 ? (value - prevValue) / prevValue : 0;
    dailyReturns.push(dailyReturn);
    prevValue = value;

    if (value > peak) peak = value;
    const dd = ((peak - value) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (d % 7 === 0 || d === dates.length - 1) {
      equityCurve.push({
        time: dateStr,
        value: Math.round(value * 100) / 100,
      });
    }
  }

  if (equityCurve.length < 2) return emptyResult();

  const finalValue = equityCurve[equityCurve.length - 1].value;
  const totalReturn =
    ((finalValue - initialInvestment) / initialInvestment) * 100;
  const years = dates.length / 365;
  const cagr =
    (Math.pow(finalValue / initialInvestment, 1 / Math.max(0.1, years)) - 1) *
    100;

  const avgReturn =
    dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(
    dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) /
      dailyReturns.length
  );
  const negReturns = dailyReturns.filter((r) => r < 0);
  const downDev = Math.sqrt(
    negReturns.reduce((s, r) => s + r * r, 0) / Math.max(1, negReturns.length)
  );

  const sharpe =
    stdDev > 0 ? (avgReturn * 252 - 0.045) / (stdDev * Math.sqrt(252)) : 0;
  const sortino =
    downDev > 0 ? (avgReturn * 252 - 0.045) / (downDev * Math.sqrt(252)) : 0;

  // Yearly returns
  const yearlyReturns: Array<{ year: string; ret: number }> = [];
  let yearStart = initialInvestment;
  let currentYear = parseInt(equityCurve[0].time.slice(0, 4));
  for (const pt of equityCurve) {
    const yr = parseInt(pt.time.slice(0, 4));
    if (yr !== currentYear) {
      yearlyReturns.push({
        year: currentYear.toString(),
        ret: ((pt.value - yearStart) / yearStart) * 100,
      });
      yearStart = pt.value;
      currentYear = yr;
    }
  }
  if (equityCurve.length > 0) {
    yearlyReturns.push({
      year: currentYear.toString(),
      ret:
        ((equityCurve[equityCurve.length - 1].value - yearStart) / yearStart) *
        100,
    });
  }

  return {
    equityCurve,
    totalReturn,
    cagr,
    maxDrawdown: maxDD,
    sharpe,
    sortino,
    yearlyReturns,
    dataRange: {
      from: dates[0],
      to: dates[dates.length - 1],
      days: dates.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PortfolioStrategyTesterPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [startDate, setStartDate] = useState("2017-01-01");
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [initialInvestment, setInitialInvestment] = useState("10000");
  const [compareAll, setCompareAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Real price data per asset
  const [realPrices, setRealPrices] = useState<
    Record<string, { date: string; price: number }[]>
  >({});
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<Record<string, string>>({});

  const strategy = STRATEGIES[selectedIdx];
  const investment = parseFloat(initialInvestment) || 10000;

  // Fetch real crypto prices — parallel for speed, cached after first load
  const fetchPrices = useCallback(() => {
    setDataLoading(true);
    setDataError(null);

    const cryptoList = Array.from(CRYPTO_ASSETS);

    Promise.all(
      cryptoList.map((asset) =>
        fetch(`/api/tools/dca-history?asset=${asset}&from=${startDate}&to=${endDate}`)
          .then((r) => r.json())
          .then((d) => ({
            asset,
            prices: (d.prices || []) as { date: string; price: number }[],
            source: d.source || "unknown",
            range: d.range,
          }))
          .catch(() => ({ asset, prices: [] as { date: string; price: number }[], source: "error", range: null }))
      )
    ).then((results) => {
      const cache: Record<string, { date: string; price: number }[]> = {};
      const sources: Record<string, string> = {};
      const failed: string[] = [];

      for (const r of results) {
        cache[r.asset] = r.prices;
        if (r.prices.length > 0) {
          sources[r.asset] = `${r.source} (${r.range?.from}~${r.range?.to}, ${r.range?.count}건)`;
        } else {
          failed.push(r.asset);
        }
      }

      const hasData = Object.values(cache).some((arr) => arr.length > 0);
      if (!hasData) {
        setDataError("가격 데이터를 불러오는데 실패했습니다.");
      } else if (failed.length > 0) {
        setDataError(`${failed.join(", ")} 데이터를 불러오지 못했습니다.`);
      }
      setRealPrices(cache);
      setDataSources(sources);
      setDataLoading(false);
    });
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Build per-asset price maps (NOT intersected — each asset keeps all its dates)
  const pricesByAsset = useMemo(() => {
    const byAsset: Record<string, Record<string, number>> = {};

    // Crypto from real data — each asset has its OWN date range
    for (const [asset, arr] of Object.entries(realPrices)) {
      const map: Record<string, number> = {};
      for (const p of arr) map[p.date] = p.price;
      byAsset[asset] = map;
    }

    // Collect ALL dates from ALL crypto assets (union, not intersection)
    const allDatesSet = new Set<string>();
    for (const arr of Object.values(realPrices)) {
      for (const p of arr) allDatesSet.add(p.date);
    }
    const allDates = [...allDatesSet].sort();

    // TradFi synthetic prices generated for the full date range
    for (const asset of ["SPX", "XAU", "AGG", "STBL"]) {
      byAsset[asset] = genSyntheticDaily(asset, allDates);
    }

    return byAsset;
  }, [realPrices]);

  // Per-asset data info for display
  const assetDataInfo = useMemo(() => {
    const info: Record<string, { from: string; to: string; days: number }> = {};
    for (const asset of Array.from(CRYPTO_ASSETS)) {
      const dates = Object.keys(pricesByAsset[asset] || {}).sort();
      if (dates.length > 0) {
        info[asset] = { from: dates[0], to: dates[dates.length - 1], days: dates.length };
      }
    }
    return info;
  }, [pricesByAsset]);

  // Run backtest — each strategy finds its OWN common dates internally
  const result = useMemo(
    () => runBacktest(strategy, pricesByAsset, investment),
    [strategy, pricesByAsset, investment]
  );

  const allResults = useMemo(() => {
    if (!compareAll) return [];
    return STRATEGIES.map((s) => ({
      name: s.name,
      ...runBacktest(s, pricesByAsset, investment),
    }));
  }, [compareAll, pricesByAsset, investment]);

  const hasTradFi = Object.keys(strategy.weights).some(
    (a) => TRADFI_ASSETS.has(a) && a !== "STBL"
  );

  const hasAnyData = Object.values(assetDataInfo).some((v) => v.days > 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Portfolio Strategy Tester</h1>
        </div>
        <p className="text-muted-foreground">
          실제 과거 가격 기반 포트폴리오 전략 백테스트 — 배분 비율, 리밸런싱
          주기별 성과 비교
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
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`}
          />
        </button>
        {showGuide && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Portfolio Strategy Tester란?
              </h4>
              <p>
                다양한 자산 배분 전략의{" "}
                <strong>실제 과거 가격 기반 성과를 백테스트</strong>하여 비교하는
                도구입니다. 암호화폐(BTC, ETH, XRP, SOL)는 CryptoCompare/CoinGecko
                실제 데이터를 사용합니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                1. 전략 프리셋 선택
              </h4>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>
                  <strong>BTC/ETH/XRP</strong>: 암호화폐 3종 분산 (매월
                  리밸런싱)
                </li>
                <li>
                  <strong>Crypto + TradFi 균형</strong>: 크립토 + 주식 + 금 +
                  채권 혼합 (분기)
                </li>
                <li>
                  <strong>올웨더 크립토</strong>: BTC/ETH/SOL + 스테이블코인
                  (매월)
                </li>
                <li>
                  <strong>100% BTC / ETH / XRP</strong>: 단일 자산 HODL
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                2. 백테스트 설정
              </h4>
              <p>
                시작일/종료일과 초기 투자금을 설정합니다. 2013년부터 현재까지
                지원됩니다. 각 전략은 해당 자산의 데이터가 존재하는 기간만
                사용합니다 (예: SOL은 2020년~).
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                3. 결과 해석
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>총 수익률</strong>: 기간 전체 누적 수익률
                </li>
                <li>
                  <strong>CAGR</strong>: 연평균 복합 성장률
                </li>
                <li>
                  <strong>Max Drawdown</strong>: 고점 대비 최대 하락폭
                </li>
                <li>
                  <strong>Sharpe</strong>: 위험 대비 수익 (1↑ 양호, 2↑ 우수)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                4. 리밸런싱
              </h4>
              <p>
                자산 가격 변화로 비중이 목표와 달라지면{" "}
                <strong>목표 비중으로 재조정</strong>합니다. 고평가 자산 일부
                매도, 저평가 자산 매수하여 분산 효과를 유지합니다.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Config */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">전략 프리셋</h2>
            {STRATEGIES.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setSelectedIdx(i)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  i === selectedIdx
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  리밸런싱:{" "}
                  {s.rebalance === "none"
                    ? "없음"
                    : s.rebalance === "monthly"
                    ? "매월"
                    : s.rebalance === "quarterly"
                    ? "분기"
                    : "연간"}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">백테스트 설정</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">
                  시작일
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">
                  종료일
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">
                초기 투자금 ($)
              </label>
              <input
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={compareAll}
                onChange={(e) => setCompareAll(e.target.checked)}
                className="accent-primary"
              />
              모든 전략 비교
            </label>
          </div>

          {/* Per-asset data status */}
          {!dataLoading && hasAnyData && (
            <div className="rounded-md bg-card border border-border p-3 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">로드된 가격 데이터</p>
              {Object.entries(assetDataInfo).map(([asset, info]) => {
                const prices = pricesByAsset[asset];
                const firstPrice = prices?.[info.from];
                const lastPrice = prices?.[info.to];
                return (
                  <div key={asset} className="text-muted-foreground">
                    <div className="flex justify-between">
                      <span className="font-mono font-medium">{asset}</span>
                      <span>{info.days.toLocaleString()}일</span>
                    </div>
                    <div className="text-[10px] pl-2">
                      {info.from} (${firstPrice?.toFixed(firstPrice < 1 ? 4 : 2)}) → {info.to} (${lastPrice?.toFixed(lastPrice < 1 ? 4 : 2)})
                    </div>
                    {dataSources[asset] && (
                      <div className="text-[10px] pl-2 text-muted-foreground/60">
                        소스: {dataSources[asset]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Active strategy data range */}
          {!dataLoading && result.dataRange.days > 0 && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-600 dark:text-green-400">
              <strong>{strategy.name}</strong> 백테스트 기간
              <br />
              {result.dataRange.from} ~ {result.dataRange.to} ({result.dataRange.days.toLocaleString()}일)
            </div>
          )}

          {hasTradFi && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
              SPX/XAU/AGG는 시뮬레이션 데이터입니다.
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {dataLoading ? (
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                가격 데이터를 불러오는 중...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                첫 로딩은 시간이 걸릴 수 있습니다 (이후 24시간 캐시)
              </p>
            </div>
          ) : dataError && result.equityCurve.length === 0 ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-12 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
              <p className="text-sm text-red-500 font-medium">{dataError}</p>
              <p className="text-xs text-muted-foreground mt-2">
                날짜 범위를 조정하거나 잠시 후 다시 시도해주세요.
              </p>
            </div>
          ) : result.equityCurve.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                선택한 전략({strategy.name})의 자산 데이터가 부족합니다.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(strategy.weights)
                  .map((a) => {
                    const days = Object.keys(pricesByAsset[a] || {}).length;
                    return `${a}: ${days > 0 ? `${days}일` : "없음"}`;
                  })
                  .join(" / ")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                다른 전략을 선택하거나 페이지를 새로고침해 주세요.
              </p>
            </div>
          ) : (
            <>
              {dataError && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
                  {dataError} — 해당 자산이 포함된 전략은 정확하지 않을 수 있습니다.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">총 수익률</p>
                  <p
                    className={`text-lg font-bold ${result.totalReturn >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {result.totalReturn >= 0 ? "+" : ""}
                    {result.totalReturn.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">CAGR</p>
                  <p className="text-lg font-bold">
                    {result.cagr.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">
                    Max Drawdown
                  </p>
                  <p className="text-lg font-bold text-red-500">
                    -{result.maxDrawdown.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">Sharpe</p>
                  <p className="text-lg font-bold">
                    {result.sharpe.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Equity Curve */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">
                  자산 곡선 (Equity Curve)
                </h3>
                <LightweightChartWrapper
                  data={result.equityCurve}
                  type="area"
                  color="#2962FF"
                  height={320}
                  showGrid
                />
              </div>

              {/* Yearly Returns */}
              {result.yearlyReturns.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-3">연간 수익률</h3>
                  <div className="flex items-end gap-2 h-40 px-2">
                    {result.yearlyReturns.map((y) => {
                      const maxAbs = Math.max(
                        ...result.yearlyReturns.map((yr) => Math.abs(yr.ret)),
                        1
                      );
                      const barHeight = (Math.abs(y.ret) / maxAbs) * 100;
                      return (
                        <div
                          key={y.year}
                          className="flex-1 flex flex-col items-center"
                        >
                          <span
                            className={`text-[10px] font-mono mb-1 ${y.ret >= 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            {y.ret >= 0 ? "+" : ""}
                            {y.ret.toFixed(0)}%
                          </span>
                          <div
                            className={`w-full rounded-t-md ${y.ret >= 0 ? "bg-green-500/60" : "bg-red-500/60"}`}
                            style={{
                              height: `${Math.max(2, barHeight)}%`,
                            }}
                          />
                          <span className="text-[10px] text-muted-foreground mt-1">
                            {y.year.slice(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All strategies comparison */}
              {compareAll && allResults.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-3">전략 비교</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            전략
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            기간
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            총 수익률
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            CAGR
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Max DD
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            Sharpe
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allResults.map((r) => (
                          <tr
                            key={r.name}
                            className="border-b border-border hover:bg-muted/20"
                          >
                            <td className="px-3 py-2 font-medium">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground font-mono">
                              {r.dataRange.days > 0
                                ? `${r.dataRange.from.slice(2)} ~ ${r.dataRange.to.slice(2)}`
                                : "N/A"}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${r.totalReturn >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              {r.dataRange.days > 0
                                ? `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn.toFixed(1)}%`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {r.dataRange.days > 0
                                ? `${r.cagr.toFixed(1)}%`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-red-500">
                              {r.dataRange.days > 0
                                ? `-${r.maxDrawdown.toFixed(1)}%`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {r.dataRange.days > 0
                                ? r.sharpe.toFixed(2)
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    ※ 전략별 데이터 기간이 다를 수 있습니다 (각 전략의 모든 자산이 공통으로 존재하는 기간 사용).
                  </p>
                </div>
              )}
            </>
          )}

          {/* Disclaimers */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              주의사항
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
              <li>
                <strong>과거 수익률은 미래 수익률을 보장하지 않습니다.</strong>
              </li>
              <li>
                암호화폐(BTC, ETH, XRP, SOL)는{" "}
                <strong>CryptoCompare/CoinGecko 실제 일별 가격</strong>을
                사용합니다. SPX, XAU, AGG, STBL은 시뮬레이션 데이터입니다.
              </li>
              <li>
                실제 거래에서는{" "}
                <strong>거래 수수료, 슬리피지, 세금, 리밸런싱 비용</strong> 등이
                추가로 발생합니다.
              </li>
              <li>
                암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험
                자산입니다.
              </li>
              <li>
                본 도구는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이
                아닙니다.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
