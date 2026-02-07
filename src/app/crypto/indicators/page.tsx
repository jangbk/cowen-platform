"use client";

import { useState, useMemo } from "react";
import { Gauge, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Indicator definitions with realistic values
// ---------------------------------------------------------------------------
interface Indicator {
  name: string;
  value: number;
  displayValue: string;
  label: string;
  risk: number; // 0-1 (0=low risk, 1=high risk)
  status: "bullish" | "bearish" | "neutral" | "caution";
  description: string;
  category: "price" | "onchain" | "social";
}

const INDICATORS: Indicator[] = [
  // Price Indicators
  {
    name: "Fear & Greed Index",
    value: 71,
    displayValue: "71",
    label: "Greed",
    risk: 0.71,
    status: "caution",
    description: "시장 심리를 측정하는 복합 지수 (0=극도의 공포, 100=극도의 탐욕)",
    category: "price",
  },
  {
    name: "Pi Cycle Top",
    value: 0,
    displayValue: "Not Triggered",
    label: "Low Risk",
    risk: 0.15,
    status: "bullish",
    description: "111DMA와 350DMA×2 크로스오버 신호로 사이클 탑 예측",
    category: "price",
  },
  {
    name: "200W MA Heatmap",
    value: 72,
    displayValue: "72%",
    label: "Warm",
    risk: 0.58,
    status: "caution",
    description: "200주 이동평균 대비 가격 위치 (높을수록 과열)",
    category: "price",
  },
  {
    name: "Puell Multiple",
    value: 1.24,
    displayValue: "1.24",
    label: "Fair Value",
    risk: 0.45,
    status: "neutral",
    description: "채굴 수익 대비 연평균 비율 (높을수록 매도 압력)",
    category: "price",
  },
  // On-Chain Indicators
  {
    name: "MVRV Z-Score",
    value: 2.14,
    displayValue: "2.14",
    label: "Moderate",
    risk: 0.52,
    status: "neutral",
    description: "시장가치 대 실현가치 비율 (높을수록 고평가)",
    category: "onchain",
  },
  {
    name: "Reserve Risk",
    value: 0.003,
    displayValue: "0.003",
    label: "Low Risk",
    risk: 0.22,
    status: "bullish",
    description: "장기 보유자 확신도 대비 가격 (낮을수록 저위험 투자 기회)",
    category: "onchain",
  },
  {
    name: "NUPL",
    value: 0.58,
    displayValue: "0.58",
    label: "Belief",
    risk: 0.62,
    status: "caution",
    description: "순 미실현 이익/손실 (0.75 이상 극도의 탐욕)",
    category: "onchain",
  },
  {
    name: "RHODL Ratio",
    value: 4821,
    displayValue: "4,821",
    label: "Mid-Cycle",
    risk: 0.48,
    status: "neutral",
    description: "Realized HODL 비율로 사이클 위치 파악",
    category: "onchain",
  },
  {
    name: "SOPR",
    value: 1.04,
    displayValue: "1.04",
    label: "In Profit",
    risk: 0.35,
    status: "bullish",
    description: "지출 산출물 수익 비율 (1 이상이면 수익 실현 중)",
    category: "onchain",
  },
  {
    name: "Exchange Reserve",
    value: -2.4,
    displayValue: "-2.4%",
    label: "Outflow",
    risk: 0.18,
    status: "bullish",
    description: "거래소 BTC 보유량 30일 변화 (감소=매수 신호)",
    category: "onchain",
  },
  // Social/Derivatives Indicators
  {
    name: "Funding Rate",
    value: 0.012,
    displayValue: "0.012%",
    label: "Slightly Long",
    risk: 0.42,
    status: "neutral",
    description: "무기한 선물 펀딩율 (양수=롱 우세)",
    category: "social",
  },
  {
    name: "Long/Short Ratio",
    value: 1.18,
    displayValue: "1.18",
    label: "More Longs",
    risk: 0.55,
    status: "caution",
    description: "롱/숏 포지션 비율 (1.5 이상 과열 경고)",
    category: "social",
  },
  {
    name: "Social Dominance",
    value: 28.5,
    displayValue: "28.5%",
    label: "Moderate",
    risk: 0.38,
    status: "neutral",
    description: "소셜 미디어에서 BTC 언급 비율",
    category: "social",
  },
  {
    name: "NVT Signal",
    value: 45.2,
    displayValue: "45.2",
    label: "Fair Value",
    risk: 0.42,
    status: "neutral",
    description: "네트워크 가치 대 트랜잭션 비율 (높을수록 과대평가)",
    category: "social",
  },
];

const statusColor = {
  bullish: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  bearish: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  neutral: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  caution: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" },
};

export default function CryptoIndicatorsPage() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "price" | "onchain" | "social">("all");
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const filteredIndicators = useMemo(
    () =>
      selectedCategory === "all"
        ? INDICATORS
        : INDICATORS.filter((i) => i.category === selectedCategory),
    [selectedCategory]
  );

  // Calculate aggregate risks per category
  const priceIndicators = INDICATORS.filter((i) => i.category === "price");
  const onchainIndicators = INDICATORS.filter((i) => i.category === "onchain");
  const socialIndicators = INDICATORS.filter((i) => i.category === "social");

  const avgRisk = (arr: Indicator[]) =>
    arr.reduce((sum, i) => sum + i.risk, 0) / arr.length;

  const overallRisk =
    avgRisk(priceIndicators) * 0.35 +
    avgRisk(onchainIndicators) * 0.45 +
    avgRisk(socialIndicators) * 0.2;

  const bullish = INDICATORS.filter((i) => i.status === "bullish").length;
  const bearish = INDICATORS.filter((i) => i.status === "bearish").length;
  const neutral = INDICATORS.length - bullish - bearish;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Indicator Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          실시간 온체인 및 시장 지표 - 비트코인 사이클 분석을 위한 리스크 게이지
        </p>
      </div>

      {/* Top Section: Main Gauge + Sub Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main Gauge */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            종합 Crypto Risk
          </h2>
          <GaugeChart
            value={overallRisk}
            label="Crypto Risk Indicator"
            size="lg"
            subMetrics={[
              { label: "Price", value: avgRisk(priceIndicators), color: "#3b82f6" },
              { label: "On-Chain", value: avgRisk(onchainIndicators), color: "#8b5cf6" },
              { label: "Social", value: avgRisk(socialIndicators), color: "#f59e0b" },
            ]}
          />
        </div>

        {/* Sub Gauges */}
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            Price Risk
          </h3>
          <GaugeChart
            value={avgRisk(priceIndicators)}
            label="가격 기반 지표"
            size="sm"
          />
          <p className="mt-2 text-xs text-muted-foreground text-center">
            {priceIndicators.length}개 지표
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">
            On-Chain Risk
          </h3>
          <GaugeChart
            value={avgRisk(onchainIndicators)}
            label="온체인 지표"
            size="sm"
          />
          <p className="mt-2 text-xs text-muted-foreground text-center">
            {onchainIndicators.length}개 지표
          </p>
        </div>
      </div>

      {/* Signal Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-green-500">{bullish}</p>
            <p className="text-sm text-muted-foreground">Bullish Signals</p>
          </div>
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-3">
          <Minus className="h-8 w-8 text-yellow-500" />
          <div>
            <p className="text-2xl font-bold text-yellow-500">{neutral}</p>
            <p className="text-sm text-muted-foreground">Neutral / Caution</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 flex items-center gap-3">
          <TrendingDown className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-red-500">{bearish}</p>
            <p className="text-sm text-muted-foreground">Bearish Signals</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1">
        {(
          [
            { key: "all", label: "전체" },
            { key: "price", label: "Price" },
            { key: "onchain", label: "On-Chain" },
            { key: "social", label: "Social/Derivatives" },
          ] as const
        ).map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium ${
              selectedCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Indicator Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredIndicators.map((ind) => {
          const colors = statusColor[ind.status];
          return (
            <div
              key={ind.name}
              className={`rounded-lg border bg-card p-4 transition-all hover:shadow-sm ${colors.border}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold leading-tight">
                  {ind.name}
                </h3>
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                  onClick={() =>
                    setShowInfo(showInfo === ind.name ? null : ind.name)
                  }
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Risk bar */}
              <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${ind.risk * 100}%`,
                    background: `linear-gradient(90deg, #10b981, #eab308 50%, #ef4444)`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{ind.displayValue}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {ind.label}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  Risk: {(ind.risk * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  {ind.category}
                </span>
              </div>

              {showInfo === ind.name && (
                <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
                  {ind.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk Summary Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">리스크 요약 테이블</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  지표
                </th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                  값
                </th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                  리스크
                </th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">
                  신호
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  카테고리
                </th>
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map((ind) => {
                const colors = statusColor[ind.status];
                return (
                  <tr
                    key={ind.name}
                    className="border-b border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-2 font-medium">{ind.name}</td>
                    <td className="px-4 py-2 text-center font-mono">
                      {ind.displayValue}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="h-2 w-12 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${ind.risk * 100}%`,
                              background:
                                ind.risk < 0.33
                                  ? "#10b981"
                                  : ind.risk < 0.66
                                  ? "#eab308"
                                  : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">
                          {(ind.risk * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {ind.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground capitalize text-xs">
                      {ind.category}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
