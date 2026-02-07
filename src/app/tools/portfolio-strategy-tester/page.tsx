"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { FlaskConical, Play, Loader2 } from "lucide-react";

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
// Backtest Engine
// ---------------------------------------------------------------------------
interface Strategy {
  name: string;
  description: string;
  weights: Record<string, number>;
  rebalance: "none" | "monthly" | "quarterly" | "annually";
}

const STRATEGIES: Strategy[] = [
  { name: "60/40 BTC/ETH", description: "BTC 60%, ETH 40%", weights: { BTC: 60, ETH: 40 }, rebalance: "monthly" },
  { name: "Crypto + TradFi 균형", description: "BTC 25%, ETH 15%, SPX 35%, Gold 15%, Bonds 10%", weights: { BTC: 25, ETH: 15, SPX: 35, XAU: 15, AGG: 10 }, rebalance: "quarterly" },
  { name: "올웨더 크립토", description: "BTC 40%, ETH 20%, SOL 10%, 스테이블 30%", weights: { BTC: 40, ETH: 20, SOL: 10, STBL: 30 }, rebalance: "monthly" },
  { name: "100% 비트코인", description: "BTC 100%", weights: { BTC: 100 }, rebalance: "none" },
];

// Deterministic price generator
function genPrice(asset: string, days: number): number[] {
  let seed = 0;
  for (let i = 0; i < asset.length; i++) seed = ((seed << 5) - seed + asset.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const base: Record<string, number> = { BTC: 30000, ETH: 2000, SOL: 25, SPX: 4000, XAU: 1900, AGG: 100, STBL: 1 };
  const vol: Record<string, number> = { BTC: 0.03, ETH: 0.035, SOL: 0.05, SPX: 0.01, XAU: 0.007, AGG: 0.002, STBL: 0.0001 };
  const drift: Record<string, number> = { BTC: 0.0012, ETH: 0.001, SOL: 0.0015, SPX: 0.0004, XAU: 0.0002, AGG: 0.0001, STBL: 0 };

  const b = base[asset] || 100;
  const v = vol[asset] || 0.02;
  const d = drift[asset] || 0.0003;

  const prices: number[] = [];
  let p = b;
  for (let i = 0; i < days; i++) {
    const noise = Math.sin(i * 0.07 + seed) * v * b * 0.6 + Math.sin(i * 0.025 + seed * 3) * v * b;
    p = Math.max(b * 0.05, p + noise + d * b);
    prices.push(p);
  }
  return prices;
}

interface BacktestResult {
  equityCurve: Array<{ time: string; value: number }>;
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  yearlyReturns: Array<{ year: string; ret: number }>;
}

function runBacktest(
  strategy: Strategy,
  startDate: string,
  endDate: string,
  initialInvestment: number
): BacktestResult {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
  if (days < 30) return emptyResult();

  const assets = Object.keys(strategy.weights);
  const priceArrays: Record<string, number[]> = {};
  for (const a of assets) priceArrays[a] = genPrice(a, days);

  // Track portfolio
  const equityCurve: Array<{ time: string; value: number }> = [];
  let portfolio = initialInvestment;
  const holdings: Record<string, number> = {};

  // Initial allocation
  for (const a of assets) {
    const weight = strategy.weights[a] / 100;
    holdings[a] = (portfolio * weight) / priceArrays[a][0];
  }

  let peak = portfolio;
  let maxDD = 0;
  const dailyReturns: number[] = [];
  let prevValue = portfolio;

  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);

    // Portfolio value
    let value = 0;
    for (const a of assets) value += holdings[a] * priceArrays[a][d];

    // Rebalance check
    if (d > 0 && strategy.rebalance !== "none") {
      const shouldRebalance =
        (strategy.rebalance === "monthly" && date.getDate() === 1) ||
        (strategy.rebalance === "quarterly" && date.getDate() === 1 && date.getMonth() % 3 === 0) ||
        (strategy.rebalance === "annually" && date.getDate() === 1 && date.getMonth() === 0);

      if (shouldRebalance) {
        for (const a of assets) {
          const weight = strategy.weights[a] / 100;
          holdings[a] = (value * weight) / priceArrays[a][d];
        }
      }
    }

    // Track metrics
    const dailyReturn = prevValue > 0 ? (value - prevValue) / prevValue : 0;
    dailyReturns.push(dailyReturn);
    prevValue = value;

    if (value > peak) peak = value;
    const dd = ((peak - value) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (d % 7 === 0 || d === days - 1) {
      equityCurve.push({
        time: date.toISOString().split("T")[0],
        value: Math.round(value * 100) / 100,
      });
    }
  }

  const finalValue = equityCurve[equityCurve.length - 1].value;
  const totalReturn = ((finalValue - initialInvestment) / initialInvestment) * 100;
  const years = days / 365;
  const cagr = (Math.pow(finalValue / initialInvestment, 1 / years) - 1) * 100;

  const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length);
  const downDev = Math.sqrt(dailyReturns.filter((r) => r < 0).reduce((s, r) => s + r * r, 0) / Math.max(1, dailyReturns.filter((r) => r < 0).length));

  const sharpe = stdDev > 0 ? (avgReturn * 252 - 0.045) / (stdDev * Math.sqrt(252)) : 0;
  const sortino = downDev > 0 ? (avgReturn * 252 - 0.045) / (downDev * Math.sqrt(252)) : 0;

  // Yearly returns
  const yearlyReturns: Array<{ year: string; ret: number }> = [];
  let yearStart = initialInvestment;
  let currentYear = start.getFullYear();
  for (const pt of equityCurve) {
    const yr = parseInt(pt.time.slice(0, 4));
    if (yr !== currentYear) {
      yearlyReturns.push({ year: currentYear.toString(), ret: ((pt.value - yearStart) / yearStart) * 100 });
      yearStart = pt.value;
      currentYear = yr;
    }
  }
  if (equityCurve.length > 0) {
    yearlyReturns.push({ year: currentYear.toString(), ret: ((equityCurve[equityCurve.length - 1].value - yearStart) / yearStart) * 100 });
  }

  return { equityCurve, totalReturn, cagr, maxDrawdown: maxDD, sharpe, sortino, yearlyReturns };
}

function emptyResult(): BacktestResult {
  return { equityCurve: [], totalReturn: 0, cagr: 0, maxDrawdown: 0, sharpe: 0, sortino: 0, yearlyReturns: [] };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PortfolioStrategyTesterPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [startDate, setStartDate] = useState("2021-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [initialInvestment, setInitialInvestment] = useState("10000");
  const [compareAll, setCompareAll] = useState(false);

  const strategy = STRATEGIES[selectedIdx];
  const investment = parseFloat(initialInvestment) || 10000;

  const result = useMemo(
    () => runBacktest(strategy, startDate, endDate, investment),
    [strategy, startDate, endDate, investment]
  );

  const allResults = useMemo(() => {
    if (!compareAll) return [];
    return STRATEGIES.map((s) => ({
      name: s.name,
      ...runBacktest(s, startDate, endDate, investment),
    }));
  }, [compareAll, startDate, endDate, investment]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Portfolio Strategy Tester</h1>
        </div>
        <p className="text-muted-foreground">
          포트폴리오 전략 백테스트 - 배분 비율, 리밸런싱 주기별 성과 비교
        </p>
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
                  i === selectedIdx ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                <p className="text-xs text-muted-foreground">리밸런싱: {s.rebalance === "none" ? "없음" : s.rebalance === "monthly" ? "매월" : s.rebalance === "quarterly" ? "분기" : "연간"}</p>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">백테스트 설정</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">시작일</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">종료일</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">초기 투자금 ($)</label>
              <input type="number" value={initialInvestment} onChange={(e) => setInitialInvestment(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={compareAll} onChange={(e) => setCompareAll(e.target.checked)} className="accent-primary" />
              모든 전략 비교
            </label>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">총 수익률</p>
              <p className={`text-lg font-bold ${result.totalReturn >= 0 ? "text-green-500" : "text-red-500"}`}>
                {result.totalReturn >= 0 ? "+" : ""}{result.totalReturn.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">CAGR</p>
              <p className="text-lg font-bold">{result.cagr.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">Max Drawdown</p>
              <p className="text-lg font-bold text-red-500">-{result.maxDrawdown.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">Sharpe</p>
              <p className="text-lg font-bold">{result.sharpe.toFixed(2)}</p>
            </div>
          </div>

          {/* Equity Curve */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">자산 곡선 (Equity Curve)</h3>
            {result.equityCurve.length > 0 ? (
              <LightweightChartWrapper
                data={result.equityCurve}
                type="area"
                color="#2962FF"
                height={320}
                showGrid
              />
            ) : (
              <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
                데이터 없음
              </div>
            )}
          </div>

          {/* Yearly Returns */}
          {result.yearlyReturns.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">연간 수익률</h3>
              <div className="flex items-end gap-3 h-36 px-2">
                {result.yearlyReturns.map((y) => (
                  <div key={y.year} className="flex-1 flex flex-col items-center">
                    <span className={`text-[10px] font-mono mb-1 ${y.ret >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {y.ret >= 0 ? "+" : ""}{y.ret.toFixed(1)}%
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all ${y.ret >= 0 ? "bg-green-500/60" : "bg-red-500/60"}`}
                      style={{ height: `${Math.min(100, Math.abs(y.ret))}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground mt-1">{y.year}</span>
                  </div>
                ))}
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
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">전략</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">총 수익률</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">CAGR</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Max DD</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sharpe</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sortino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.map((r) => (
                      <tr key={r.name} className="border-b border-border hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className={`px-3 py-2 text-right font-mono ${r.totalReturn >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{r.cagr.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right font-mono text-red-500">-{r.maxDrawdown.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right font-mono">{r.sharpe.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.sortino.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
