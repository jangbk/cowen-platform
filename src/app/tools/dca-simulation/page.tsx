"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Calculator,
  DollarSign,
  Calendar,
  TrendingUp,
  Loader2,
  ChevronDown,
  Info,
  AlertTriangle,
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
// Types
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

interface PricePoint {
  date: string;
  price: number;
}

// ---------------------------------------------------------------------------
// DCA Calculation Engine
// ---------------------------------------------------------------------------
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
  prices: PricePoint[],
  amount: number,
  frequency: Frequency,
  strategy: Strategy,
  startDate: string
): Trade[] {
  const trades: Trade[] = [];
  let totalInvested = 0;
  let totalUnits = 0;

  if (strategy === "lumpsum") {
    const lumpAmount =
      amount *
      (frequency === "daily"
        ? 365
        : frequency === "weekly"
        ? 52
        : frequency === "biweekly"
        ? 26
        : 12);
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
        const avgPrice =
          totalUnits > 0 ? totalInvested / totalUnits : prices[i].price;
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
// Assets (CoinGecko 지원)
// ---------------------------------------------------------------------------
const ASSETS = [
  { id: "BTC", name: "Bitcoin", since: "2013" },
  { id: "ETH", name: "Ethereum", since: "2015" },
  { id: "SOL", name: "Solana", since: "2020" },
  { id: "BNB", name: "BNB", since: "2017" },
  { id: "XRP", name: "XRP", since: "2014" },
  { id: "ADA", name: "Cardano", since: "2017" },
  { id: "DOGE", name: "Dogecoin", since: "2014" },
  { id: "AVAX", name: "Avalanche", since: "2020" },
  { id: "DOT", name: "Polkadot", since: "2020" },
  { id: "LINK", name: "Chainlink", since: "2017" },
  { id: "ATOM", name: "Cosmos", since: "2019" },
  { id: "UNI", name: "Uniswap", since: "2020" },
  { id: "NEAR", name: "NEAR Protocol", since: "2020" },
  { id: "TRX", name: "TRON", since: "2017" },
  { id: "MATIC", name: "Polygon", since: "2019" },
  { id: "AAVE", name: "Aave", since: "2020" },
  { id: "LTC", name: "Litecoin", since: "2013" },
  { id: "SUI", name: "Sui", since: "2023" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DCASimulationPage() {
  // Settings
  const [asset, setAsset] = useState("BTC");
  const [amount, setAmount] = useState("500");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [strategy, setStrategy] = useState<Strategy>("equal");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Price data state
  const [priceData, setPriceData] = useState<PricePoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Fetch real price data from CoinGecko via API route
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setDataError(null);

    fetch(
      `/api/tools/dca-history?asset=${asset}&from=${startDate}&to=${endDate}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setDataError(data.error);
          setPriceData(null);
          setNotice(null);
        } else {
          setPriceData(data.prices);
          setNotice(data.notice || null);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setDataError("가격 데이터를 불러오는데 실패했습니다.");
          setPriceData(null);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [asset, startDate, endDate]);

  // Compute DCA results (sync, from cached price data)
  const results = useMemo(() => {
    if (!priceData || priceData.length < 2) return null;
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return null;

    const trades = runDCA(priceData, amt, frequency, strategy, startDate);
    if (trades.length === 0) return null;

    const lastTrade = trades[trades.length - 1];
    const allPrices = trades.filter((t) => t.amount > 0).map((t) => t.price);
    const avgCostBasis =
      lastTrade.totalInvested / (lastTrade.totalUnits || 1);
    const totalReturn =
      ((lastTrade.portfolioValue - lastTrade.totalInvested) /
        lastTrade.totalInvested) *
      100;

    const chartData = trades.map((t) => ({
      time: t.date,
      value: t.portfolioValue,
    }));

    return {
      trades,
      chartData,
      totalInvested: lastTrade.totalInvested,
      currentValue: lastTrade.portfolioValue,
      totalReturn,
      avgCostBasis,
      unitsAccumulated: lastTrade.totalUnits,
      currentPrice: trades[trades.length - 1].price,
      bestBuyPrice: allPrices.length > 0 ? Math.min(...allPrices) : 0,
      worstBuyPrice: allPrices.length > 0 ? Math.max(...allPrices) : 0,
      numBuys: trades.filter((t) => t.amount > 0).length,
      firstDate: priceData[0].date,
      lastDate: priceData[priceData.length - 1].date,
    };
  }, [priceData, amount, frequency, strategy, startDate]);

  const selectedAsset = ASSETS.find((a) => a.id === asset);

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">DCA Simulation</h1>
        </div>
        <p className="text-muted-foreground">
          실제 과거 가격 데이터 기반 달러 비용 평균법(DCA) 시뮬레이션
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
                1. 자산 선택
              </h4>
              <p>
                BTC, ETH, SOL 등 18종의 암호화폐 중 시뮬레이션할 자산을
                선택합니다. CoinGecko의 실제 과거 가격 데이터(일별)를
                사용하며, 2013년부터 현재까지 전체 기간을 지원합니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                2. 투자 설정
              </h4>
              <p>
                <strong>회당 투자금:</strong> 매 투자 시점마다 투입할 금액(USD)을
                입력합니다.
                <br />
                <strong>투자 주기:</strong> 매일 / 매주 / 격주 / 매월 중 선택합니다.
                <br />
                <strong>기간:</strong> 시작일과 종료일을 설정합니다. 자산별
                데이터 제공 시작 연도에 유의하세요.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                3. 투자 전략
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>균등 투자:</strong> 매 주기마다 동일한 금액을 투자합니다
                  (표준 DCA).
                </li>
                <li>
                  <strong>일시불 투자:</strong> 전체 기간의 투자금을 시작 시점에
                  한번에 투입합니다. DCA 대비 성과를 비교할 수 있습니다.
                </li>
                <li>
                  <strong>동적 DCA:</strong> 현재 가격이 평균 매수가보다 낮으면 더
                  많이(최대 2배), 높으면 줄여서(최소 0.5배) 투자합니다.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                4. 결과 확인
              </h4>
              <p>
                총 투자금, 현재 가치, 수익률, 평균 매수가 등의 요약 지표와
                포트폴리오 가치 추이 차트를 확인합니다. 하단의 &quot;거래
                내역&quot;을 펼치면 개별 매수 기록을 볼 수 있습니다.
              </p>
            </div>
          </div>
        )}
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
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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
            {selectedAsset && (
              <p className="mt-1 text-xs text-muted-foreground">
                데이터 제공: {selectedAsset.since}년 ~
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">
              {strategy === "lumpsum" ? "회당 기준 금액 ($)" : "회당 투자금 ($)"}
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
            {strategy === "lumpsum" && (
              <p className="mt-1 text-xs text-muted-foreground">
                일시불 총액: $
                {(
                  (parseFloat(amount) || 0) *
                  (frequency === "daily"
                    ? 365
                    : frequency === "weekly"
                    ? 52
                    : frequency === "biweekly"
                    ? 26
                    : 12)
                ).toLocaleString()}
              </p>
            )}
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
              <strong>동적 DCA:</strong> 평균 매수가 대비 현재가가 낮으면 더 많이
              투자하고, 높으면 줄여서 투자합니다 (0.5x ~ 2x).
            </div>
          )}

          {/* Data status */}
          {priceData && !loading && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-600 dark:text-green-400">
              {priceData.length}일간의 실제 가격 데이터 로드 완료
              <br />
              {priceData[0].date} ~ {priceData[priceData.length - 1].date}
            </div>
          )}
          {notice && !loading && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
              {notice}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                {asset} 과거 가격 데이터를 불러오는 중...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CoinGecko에서 실시간 조회
              </p>
            </div>
          ) : dataError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-12 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
              <p className="text-sm text-red-500 font-medium">{dataError}</p>
              <p className="text-xs text-muted-foreground mt-2">
                날짜 범위를 조정하거나 잠시 후 다시 시도해주세요.
              </p>
            </div>
          ) : results ? (
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
                  <p className="text-lg font-bold mt-1">
                    {results.numBuys}회
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">평균 매수가</p>
                  <p className="text-lg font-bold mt-1">
                    $
                    {results.avgCostBasis.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">현재 가격</p>
                  <p className="text-lg font-bold mt-1">
                    $
                    {results.currentPrice.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">누적 수량</p>
                  <p className="text-lg font-bold mt-1">
                    {results.unitsAccumulated < 1
                      ? results.unitsAccumulated.toFixed(6)
                      : results.unitsAccumulated.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}{" "}
                    {asset}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    최저 / 최고 매수가
                  </p>
                  <p className="text-sm font-bold mt-1">
                    <span className="text-green-500">
                      $
                      {results.bestBuyPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {" / "}
                    <span className="text-red-500">
                      $
                      {results.worstBuyPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
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
                  <span>
                    거래 내역 (
                    {results.trades.filter((t) => t.amount > 0).length}건)
                  </span>
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
                          .map((trade, idx) => (
                            <tr
                              key={`${trade.date}-${idx}`}
                              className="border-b border-border hover:bg-muted/20"
                            >
                              <td className="px-3 py-2 font-mono">
                                {trade.date}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                $
                                {trade.price.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                $
                                {trade.amount.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
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

      {/* Disclaimers */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li>
            <strong>과거 수익률은 미래 수익률을 보장하지 않습니다.</strong>{" "}
            시뮬레이션 결과는 참고용이며, 실제 투자 성과와 다를 수 있습니다.
          </li>
          <li>
            실제 거래에서는 <strong>거래 수수료, 스프레드, 슬리피지</strong> 등
            추가 비용이 발생하며, 이 시뮬레이션에는 반영되지 않았습니다.
          </li>
          <li>
            암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험
            자산입니다. 투자 원금의 일부 또는 전부를 잃을 수 있습니다.
          </li>
          <li>
            본 시뮬레이션은 <strong>투자 조언이 아닙니다.</strong> 투자 결정은
            반드시 본인의 판단과 책임 하에 이루어져야 합니다.
          </li>
          <li>
            가격 데이터 출처:{" "}
            <a
              href="https://www.coingecko.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CoinGecko
            </a>{" "}
            (일별 종가 기준, 24시간 캐시)
          </li>
        </ul>
      </div>
    </div>
  );
}
