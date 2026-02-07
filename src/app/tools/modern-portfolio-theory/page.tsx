"use client";

import { useState, useMemo } from "react";
import { PieChart, Plus, Trash2, Zap } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Asset {
  name: string;
  ticker: string;
  allocation: number;
  expectedReturn: number;
  volatility: number;
}

interface SimulatedPortfolio {
  risk: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

const DEFAULT_ASSETS: Asset[] = [
  { name: "Bitcoin", ticker: "BTC", allocation: 30, expectedReturn: 85, volatility: 72 },
  { name: "Ethereum", ticker: "ETH", allocation: 15, expectedReturn: 65, volatility: 78 },
  { name: "S&P 500", ticker: "SPX", allocation: 25, expectedReturn: 10.5, volatility: 15 },
  { name: "Gold", ticker: "XAU", allocation: 15, expectedReturn: 8, volatility: 12 },
  { name: "US Bonds", ticker: "AGG", allocation: 15, expectedReturn: 4.5, volatility: 5 },
];

// Simple correlation assumptions
const CORRELATIONS: Record<string, Record<string, number>> = {
  BTC: { BTC: 1, ETH: 0.82, SPX: 0.38, XAU: 0.12, AGG: -0.15 },
  ETH: { BTC: 0.82, ETH: 1, SPX: 0.42, XAU: 0.08, AGG: -0.18 },
  SPX: { BTC: 0.38, ETH: 0.42, SPX: 1, XAU: -0.05, AGG: 0.22 },
  XAU: { BTC: 0.12, ETH: 0.08, SPX: -0.05, XAU: 1, AGG: 0.35 },
  AGG: { BTC: -0.15, ETH: -0.18, SPX: 0.22, XAU: 0.35, AGG: 1 },
};

function getCorr(a: string, b: string): number {
  return CORRELATIONS[a]?.[b] ?? (a === b ? 1 : 0.2);
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------
function runMonteCarlo(
  assets: Asset[],
  numSimulations: number
): SimulatedPortfolio[] {
  const riskFreeRate = 4.5;
  const portfolios: SimulatedPortfolio[] = [];

  for (let s = 0; s < numSimulations; s++) {
    // Generate random weights
    const rawWeights = assets.map(() => Math.random());
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map((w) => w / sum);

    // Portfolio return
    const ret = assets.reduce((acc, a, i) => acc + a.expectedReturn * weights[i], 0);

    // Portfolio variance (with correlations)
    let variance = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const corr = getCorr(assets[i].ticker, assets[j].ticker);
        variance +=
          weights[i] * weights[j] * assets[i].volatility * assets[j].volatility * corr / 10000;
      }
    }
    const risk = Math.sqrt(variance) * 100;
    const sharpe = risk > 0 ? (ret - riskFreeRate) / risk : 0;

    portfolios.push({ risk, ret, sharpe, weights });
  }

  return portfolios;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ModernPortfolioTheoryPage() {
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [numSims, setNumSims] = useState(5000);
  const [hasRun, setHasRun] = useState(false);
  const [simResults, setSimResults] = useState<SimulatedPortfolio[]>([]);

  const totalAlloc = assets.reduce((s, a) => s + a.allocation, 0);

  // Current portfolio metrics
  const currentMetrics = useMemo(() => {
    const weights = assets.map((a) => a.allocation / 100);
    const ret = assets.reduce((acc, a, i) => acc + a.expectedReturn * weights[i], 0);

    let variance = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const corr = getCorr(assets[i].ticker, assets[j].ticker);
        variance += weights[i] * weights[j] * assets[i].volatility * assets[j].volatility * corr / 10000;
      }
    }
    const risk = Math.sqrt(variance) * 100;
    const sharpe = risk > 0 ? (ret - 4.5) / risk : 0;
    const sortino = risk > 0 ? (ret - 4.5) / (risk * 0.7) : 0;
    const maxDD = risk * 2.2;

    return { ret, risk, sharpe, sortino, maxDD };
  }, [assets]);

  // Run simulation
  const runSimulation = () => {
    const results = runMonteCarlo(assets, numSims);
    setSimResults(results);
    setHasRun(true);
  };

  // Find optimal portfolios
  const optimal = useMemo(() => {
    if (simResults.length === 0) return null;
    const maxSharpe = simResults.reduce((best, p) => (p.sharpe > best.sharpe ? p : best), simResults[0]);
    const minVar = simResults.reduce((best, p) => (p.risk < best.risk ? p : best), simResults[0]);
    return { maxSharpe, minVar };
  }, [simResults]);

  const addAsset = () => {
    setAssets([...assets, { name: "New", ticker: "NEW", allocation: 0, expectedReturn: 10, volatility: 20 }]);
  };

  const removeAsset = (i: number) => {
    setAssets(assets.filter((_, idx) => idx !== i));
  };

  const updateAsset = (i: number, field: keyof Asset, value: number | string) => {
    const updated = [...assets];
    updated[i] = { ...updated[i], [field]: value };
    setAssets(updated);
  };

  // SVG scatter plot
  const svgWidth = 600;
  const svgHeight = 400;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = svgWidth - pad.left - pad.right;
  const plotH = svgHeight - pad.top - pad.bottom;

  const allPoints = hasRun ? simResults : [];
  const maxRisk = Math.max(80, ...allPoints.map((p) => p.risk), currentMetrics.risk + 10);
  const maxRet = Math.max(80, ...allPoints.map((p) => p.ret), currentMetrics.ret + 10);

  const toX = (risk: number) => pad.left + (risk / maxRisk) * plotW;
  const toY = (ret: number) => pad.top + plotH - (ret / maxRet) * plotH;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PieChart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Modern Portfolio Theory</h1>
        </div>
        <p className="text-muted-foreground">
          포트폴리오 최적화 - 몬테카를로 시뮬레이션으로 효율적 프론티어 시각화
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Portfolio Builder */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">포트폴리오 구성</h2>
              <button onClick={addAsset} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                <Plus className="h-3 w-3" /> 추가
              </button>
            </div>

            <div className="space-y-3">
              {assets.map((a, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => updateAsset(i, "name", e.target.value)}
                        className="w-24 bg-transparent text-sm font-semibold focus:outline-none"
                      />
                      <input
                        type="text"
                        value={a.ticker}
                        onChange={(e) => updateAsset(i, "ticker", e.target.value)}
                        className="w-12 bg-transparent text-xs text-muted-foreground uppercase focus:outline-none"
                      />
                    </div>
                    <button onClick={() => removeAsset(i)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-10">비중</span>
                      <input
                        type="range" min="0" max="100"
                        value={a.allocation}
                        onChange={(e) => updateAsset(i, "allocation", parseInt(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="w-10 text-right text-xs font-mono">{a.allocation}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">기대수익률 (%)</label>
                        <input
                          type="number"
                          value={a.expectedReturn}
                          onChange={(e) => updateAsset(i, "expectedReturn", parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">변동성 (%)</label>
                        <input
                          type="number"
                          value={a.volatility}
                          onChange={(e) => updateAsset(i, "volatility", parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={`mt-3 rounded-md p-2 text-xs text-center ${totalAlloc === 100 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
              총 비중: {totalAlloc}% {totalAlloc !== 100 && "(100%여야 합니다)"}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground">시뮬레이션 횟수</label>
                <select
                  value={numSims}
                  onChange={(e) => setNumSims(parseInt(e.target.value))}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="1000">1,000</option>
                  <option value="5000">5,000</option>
                  <option value="10000">10,000</option>
                  <option value="50000">50,000</option>
                </select>
              </div>
              <button
                onClick={runSimulation}
                className="mt-3 flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="h-3.5 w-3.5" /> 최적화
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">기대수익률</p>
              <p className="text-lg font-bold text-green-500">{currentMetrics.ret.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">포트폴리오 리스크</p>
              <p className="text-lg font-bold">{currentMetrics.risk.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">Sharpe Ratio</p>
              <p className="text-lg font-bold">{currentMetrics.sharpe.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">Sortino Ratio</p>
              <p className="text-lg font-bold">{currentMetrics.sortino.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground">예상 Max DD</p>
              <p className="text-lg font-bold text-red-500">-{currentMetrics.maxDD.toFixed(1)}%</p>
            </div>
          </div>

          {/* Efficient Frontier */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Efficient Frontier</h3>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ maxHeight: 400 }}>
                {/* Grid */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = pad.top + (i / 4) * plotH;
                  const val = maxRet - (i / 4) * maxRet;
                  return (
                    <g key={`gy-${i}`}>
                      <line x1={pad.left} y1={y} x2={svgWidth - pad.right} y2={y} stroke="currentColor" className="text-muted/15" strokeWidth="0.5" />
                      <text x={pad.left - 5} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize="9">{val.toFixed(0)}%</text>
                    </g>
                  );
                })}
                {[0, 1, 2, 3, 4].map((i) => {
                  const x = pad.left + (i / 4) * plotW;
                  const val = (i / 4) * maxRisk;
                  return (
                    <g key={`gx-${i}`}>
                      <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} stroke="currentColor" className="text-muted/15" strokeWidth="0.5" />
                      <text x={x} y={svgHeight - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="9">{val.toFixed(0)}%</text>
                    </g>
                  );
                })}
                <text x={svgWidth / 2} y={svgHeight - 0} textAnchor="middle" className="fill-muted-foreground" fontSize="10">리스크 (변동성)</text>

                {/* Simulated points */}
                {allPoints.slice(0, 3000).map((p, i) => (
                  <circle
                    key={i}
                    cx={toX(p.risk)}
                    cy={toY(p.ret)}
                    r={1.2}
                    fill={`hsl(${Math.min(p.sharpe * 60, 200)}, 70%, 50%)`}
                    opacity={0.4}
                  />
                ))}

                {/* Optimal portfolios */}
                {optimal && (
                  <>
                    <circle cx={toX(optimal.minVar.risk)} cy={toY(optimal.minVar.ret)} r={5} fill="#10b981" stroke="white" strokeWidth={1.5} />
                    <text x={toX(optimal.minVar.risk) + 8} y={toY(optimal.minVar.ret) + 3} fontSize="8" className="fill-current font-medium">Min Var</text>

                    <circle cx={toX(optimal.maxSharpe.risk)} cy={toY(optimal.maxSharpe.ret)} r={5} fill="#f59e0b" stroke="white" strokeWidth={1.5} />
                    <text x={toX(optimal.maxSharpe.risk) + 8} y={toY(optimal.maxSharpe.ret) + 3} fontSize="8" className="fill-current font-medium">Max Sharpe</text>
                  </>
                )}

                {/* Current portfolio */}
                <circle cx={toX(currentMetrics.risk)} cy={toY(currentMetrics.ret)} r={6} fill="hsl(var(--destructive, 0 84% 60%))" stroke="white" strokeWidth={2} />
                <text x={toX(currentMetrics.risk) + 10} y={toY(currentMetrics.ret) + 4} fontSize="9" className="fill-current font-semibold">내 포트폴리오</text>
              </svg>
            </div>
            {!hasRun && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                &laquo;최적화&raquo; 버튼을 눌러 몬테카를로 시뮬레이션을 실행하세요
              </p>
            )}
          </div>

          {/* Optimal portfolio weights */}
          {optimal && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">최적 포트폴리오 비교</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">포트폴리오</th>
                      {assets.map((a) => (
                        <th key={a.ticker} className="px-3 py-2 text-center font-medium text-muted-foreground">{a.ticker}</th>
                      ))}
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">수익률</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">리스크</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sharpe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border bg-blue-500/5">
                      <td className="px-3 py-2 font-medium">현재</td>
                      {assets.map((a) => (
                        <td key={a.ticker} className="px-3 py-2 text-center font-mono">{a.allocation}%</td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono">{currentMetrics.ret.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono">{currentMetrics.risk.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono">{currentMetrics.sharpe.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-border bg-yellow-500/5">
                      <td className="px-3 py-2 font-medium">Max Sharpe</td>
                      {optimal.maxSharpe.weights.map((w, i) => (
                        <td key={i} className="px-3 py-2 text-center font-mono">{(w * 100).toFixed(1)}%</td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono text-green-500">{optimal.maxSharpe.ret.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono">{optimal.maxSharpe.risk.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{optimal.maxSharpe.sharpe.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-border bg-green-500/5">
                      <td className="px-3 py-2 font-medium">Min Variance</td>
                      {optimal.minVar.weights.map((w, i) => (
                        <td key={i} className="px-3 py-2 text-center font-mono">{(w * 100).toFixed(1)}%</td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono">{optimal.minVar.ret.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono text-green-500">{optimal.minVar.risk.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono">{optimal.minVar.sharpe.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Correlation Matrix */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">상관관계 매트릭스</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {assets.map((a) => <th key={a.ticker} className="p-2 text-center font-medium">{a.ticker}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.ticker}>
                      <td className="p-2 font-medium">{a.ticker}</td>
                      {assets.map((b) => {
                        const corr = getCorr(a.ticker, b.ticker);
                        return (
                          <td key={b.ticker} className="p-2 text-center">
                            <span className={`inline-block rounded px-2 py-1 font-mono ${
                              corr > 0.5 ? "bg-red-500/15 text-red-500" :
                              corr > 0 ? "bg-yellow-500/15 text-yellow-500" :
                              "bg-green-500/15 text-green-500"
                            }`}>
                              {corr.toFixed(2)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
