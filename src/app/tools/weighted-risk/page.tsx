"use client";

import { useState, useMemo } from "react";
import { Shield, AlertTriangle, Plus, Trash2 } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RiskMetric {
  name: string;
  value: number;
  displayValue: string;
  weight: number;
  score: number; // 0-100
  signal: string;
  description: string;
}

interface PortfolioAsset {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  price: number;
  risk: number; // 0-1
}

const DEFAULT_METRICS: RiskMetric[] = [
  { name: "MVRV Z-Score", value: 2.14, displayValue: "2.14", weight: 15, score: 55, signal: "Neutral", description: "시장가치/실현가치 비율" },
  { name: "Reserve Risk", value: 0.003, displayValue: "0.003", weight: 15, score: 25, signal: "Low Risk", description: "장기보유자 확신도" },
  { name: "Puell Multiple", value: 1.24, displayValue: "1.24", weight: 10, score: 50, signal: "Fair Value", description: "채굴수익 연평균 대비" },
  { name: "Pi Cycle Top", value: 0, displayValue: "No", weight: 10, score: 10, signal: "Not Triggered", description: "111DMA/350DMA 크로스" },
  { name: "200W MA Multiple", value: 2.58, displayValue: "2.58", weight: 10, score: 65, signal: "Elevated", description: "200주 이동평균 배수" },
  { name: "RHODL Ratio", value: 4821, displayValue: "4,821", weight: 10, score: 55, signal: "Mid-Cycle", description: "Realized HODL 비율" },
  { name: "NUPL", value: 0.58, displayValue: "0.58", weight: 10, score: 60, signal: "Belief", description: "순 미실현 이익/손실" },
  { name: "SOPR", value: 1.04, displayValue: "1.04", weight: 10, score: 35, signal: "In Profit", description: "지출 산출물 수익 비율" },
  { name: "Exchange Reserves", value: -2.4, displayValue: "-2.4%", weight: 10, score: 20, signal: "Outflow", description: "거래소 BTC 30일 변화" },
];

const DEFAULT_PORTFOLIO: PortfolioAsset[] = [
  { id: "1", name: "Bitcoin", symbol: "BTC", quantity: 1.5, price: 98420, risk: 0.45 },
  { id: "2", name: "Ethereum", symbol: "ETH", quantity: 15, price: 3285, risk: 0.52 },
  { id: "3", name: "Solana", symbol: "SOL", quantity: 100, price: 198, risk: 0.62 },
];

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#06b6d4", "#f97316"];

function formatUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

// Simple donut chart
function PortfolioDonut({ assets }: { assets: PortfolioAsset[] }) {
  const total = assets.reduce((s, a) => s + a.quantity * a.price, 0);
  if (total === 0) return null;

  const size = 180;
  const r = size / 2 - 12;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size}>
        {assets.map((a, i) => {
          const pct = (a.quantity * a.price) / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={a.id}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
        })}
        <circle cx={c} cy={c} r={r - 16} className="fill-background" />
        <text x={c} y={c - 4} textAnchor="middle" className="fill-foreground text-sm font-bold" fontSize="14">
          {formatUSD(total)}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          총 포트폴리오
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {assets.map((a, i) => {
          const pct = ((a.quantity * a.price) / total) * 100;
          return (
            <span key={a.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {a.symbol} ({pct.toFixed(1)}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WeightedRiskPage() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);

  // Composite score
  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  const compositeScore = totalWeight > 0
    ? metrics.reduce((s, m) => s + (m.score * m.weight) / totalWeight, 0)
    : 0;

  // Weighted portfolio risk
  const portfolioValue = portfolio.reduce((s, a) => s + a.quantity * a.price, 0);
  const weightedRisk = portfolioValue > 0
    ? portfolio.reduce((s, a) => s + a.risk * ((a.quantity * a.price) / portfolioValue), 0)
    : 0;

  const riskLevel = compositeScore > 75 ? "High Risk" : compositeScore > 50 ? "Elevated" : compositeScore > 25 ? "Moderate" : "Low Risk";

  const updateWeight = (name: string, weight: number) => {
    setMetrics(metrics.map((m) => (m.name === name ? { ...m, weight } : m)));
  };

  const addAsset = () => {
    const id = Date.now().toString();
    setPortfolio([...portfolio, { id, name: "New Asset", symbol: "???", quantity: 0, price: 0, risk: 0.5 }]);
  };

  const removeAsset = (id: string) => {
    setPortfolio(portfolio.filter((a) => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof PortfolioAsset, value: string | number) => {
    setPortfolio(
      portfolio.map((a) => (a.id === id ? { ...a, [field]: typeof value === "string" ? value : value } : a))
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Weighted Risk Assessment</h1>
        </div>
        <p className="text-muted-foreground">
          온체인/시장 지표 가중 리스크 점수 + 포트폴리오 가중 리스크 분석
        </p>
      </div>

      {/* Top: Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Market Risk Score</h3>
          <GaugeChart
            value={compositeScore / 100}
            label="시장 리스크"
            size="lg"
          />
          <p className={`mt-2 text-sm font-semibold ${
            compositeScore > 75 ? "text-red-500" : compositeScore > 50 ? "text-yellow-500" : compositeScore > 25 ? "text-blue-500" : "text-green-500"
          }`}>
            {riskLevel} ({compositeScore.toFixed(0)}/100)
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Portfolio Risk</h3>
          <GaugeChart
            value={weightedRisk}
            label="포트폴리오 가중 리스크"
            size="lg"
            subMetrics={portfolio.map((a, i) => ({
              label: a.symbol,
              value: a.risk,
              color: COLORS[i % COLORS.length],
            }))}
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-6 flex items-center justify-center">
          <PortfolioDonut assets={portfolio} />
        </div>
      </div>

      {/* Portfolio Holdings */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">포트폴리오 자산</h2>
          <button
            onClick={addAsset}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> 자산 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">자산</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">심볼</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">수량</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">가격</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">가치</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">리스크 (0-1)</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">비중</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((a, i) => {
                const val = a.quantity * a.price;
                const pct = portfolioValue > 0 ? (val / portfolioValue) * 100 : 0;
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => updateAsset(a.id, "name", e.target.value)}
                        className="w-full bg-transparent text-sm font-medium focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={a.symbol}
                        onChange={(e) => updateAsset(a.id, "symbol", e.target.value)}
                        className="w-16 bg-transparent text-sm uppercase focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={a.quantity}
                        onChange={(e) => updateAsset(a.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={a.price}
                        onChange={(e) => updateAsset(a.id, "price", parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatUSD(val)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(a.risk * 100)}
                          onChange={(e) => updateAsset(a.id, "risk", parseInt(e.target.value) / 100)}
                          className="w-16 accent-primary"
                        />
                        <span className="text-xs font-mono w-8">{a.risk.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-mono text-white"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeAsset(a.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">온체인/시장 리스크 지표 (가중치 조절 가능)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">지표</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">현재값</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">신호</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">리스크 점수</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">가중치</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">기여도</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.name} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">{m.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{m.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{m.displayValue}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.score > 65 ? "bg-red-500/10 text-red-500" :
                      m.score > 40 ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-green-500/10 text-green-500"
                    }`}>
                      {m.signal}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-2 w-16 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.score > 65 ? "bg-red-500" : m.score > 40 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${m.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-6">{m.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={m.weight}
                      onChange={(e) => updateWeight(m.name, parseInt(e.target.value) || 0)}
                      className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-xs font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {totalWeight > 0 ? ((m.score * m.weight) / totalWeight).toFixed(1) : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          가중치를 조절하여 개인 투자 방법론에 맞게 복합 점수를 커스터마이징하세요.
          현재 총 가중치: <strong>{totalWeight}%</strong>. 점수는 총 가중치와 무관하게 정규화됩니다.
        </p>
      </div>
    </div>
  );
}
