"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Target,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Info,
  ChevronDown,
  TrendingUp,
} from "lucide-react";

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

interface AssetConfig {
  id: string;
  name: string;
  symbol: string;
  coingeckoId: string;
  fallbackPrice: number;
  defaultHoldings: string;
  defaultCostBasis: string;
  defaultSteps: ExitStep[];
  riskBands: RiskBand[];
  stepIncrement: number;
}

const BAND_COLORS = ["#10b981", "#84cc16", "#eab308", "#f97316", "#ef4444"];

const ASSETS: AssetConfig[] = [
  {
    id: "BTC",
    name: "Bitcoin",
    symbol: "BTC",
    coingeckoId: "bitcoin",
    fallbackPrice: 97000,
    defaultHoldings: "1.5",
    defaultCostBasis: "42000",
    defaultSteps: [
      { price: 80000, sellPct: 10 },
      { price: 100000, sellPct: 10 },
      { price: 120000, sellPct: 15 },
      { price: 150000, sellPct: 20 },
      { price: 200000, sellPct: 20 },
      { price: 300000, sellPct: 15 },
    ],
    riskBands: [
      { name: "Band 1", range: "0.0 - 0.2", start: 70000, mid: 85000, top: 100000, color: BAND_COLORS[0] },
      { name: "Band 2", range: "0.2 - 0.4", start: 100000, mid: 120000, top: 150000, color: BAND_COLORS[1] },
      { name: "Band 3", range: "0.4 - 0.6", start: 150000, mid: 180000, top: 220000, color: BAND_COLORS[2] },
      { name: "Band 4", range: "0.6 - 0.8", start: 220000, mid: 280000, top: 350000, color: BAND_COLORS[3] },
      { name: "Band 5", range: "0.8 - 1.0", start: 350000, mid: 450000, top: 600000, color: BAND_COLORS[4] },
    ],
    stepIncrement: 50000,
  },
  {
    id: "ETH",
    name: "Ethereum",
    symbol: "ETH",
    coingeckoId: "ethereum",
    fallbackPrice: 2600,
    defaultHoldings: "10",
    defaultCostBasis: "1800",
    defaultSteps: [
      { price: 3000, sellPct: 10 },
      { price: 4000, sellPct: 10 },
      { price: 5000, sellPct: 15 },
      { price: 6000, sellPct: 20 },
      { price: 8000, sellPct: 20 },
      { price: 10000, sellPct: 15 },
    ],
    riskBands: [
      { name: "Band 1", range: "0.0 - 0.2", start: 2500, mid: 3200, top: 4000, color: BAND_COLORS[0] },
      { name: "Band 2", range: "0.2 - 0.4", start: 4000, mid: 5000, top: 6000, color: BAND_COLORS[1] },
      { name: "Band 3", range: "0.4 - 0.6", start: 6000, mid: 7500, top: 9000, color: BAND_COLORS[2] },
      { name: "Band 4", range: "0.6 - 0.8", start: 9000, mid: 11000, top: 14000, color: BAND_COLORS[3] },
      { name: "Band 5", range: "0.8 - 1.0", start: 14000, mid: 18000, top: 25000, color: BAND_COLORS[4] },
    ],
    stepIncrement: 2000,
  },
  {
    id: "XRP",
    name: "XRP",
    symbol: "XRP",
    coingeckoId: "ripple",
    fallbackPrice: 2.5,
    defaultHoldings: "10000",
    defaultCostBasis: "0.5",
    defaultSteps: [
      { price: 2, sellPct: 10 },
      { price: 3, sellPct: 10 },
      { price: 5, sellPct: 15 },
      { price: 7, sellPct: 20 },
      { price: 10, sellPct: 20 },
      { price: 15, sellPct: 15 },
    ],
    riskBands: [
      { name: "Band 1", range: "0.0 - 0.2", start: 1.5, mid: 2.5, top: 3.5, color: BAND_COLORS[0] },
      { name: "Band 2", range: "0.2 - 0.4", start: 3.5, mid: 5, top: 7, color: BAND_COLORS[1] },
      { name: "Band 3", range: "0.4 - 0.6", start: 7, mid: 9, top: 12, color: BAND_COLORS[2] },
      { name: "Band 4", range: "0.6 - 0.8", start: 12, mid: 16, top: 22, color: BAND_COLORS[3] },
      { name: "Band 5", range: "0.8 - 1.0", start: 22, mid: 30, top: 50, color: BAND_COLORS[4] },
    ],
    stepIncrement: 2,
  },
];

function formatUSD(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPrice(v: number): string {
  if (v >= 1000) return `$${v.toLocaleString()}`;
  if (v >= 1) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${v.toFixed(4)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ExitStrategiesPage() {
  const [assetId, setAssetId] = useState("BTC");
  const config = ASSETS.find((a) => a.id === assetId)!;

  const [holdings, setHoldings] = useState(config.defaultHoldings);
  const [costBasis, setCostBasis] = useState(config.defaultCostBasis);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(true);
  const [steps, setSteps] = useState<ExitStep[]>(config.defaultSteps);
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [showGuide, setShowGuide] = useState(false);

  // Reset defaults when asset changes
  const switchAsset = (id: string) => {
    const c = ASSETS.find((a) => a.id === id)!;
    setAssetId(id);
    setHoldings(c.defaultHoldings);
    setCostBasis(c.defaultCostBasis);
    setSteps(c.defaultSteps);
  };

  // Fetch live price
  useEffect(() => {
    setPriceLoading(true);
    const ids = ASSETS.map((a) => a.coingeckoId).join(",");
    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    )
      .then((r) => r.json())
      .then((d) => {
        const p = d[config.coingeckoId]?.usd;
        setCurrentPrice(p ?? config.fallbackPrice);
      })
      .catch(() => setCurrentPrice(config.fallbackPrice))
      .finally(() => setPriceLoading(false));
  }, [config.coingeckoId, config.fallbackPrice]);

  const holdingsNum = parseFloat(holdings) || 0;
  const costBasisNum = parseFloat(costBasis) || 0;

  const analysis = useMemo(() => {
    let remainingUnits = holdingsNum;
    let totalProceeds = 0;
    let totalSold = 0;

    return steps.map((step) => {
      const sellUnits = holdingsNum * (step.sellPct / 100);
      const proceeds = sellUnits * step.price;
      const cost = sellUnits * costBasisNum;
      const pnl = proceeds - cost;

      remainingUnits -= sellUnits;
      totalProceeds += proceeds;
      totalSold += step.sellPct;

      return {
        ...step,
        sellUnits,
        proceeds,
        cost,
        pnl,
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

  const riskMatrix = [
    { label: "보수적", pcts: [15, 20, 25, 25, 15] },
    { label: "중립적", pcts: [10, 15, 20, 25, 20] },
    { label: "공격적", pcts: [5, 10, 15, 25, 30] },
    { label: "HODL", pcts: [0, 5, 10, 15, 20] },
  ];

  const addStep = () => {
    const lastPrice =
      steps.length > 0 ? steps[steps.length - 1].price : config.stepIncrement;
    setSteps([
      ...steps,
      { price: lastPrice + config.stepIncrement, sellPct: 10 },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (
    index: number,
    field: keyof ExitStep,
    value: number
  ) => {
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
                Exit Strategy란?
              </h4>
              <p>
                출구 전략은 보유 자산을 <strong>언제, 얼마만큼 매도할지</strong>를
                미리 계획하는 것입니다. 감정적인 판단을 배제하고, 목표 가격에
                도달할 때마다 단계적으로 수익을 실현하여 리스크를 관리합니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                1. 자산 및 포지션 입력
              </h4>
              <p>
                BTC / ETH / XRP 중 자산을 선택하고, 보유 수량과 평균 매수가를
                입력합니다. 현재가는 CoinGecko에서 실시간으로 가져옵니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                2. 매도 래더 설정
              </h4>
              <p>
                각 단계별로 <strong>목표 매도 가격</strong>과{" "}
                <strong>매도 비율(%)</strong>을 설정합니다. 예: BTC가 $100K에
                도달하면 보유량의 10%를 매도. &quot;단계 추가&quot; 버튼으로
                래더를 늘리거나, 휴지통 아이콘으로 삭제할 수 있습니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                3. 리스크 밴드 참고
              </h4>
              <p>
                리스크 밴드는 자산의 과열 정도를 5단계로 구분한 것입니다.
                Band 1(저위험)에서 Band 5(고위험)로 갈수록 가격이 높고 하락
                리스크도 커집니다. 각 밴드의 가격 범위를 참고하여 래더의 목표가를
                설정하세요.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                4. 리스크 허용도 매트릭스
              </h4>
              <p>
                보수적 ~ 공격적(HODL) 4가지 성향별로 각 밴드에서 얼마나
                매도하는지 참고 비율을 보여줍니다. 자신의 투자 성향에 맞는 전략을
                선택하고, 매도 래더에 반영하세요.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                5. 결과 확인
              </h4>
              <p>
                각 단계별 예상 수익(Proceeds), 손익(P&L)이 자동 계산되며,
                현재가를 이미 넘은 단계는 초록색으로 표시됩니다. 하단 요약에서 총
                매도 비율, 총 예상 수익, 잔여 보유 비율을 확인할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Asset Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {ASSETS.map((a) => (
          <button
            key={a.id}
            onClick={() => switchAsset(a.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              assetId === a.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {a.name} ({a.symbol})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Config */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-lg font-semibold">포지션 정보</h2>
            <div>
              <label className="text-sm font-medium">
                {config.symbol} 보유량
              </label>
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
                <span className="text-muted-foreground">
                  {config.symbol} 현재가 (실시간)
                </span>
                {priceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="font-bold">
                    {formatPrice(currentPrice)}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">포지션 가치</span>
                <span className="font-bold">{formatUSD(positionValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">미실현 P&L</span>
                <span
                  className={`font-bold ${unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {unrealizedPnL >= 0 ? "+" : ""}
                  {formatUSD(unrealizedPnL)} (
                  {totalCost > 0
                    ? `${((unrealizedPnL / totalCost) * 100).toFixed(1)}%`
                    : "0%"}
                  )
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                {config.symbol} 매도 래더
              </h2>
              <button
                onClick={addStep}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Plus className="h-3 w-3" /> 단계 추가
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">
              목표가와 매도 비율을 직접 설정하세요. 아래의 <strong>리스크 밴드</strong>(가격 기준)와 <strong>매트릭스</strong>(비율 참고)를 활용하면 체계적인 래더를 구성할 수 있습니다.
            </p>

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
                      <label className="text-[10px] text-muted-foreground">
                        목표가
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          $
                        </span>
                        <input
                          type="number"
                          value={step.price}
                          onChange={(e) =>
                            updateStep(
                              i,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full rounded border border-border bg-background py-1 pl-5 pr-1 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">
                        매도 비율
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={step.sellPct}
                          onChange={(e) =>
                            updateStep(
                              i,
                              "sellPct",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full rounded border border-border bg-background py-1 px-2 pr-6 text-xs font-mono"
                          min="1"
                          max="100"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
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
                <p className="text-[10px] text-muted-foreground">
                  총 매도 비율
                </p>
                <p className="text-sm font-bold">
                  {steps.reduce((s, st) => s + st.sellPct, 0)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  총 예상 수익
                </p>
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

          {/* ─── 래더 설정 참고 자료 ─── */}
          <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-5 space-y-6">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">래더 설정 참고 자료</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">밴드 → 매트릭스 → 래더 순으로 활용</span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed -mt-2">
              <strong>① 리스크 밴드</strong>에서 각 가격대의 위험 수준을 확인하고,
              <strong> ② 매트릭스</strong>에서 본인의 리스크 허용도에 맞는 매도 비율을 참고한 뒤,
              <strong> ③ 위의 매도 래더</strong>에 목표가와 비율을 입력하세요.
            </p>

            {/* Risk Band Table */}
            <div>
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold">①</span>
                {config.symbol} 리스크 밴드별 가격 범위
              </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      밴드
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      리스크 범위
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Start
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Middle
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Top
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      보유 시 가치
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.riskBands.map((band) => (
                    <tr
                      key={band.name}
                      className="border-b border-border hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: band.color }}
                          />
                          {band.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {band.range}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatPrice(band.start)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">
                        {formatPrice(band.mid)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatPrice(band.top)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-green-500">
                        {formatUSD(holdingsNum * band.mid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 밴드 해석 가이드 */}
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  리스크 밴드 해석 기준
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  리스크 범위(0.0~1.0)는 과거 사이클의 저점~고점을 기준으로 현재 가격의 <strong>과열 정도</strong>를 나타냅니다.
                  0에 가까울수록 사이클 초기(저평가), 1에 가까울수록 사이클 후반(고평가·버블)입니다.
                  각 밴드의 Start → Mid → Top은 해당 과열 구간의 하단 → 중간 → 상단 가격입니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2">
                  {[
                    { band: "Band 1", color: BAND_COLORS[0], label: "저위험", desc: "축적 구간. 매도 서두를 필요 없음" },
                    { band: "Band 2", color: BAND_COLORS[1], label: "저~중위험", desc: "일부 이익 실현 시작 고려" },
                    { band: "Band 3", color: BAND_COLORS[2], label: "중위험", desc: "과열 시작. 분할 매도 본격 실행" },
                    { band: "Band 4", color: BAND_COLORS[3], label: "고위험", desc: "사이클 후반. 대부분 익절 권장" },
                    { band: "Band 5", color: BAND_COLORS[4], label: "극고위험", desc: "버블 영역. 잔여 물량 정리" },
                  ].map((item) => (
                    <div key={item.band} className="rounded-md border border-border/50 p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] font-bold">{item.band}</span>
                        <span className="text-[9px] font-medium px-1 py-0.5 rounded" style={{ backgroundColor: `${item.color}20`, color: item.color }}>{item.label}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  활용법
                </h3>
                <ol className="text-[11px] text-muted-foreground space-y-1.5 pl-5 list-decimal leading-relaxed">
                  <li>현재 {config.symbol} 가격이 <strong>어느 밴드에 위치</strong>하는지 확인합니다.</li>
                  <li>밴드가 높을수록 수익 잠재력은 크지만 <strong>급락 리스크도 급격히 증가</strong>합니다.</li>
                  <li>위의 래더 목표가를 밴드 경계에 맞춰 설정하면 <strong>리스크 대비 체계적인 매도</strong>가 가능합니다.</li>
                  <li>Band 1~2에서는 보유 위주, Band 3부터 분할 매도, Band 4~5에서는 적극적 익절을 고려하세요.</li>
                </ol>
              </div>
            </div>
            </div>

            {/* Risk Tolerance Matrix */}
            <div>
              <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold">②</span>
                리스크 허용도 x 리스크 밴드 매트릭스 (매도 비율 %)
              </h3>
              <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      전략
                    </th>
                    {config.riskBands.map((b) => (
                      <th
                        key={b.name}
                        className="px-3 py-2 text-center font-medium text-muted-foreground"
                      >
                        <span className="flex items-center justify-center gap-1">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: b.color }}
                          />
                          {b.name}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      합계
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {riskMatrix.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-border hover:bg-muted/20"
                    >
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

            {/* 매트릭스 해석 가이드 */}
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                <h3 className="text-xs font-semibold flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  매트릭스 해석 기준
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  이 매트릭스는 <strong>리스크 허용도(세로축)</strong>와 <strong>리스크 밴드(가로축)</strong>의 조합에 따라 각 구간에서 <strong>보유량의 몇 %를 매도</strong>할지를 제안합니다.
                  합계가 100%에 가까울수록 최종적으로 대부분 매도, 낮을수록 일부를 장기 보유한다는 의미입니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <div className="rounded-md border border-border/50 p-2.5">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">🛡 보수적</p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      초반 밴드(Band 1~2)에서부터 비교적 큰 비율로 매도를 시작합니다.
                      이익을 일찍 확보하고 고점 리스크를 줄이는 전략입니다.
                      추가 상승분을 놓칠 수 있지만, 하락장에서 손실이 적습니다.
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 p-2.5">
                    <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 mb-1">⚖ 중립적</p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      밴드 전반에 걸쳐 균형 있게 배분합니다.
                      초반에는 소량 매도, 중후반에 비중을 높여 상승 수익과 리스크 관리를 절충합니다.
                      대부분의 투자자에게 적합한 기본 전략입니다.
                    </p>
                  </div>
                  <div className="rounded-md border border-border/50 p-2.5">
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1">🔥 공격적</p>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      초반 밴드에서는 거의 매도하지 않고, 고위험 밴드(Band 4~5)에서 집중 매도합니다.
                      최대 수익을 노리지만, 가격이 고점에 도달하지 못하면 매도 기회를 놓칠 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  활용법
                </h3>
                <ol className="text-[11px] text-muted-foreground space-y-1.5 pl-5 list-decimal leading-relaxed">
                  <li>본인의 <strong>리스크 허용도</strong>를 판단합니다 — 원금 보전이 우선이면 보수적, 최대 수익이 목표면 공격적.</li>
                  <li>해당 행(보수적/중립적/공격적)의 밴드별 %를 확인하고, 위의 <strong>래더 목표가에 반영</strong>합니다.</li>
                  <li>예: 중립적 전략에서 Band 3 = 20%이면, Band 3 가격대({formatPrice(config.riskBands[2].start)}~{formatPrice(config.riskBands[2].top)})에서 보유량의 20%를 매도 설정합니다.</li>
                  <li>매트릭스 색상도 참고하세요 — <span className="text-green-500 font-medium">녹색(소량)</span>, <span className="text-yellow-500 font-medium">노랑(중간)</span>, <span className="text-red-500 font-medium">빨강(대량)</span> 매도.</li>
                </ol>
              </div>
            </div>
            </div>
          </div>

          {/* Disclaimers */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              주의사항
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
              <li>
                본 도구는 <strong>교육 및 계획 목적</strong>으로만 사용되며,
                투자 조언이 아닙니다.
              </li>
              <li>
                리스크 밴드의 가격 범위는 과거 사이클을 참고한{" "}
                <strong>추정치</strong>이며, 실제 시장과 다를 수 있습니다.
              </li>
              <li>
                실제 매도 시 <strong>거래 수수료, 슬리피지, 세금</strong> 등
                추가 비용이 발생합니다.
              </li>
              <li>
                암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험
                자산입니다. 투자 원금의 일부 또는 전부를 잃을 수 있습니다.
              </li>
              <li>
                투자 결정은 반드시 <strong>본인의 판단과 책임</strong> 하에
                이루어져야 합니다. 필요시 전문가와 상담하세요.
              </li>
              <li>
                현재가 출처:{" "}
                <a
                  href="https://www.coingecko.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  CoinGecko
                </a>{" "}
                (페이지 로드 시 1회 조회)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
