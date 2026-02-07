"use client";

import { useState, useMemo } from "react";
import { Target, DollarSign, AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Helpers
// ---------------------------------------------------------------------------
interface ExitStep {
  price: number;
  sellPct: number;
}

interface RiskBand {
  name: string;
  range: string;
  start: number;
  mid: number;
  top: number;
  color: string;
}

const DEFAULT_STEPS: ExitStep[] = [
  { price: 80000, sellPct: 10 },
  { price: 100000, sellPct: 10 },
  { price: 120000, sellPct: 15 },
  { price: 150000, sellPct: 20 },
  { price: 200000, sellPct: 20 },
  { price: 300000, sellPct: 15 },
];

const RISK_BANDS: RiskBand[] = [
  { name: "Band 1", range: "0.0 - 0.2", start: 70000, mid: 85000, top: 100000, color: "#10b981" },
  { name: "Band 2", range: "0.2 - 0.4", start: 100000, mid: 120000, top: 150000, color: "#84cc16" },
  { name: "Band 3", range: "0.4 - 0.6", start: 150000, mid: 180000, top: 220000, color: "#eab308" },
  { name: "Band 4", range: "0.6 - 0.8", start: 220000, mid: 280000, top: 350000, color: "#f97316" },
  { name: "Band 5", range: "0.8 - 1.0", start: 350000, mid: 450000, top: 600000, color: "#ef4444" },
];

function formatUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ExitStrategiesPage() {
  const [holdings, setHoldings] = useState("1.5");
  const [costBasis, setCostBasis] = useState("42000");
  const [currentPrice] = useState(98420);
  const [steps, setSteps] = useState<ExitStep[]>(DEFAULT_STEPS);
  const [riskTolerance, setRiskTolerance] = useState(50); // 0-100

  const holdingsNum = parseFloat(holdings) || 0;
  const costBasisNum = parseFloat(costBasis) || 0;

  // Calculate proceeds for each step
  const analysis = useMemo(() => {
    let remainingUnits = holdingsNum;
    let totalProceeds = 0;
    let totalSold = 0;

    return steps.map((step) => {
      const sellUnits = holdingsNum * (step.sellPct / 100);
      const proceeds = sellUnits * step.price;
      const cost = sellUnits * costBasisNum;
      const pnl = proceeds - cost;
      const pnlPct = cost > 0 ? ((proceeds - cost) / cost) * 100 : 0;

      remainingUnits -= sellUnits;
      totalProceeds += proceeds;
      totalSold += step.sellPct;

      return {
        ...step,
        sellUnits,
        proceeds,
        cost,
        pnl,
        pnlPct,
        remainingUnits: Math.max(0, remainingUnits),
        remainingPct: Math.max(0, 100 - totalSold),
        totalProceeds,
        isTriggered: currentPrice >= step.price,
      };
    });
  }, [steps, holdingsNum, costBasisNum, currentPrice]);

  const totalProceeds = analysis[analysis.length - 1]?.totalProceeds || 0;
  const totalCost = holdingsNum * costBasisNum;
  const positionValue = holdingsNum * currentPrice;
  const unrealizedPnL = positionValue - totalCost;

  // Risk tolerance matrix: how much to sell at each band
  const riskMatrix = useMemo(() => {
    const tolerances = [
      { label: "보수적", pcts: [15, 20, 25, 25, 15] },
      { label: "중립적", pcts: [10, 15, 20, 25, 20] },
      { label: "공격적", pcts: [5, 10, 15, 25, 30] },
      { label: "HODL", pcts: [0, 5, 10, 15, 20] },
    ];
    return tolerances;
  }, []);

  const addStep = () => {
    const lastPrice = steps.length > 0 ? steps[steps.length - 1].price : 50000;
    setSteps([...steps, { price: lastPrice + 50000, sellPct: 10 }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof ExitStep, value: number) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Exit Strategies</h1>
        </div>
        <p className="text-muted-foreground">
          가격 래더 기반 출구 전략 계획 - 리스크 밴드별 매도 시나리오 분석
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Config */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-lg font-semibold">포지션 정보</h2>
            <div>
              <label className="text-sm font-medium">BTC 보유량</label>
              <input
                type="number"
                value={holdings}
                onChange={(e) => setHoldings(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm font-medium">평균 매수가 ($)</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={costBasis}
                  onChange={(e) => setCostBasis(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">현재가</span>
                <span className="font-bold">${currentPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">포지션 가치</span>
                <span className="font-bold">{formatUSD(positionValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">미실현 P&L</span>
                <span className={`font-bold ${unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {unrealizedPnL >= 0 ? "+" : ""}{formatUSD(unrealizedPnL)}
                  {" "}({totalCost > 0 ? `${((unrealizedPnL / totalCost) * 100).toFixed(1)}%` : "0%"})
                </span>
              </div>
            </div>
          </div>

          {/* Risk Tolerance */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-3">리스크 허용도</h2>
            <input
              type="range"
              min="0"
              max="100"
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>보수적</span>
              <span>중립</span>
              <span>공격적</span>
            </div>
          </div>
        </div>

        {/* Exit Ladder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Steps */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">매도 래더</h2>
              <button
                onClick={addStep}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Plus className="h-3 w-3" /> 단계 추가
              </button>
            </div>

            <div className="space-y-2">
              {analysis.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    step.isTriggered
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                      step.isTriggered
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.isTriggered ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4 items-center">
                    <div>
                      <label className="text-[10px] text-muted-foreground">목표가</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={step.price}
                          onChange={(e) => updateStep(i, "price", parseInt(e.target.value) || 0)}
                          className="w-full rounded border border-border bg-background py-1 pl-5 pr-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">매도 비율</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={step.sellPct}
                          onChange={(e) => updateStep(i, "sellPct", parseInt(e.target.value) || 0)}
                          className="w-full rounded border border-border bg-background py-1 px-2 pr-6 text-xs font-mono"
                          min="1"
                          max="100"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">수익</p>
                      <p className="text-xs font-mono font-semibold">
                        {formatUSD(step.proceeds)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">P&L</p>
                      <p
                        className={`text-xs font-mono font-semibold ${
                          step.pnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {step.pnl >= 0 ? "+" : ""}
                        {formatUSD(step.pnl)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeStep(i)}
                    className="text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 rounded-md bg-muted/50 p-3">
              <div>
                <p className="text-[10px] text-muted-foreground">총 매도 비율</p>
                <p className="text-sm font-bold">
                  {steps.reduce((s, st) => s + st.sellPct, 0)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">총 예상 수익</p>
                <p className="text-sm font-bold text-green-500">
                  {formatUSD(totalProceeds)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">잔여 보유</p>
                <p className="text-sm font-bold">
                  {analysis.length > 0
                    ? `${analysis[analysis.length - 1].remainingPct}%`
                    : "100%"}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Band Matrix */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">
              리스크 밴드별 가격 범위
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">밴드</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">리스크 범위</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Start</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Middle</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Top</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">보유 시 가치</th>
                  </tr>
                </thead>
                <tbody>
                  {RISK_BANDS.map((band) => (
                    <tr key={band.name} className="border-b border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: band.color }}
                          />
                          {band.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{band.range}</td>
                      <td className="px-3 py-2 text-right font-mono">${band.start.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">${band.mid.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">${band.top.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-green-500">
                        {formatUSD(holdingsNum * band.mid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Tolerance Matrix */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">
              리스크 허용도 × 리스크 밴드 매트릭스 (매도 비율 %)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">전략</th>
                    {RISK_BANDS.map((b) => (
                      <th key={b.name} className="px-3 py-2 text-center font-medium text-muted-foreground">
                        <span className="flex items-center justify-center gap-1">
                          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: b.color }} />
                          {b.name}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {riskMatrix.map((row) => (
                    <tr key={row.label} className="border-b border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{row.label}</td>
                      {row.pcts.map((pct, j) => (
                        <td key={j} className="px-3 py-2 text-center font-mono">
                          <span
                            className={`inline-block rounded px-2 py-0.5 ${
                              pct >= 25
                                ? "bg-red-500/15 text-red-500"
                                : pct >= 15
                                ? "bg-yellow-500/15 text-yellow-500"
                                : pct > 0
                                ? "bg-green-500/15 text-green-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-mono font-semibold">
                        {row.pcts.reduce((a, b) => a + b, 0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-500">면책 조항</p>
              <p className="text-muted-foreground mt-1">
                이 도구는 교육 및 계획 목적으로만 사용됩니다. 투자 조언이 아닙니다.
                투자 결정 전 반드시 직접 조사하고 필요시 전문가와 상담하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
