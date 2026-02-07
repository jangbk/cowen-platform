"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Calculator,
  DollarSign,
  Calendar,
  TrendingUp,
  Loader2,
  ChevronDown,
} from "lucide-react";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// DCA Calculation Engine
// ---------------------------------------------------------------------------
type Frequency = "daily" | "weekly" | "biweekly" | "monthly";
type Strategy = "equal" | "lumpsum" | "dynamic";

interface Trade {
  date: string;
  price: number;
  amount: number;
  units: number;
  totalInvested: number;
  totalUnits: number;
  portfolioValue: number;
}

function generatePriceHistory(
  asset: string,
  startDate: string,
  endDate: string
): Array<{ date: string; price: number }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000);

  // Deterministic seed based on asset
  let seed = 0;
  for (let i = 0; i < asset.length; i++) seed = ((seed << 5) - seed + asset.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const basePrice: Record<string, number> = {
    BTC: 29000, ETH: 1800, SOL: 22, ADA: 0.35, BNB: 240, XRP: 0.55,
    SPX: 3800, XAU: 1850, AGG: 100,
  };
  const volatility: Record<string, number> = {
    BTC: 0.035, ETH: 0.04, SOL: 0.055, ADA: 0.05, BNB: 0.035, XRP: 0.045,
    SPX: 0.012, XAU: 0.008, AGG: 0.003,
  };
  const trend: Record<string, number> = {
    BTC: 0.0015, ETH: 0.001, SOL: 0.002, ADA: 0.0005, BNB: 0.001, XRP: 0.001,
    SPX: 0.0005, XAU: 0.0003, AGG: 0.0001,
  };

  const bp = basePrice[asset] || 100;
  const vol = volatility[asset] || 0.03;
  const tr = trend[asset] || 0.001;

  const prices: Array<{ date: string; price: number }> = [];
  let price = bp;

  for (let d = 0; d <= days; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);

    const noise =
      Math.sin(d * 0.08 + seed) * vol * bp * 0.5 +
      Math.sin(d * 0.03 + seed * 2) * vol * bp * 0.8 +
      (((seed * (d + 1) * 13) % 1000) / 500 - 1) * vol * bp * 0.3;

    price = Math.max(bp * 0.1, price + noise + tr * bp);

    prices.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(price * 100) / 100,
    });
  }

  return prices;
}

function shouldBuy(
  date: string,
  frequency: Frequency,
  startDate: string
): boolean {
  const d = new Date(date);
  const s = new Date(startDate);
  const diff = Math.floor((d.getTime() - s.getTime()) / 86400000);

  switch (frequency) {
    case "daily":
      return true;
    case "weekly":
      return diff % 7 === 0;
    case "biweekly":
      return diff % 14 === 0;
    case "monthly":
      return d.getDate() === s.getDate() || (d.getDate() === 1 && diff > 0);
    default:
      return false;
  }
}

function runDCA(
  prices: Array<{ date: string; price: number }>,
  amount: number,
  frequency: Frequency,
  strategy: Strategy,
  startDate: string
): Trade[] {
  const trades: Trade[] = [];
  let totalInvested = 0;
  let totalUnits = 0;

  if (strategy === "lumpsum") {
    // Invest everything at start
    const lumpAmount = amount * (frequency === "daily" ? 365 : frequency === "weekly" ? 52 : frequency === "biweekly" ? 26 : 12);
    const firstPrice = prices[0].price;
    totalInvested = lumpAmount;
    totalUnits = lumpAmount / firstPrice;

    trades.push({
      date: prices[0].date,
      price: firstPrice,
      amount: lumpAmount,
      units: totalUnits,
      totalInvested,
      totalUnits,
      portfolioValue: totalUnits * firstPrice,
    });

    // Track portfolio value on each price point
    for (let i = 1; i < prices.length; i++) {
      if (shouldBuy(prices[i].date, frequency, startDate)) {
        trades.push({
          date: prices[i].date,
          price: prices[i].price,
          amount: 0,
          units: 0,
          totalInvested,
          totalUnits,
          portfolioValue: totalUnits * prices[i].price,
        });
      }
    }
  } else {
    for (let i = 0; i < prices.length; i++) {
      if (!shouldBuy(prices[i].date, frequency, startDate)) continue;

      let buyAmount = amount;
      if (strategy === "dynamic") {
        // Dynamic: invest more when price is below average, less when above
        const avgPrice = totalUnits > 0 ? totalInvested / totalUnits : prices[i].price;
        const ratio = avgPrice / prices[i].price;
        buyAmount = amount * Math.max(0.5, Math.min(2, ratio));
      }

      const units = buyAmount / prices[i].price;
      totalInvested += buyAmount;
      totalUnits += units;

      trades.push({
        date: prices[i].date,
        price: prices[i].price,
        amount: Math.round(buyAmount * 100) / 100,
        units: Math.round(units * 1e8) / 1e8,
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalUnits: Math.round(totalUnits * 1e8) / 1e8,
        portfolioValue: Math.round(totalUnits * prices[i].price * 100) / 100,
      });
    }
  }

  return trades;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ASSETS = [
  { id: "BTC", name: "Bitcoin" },
  { id: "ETH", name: "Ethereum" },
  { id: "SOL", name: "Solana" },
  { id: "BNB", name: "BNB" },
  { id: "XRP", name: "XRP" },
  { id: "ADA", name: "Cardano" },
  { id: "SPX", name: "S&P 500" },
  { id: "XAU", name: "Gold" },
];

export default function DCASimulationPage() {
  const [asset, setAsset] = useState("BTC");
  const [amount, setAmount] = useState("500");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [strategy, setStrategy] = useState<Strategy>("equal");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [showTradeHistory, setShowTradeHistory] = useState(false);

  const results = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return null;

    const prices = generatePriceHistory(asset, startDate, endDate);
    if (prices.length < 2) return null;

    const trades = runDCA(prices, amt, frequency, strategy, startDate);
    if (trades.length === 0) return null;

    const lastTrade = trades[trades.length - 1];
    const allPrices = trades.filter((t) => t.amount > 0).map((t) => t.price);
    const avgCostBasis =
      lastTrade.totalInvested / (lastTrade.totalUnits || 1);
    const totalReturn =
      ((lastTrade.portfolioValue - lastTrade.totalInvested) /
        lastTrade.totalInvested) *
      100;

    // Chart data: portfolio value over time
    const chartData = trades.map((t) => ({
      time: t.date,
      value: t.portfolioValue,
    }));

    // Invested line data
    const investedData = trades.map((t) => ({
      time: t.date,
      value: t.totalInvested,
    }));

    return {
      trades,
      chartData,
      investedData,
      totalInvested: lastTrade.totalInvested,
      currentValue: lastTrade.portfolioValue,
      totalReturn,
      avgCostBasis,
      unitsAccumulated: lastTrade.totalUnits,
      currentPrice: trades[trades.length - 1].price,
      bestBuyPrice: Math.min(...allPrices),
      worstBuyPrice: Math.max(...allPrices),
      numBuys: trades.filter((t) => t.amount > 0).length,
    };
  }, [asset, amount, frequency, strategy, startDate, endDate]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">DCA Simulation</h1>
        </div>
        <p className="text-muted-foreground">
          달러 비용 평균법(DCA) 시뮬레이션 - 자산, 금액, 주기, 전략별 비교 분석
        </p>
      </div>

      {/* Strategy Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(
          [
            { key: "equal", label: "균등 투자" },
            { key: "lumpsum", label: "일시불 투자" },
            { key: "dynamic", label: "동적 DCA" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setStrategy(s.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              strategy === s.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Config Panel */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold">설정</h2>

          <div>
            <label className="text-sm font-medium">자산</label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {ASSETS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              {strategy === "lumpsum" ? "총 투자금 ($)" : "회당 투자금 ($)"}
            </label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">투자 주기</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="biweekly">격주</option>
              <option value="monthly">매월</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">시작일</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">종료일</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-2 text-sm"
                />
              </div>
            </div>
          </div>

          {strategy === "dynamic" && (
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              동적 DCA: 평균 매수가 대비 현재가가 낮으면 더 많이 투자하고,
              높으면 줄여서 투자합니다 (0.5x ~ 2x).
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {results ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">총 투자금</p>
                  <p className="text-lg font-bold mt-1">
                    ${results.totalInvested.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">현재 가치</p>
                  <p
                    className={`text-lg font-bold mt-1 ${
                      results.currentValue >= results.totalInvested
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    ${results.currentValue.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">총 수익률</p>
                  <p
                    className={`text-lg font-bold mt-1 ${
                      results.totalReturn >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {results.totalReturn >= 0 ? "+" : ""}
                    {results.totalReturn.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">매수 횟수</p>
                  <p className="text-lg font-bold mt-1">{results.numBuys}회</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">평균 매수가</p>
                  <p className="text-lg font-bold mt-1">
                    ${results.avgCostBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">누적 수량</p>
                  <p className="text-lg font-bold mt-1">
                    {results.unitsAccumulated < 1
                      ? results.unitsAccumulated.toFixed(6)
                      : results.unitsAccumulated.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    {" "}{asset}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">최저 매수가</p>
                  <p className="text-lg font-bold mt-1 text-green-500">
                    ${results.bestBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">최고 매수가</p>
                  <p className="text-lg font-bold mt-1 text-red-500">
                    ${results.worstBuyPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Portfolio Value Chart */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">
                  포트폴리오 가치 추이
                </h3>
                <LightweightChartWrapper
                  data={results.chartData}
                  type="area"
                  color="#2962FF"
                  height={360}
                  showGrid
                />
                <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-[#2962FF]" />{" "}
                    포트폴리오 가치
                  </span>
                </div>
              </div>

              {/* Trade History */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setShowTradeHistory(!showTradeHistory)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
                >
                  <span>거래 내역 ({results.trades.filter((t) => t.amount > 0).length}건)</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showTradeHistory ? "rotate-180" : ""}`}
                  />
                </button>
                {showTradeHistory && (
                  <div className="border-t border-border overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                            날짜
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            가격
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            투자금
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            매수 수량
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            누적 투자
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                            포트폴리오
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.trades
                          .filter((t) => t.amount > 0)
                          .map((trade) => (
                            <tr
                              key={trade.date}
                              className="border-b border-border hover:bg-muted/20"
                            >
                              <td className="px-3 py-2 font-mono">
                                {trade.date}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                ${trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                ${trade.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {trade.units < 0.01
                                  ? trade.units.toFixed(6)
                                  : trade.units.toFixed(4)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                ${trade.totalInvested.toLocaleString()}
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-mono ${
                                  trade.portfolioValue >= trade.totalInvested
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                ${trade.portfolioValue.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                왼쪽에서 설정을 입력하면 DCA 시뮬레이션 결과가 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
