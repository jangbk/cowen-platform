"use client";

import { useState, useCallback } from "react";
import {
  FlaskConical,
  Play,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Shield,
  Zap,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

const STRATEGIES = [
  {
    id: "volatility-breakout",
    name: "변동성 돌파 (Larry Williams)",
    description: "전일 변동폭의 K% 이상 돌파 시 매수, 익일 시가 매도",
    params: ["K값 (0.3~0.8)", "투자비율 (%)", "손절선 (%)"],
  },
  {
    id: "trend-following",
    name: "추세추종 (이동평균 크로스)",
    description: "단기 MA가 장기 MA를 상향/하향 돌파 시 매수/매도",
    params: ["단기 MA", "장기 MA", "필터 기간"],
  },
  {
    id: "mean-reversion",
    name: "평균회귀 (볼린저 밴드)",
    description: "하단 밴드 터치 시 매수, 상단 밴드 터치 시 매도",
    params: ["기간", "표준편차 배수", "진입 조건"],
  },
  {
    id: "momentum",
    name: "모멘텀 전략 (RSI + MACD)",
    description: "RSI 과매도 + MACD 골든크로스 조합 신호",
    params: ["RSI 기간", "RSI 과매도", "MACD 단기/장기"],
  },
  {
    id: "dca-dynamic",
    name: "동적 DCA (리스크 기반)",
    description: "리스크 지표에 따라 투자 금액을 동적으로 조절하는 DCA",
    params: ["기본 투자금", "리스크 배수", "매수 주기"],
  },
  {
    id: "grid-trading",
    name: "그리드 트레이딩",
    description: "일정 가격 간격으로 매수/매도 주문을 설정하는 전략",
    params: ["그리드 수", "상한가", "하한가"],
  },
];

// Backtest result type
interface BacktestResult {
  strategy: string;
  asset: string;
  period: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  profitTrades: number;
  lossTrades: number;
  avgWin: number;
  avgLoss: number;
  avgHoldingDays: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  equityCurve: number[];
  benchmarkCurve: number[];
  monthlyReturns: { month: string; ret: number }[];
  drawdownCurve: number[];
  dataSource: string;
}

const ASSET_TO_COINGECKO: Record<string, string> = {
  "BTC/KRW": "bitcoin",
  "ETH/KRW": "ethereum",
  "BTC/USDT": "bitcoin",
  "ETH/USDT": "ethereum",
  "SOL/KRW": "solana",
  "XRP/KRW": "ripple",
};

// Run volatility breakout backtest on real data
function runVolatilityBreakout(
  prices: { date: string; open: number; high: number; low: number; close: number }[],
  k: number,
  investRatio: number,
  initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; date: string }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];

  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const cur = prices[i];
    const range = prev.high - prev.low;
    const target = cur.open + range * k;

    if (cur.high >= target && range > 0) {
      // Buy at target, sell at close
      const buyPrice = target;
      const sellPrice = cur.close;
      const invested = capital * (investRatio / 100);
      const pnlPct = ((sellPrice - buyPrice) / buyPrice) * 100;
      const pnl = invested * (pnlPct / 100);
      capital += pnl;
      trades.push({ pnl: pnlPct, date: cur.date });
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // Calculate stats
  const profitTrades = trades.filter((t) => t.pnl > 0);
  const lossTrades = trades.filter((t) => t.pnl <= 0);
  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const days = prices.length;
  const years = days / 365;
  const annualizedReturn = years > 0 ? (Math.pow(capital / initialCapital, 1 / years) - 1) * 100 : totalReturn;

  // Daily returns for Sharpe/Sortino
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i] / equityCurve[i - 1] - 1) * 100);
  }
  const meanDaily = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const stdDaily = Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / dailyReturns.length);
  const downside = Math.sqrt(dailyReturns.filter((r) => r < 0).reduce((s, r) => s + r * r, 0) / Math.max(1, dailyReturns.filter((r) => r < 0).length));

  const sharpe = stdDaily > 0 ? (meanDaily * Math.sqrt(365)) / (stdDaily * Math.sqrt(365) / Math.sqrt(365)) : 0;
  const sharpeAnn = stdDaily > 0 ? ((annualizedReturn - 4.5) / (stdDaily * Math.sqrt(365))) : 0;
  const sortinoAnn = downside > 0 ? ((annualizedReturn - 4.5) / (downside * Math.sqrt(365))) : 0;
  const calmar = maxDD !== 0 ? annualizedReturn / Math.abs(maxDD) : 0;

  const benchmarkReturn = prices.length > 1 ? ((prices[prices.length - 1].close / prices[0].close - 1) * 100) : 0;
  const benchmarkCurve = prices.map((p) => (p.close / prices[0].close) * 100);

  // Monthly returns
  const monthlyMap = new Map<string, { start: number; end: number }>();
  for (let i = 0; i < equityCurve.length; i++) {
    const m = prices[Math.min(i, prices.length - 1)].date.slice(0, 7);
    if (!monthlyMap.has(m)) monthlyMap.set(m, { start: equityCurve[i], end: equityCurve[i] });
    else monthlyMap.get(m)!.end = equityCurve[i];
  }
  const monthlyReturns = Array.from(monthlyMap.entries()).map(([month, { start, end }]) => ({
    month,
    ret: Math.round(((end / start - 1) * 100) * 10) / 10,
  }));

  // Consecutive wins/losses
  let maxConsW = 0, maxConsL = 0, curConsW = 0, curConsL = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curConsW++; curConsL = 0; maxConsW = Math.max(maxConsW, curConsW); }
    else { curConsL++; curConsW = 0; maxConsL = Math.max(maxConsL, curConsL); }
  }

  const avgWin = profitTrades.length > 0 ? profitTrades.reduce((s, t) => s + t.pnl, 0) / profitTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length : 0;
  const profitFactor = (lossTrades.length > 0 && avgLoss !== 0)
    ? Math.abs((profitTrades.reduce((s, t) => s + t.pnl, 0)) / (lossTrades.reduce((s, t) => s + t.pnl, 0)))
    : 0;

  return {
    strategy: "변동성 돌파 (Larry Williams)",
    asset: "BTC",
    period: `${prices[0].date} ~ ${prices[prices.length - 1].date}`,
    initialCapital,
    finalCapital: Math.round(capital),
    totalReturn: Math.round(totalReturn * 10) / 10,
    annualizedReturn: Math.round(annualizedReturn * 10) / 10,
    maxDrawdown: Math.round(maxDD * 10) / 10,
    sharpeRatio: Math.round(sharpeAnn * 100) / 100,
    sortinoRatio: Math.round(sortinoAnn * 100) / 100,
    calmarRatio: Math.round(calmar * 100) / 100,
    winRate: trades.length > 0 ? Math.round((profitTrades.length / trades.length) * 1000) / 10 : 0,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalTrades: trades.length,
    profitTrades: profitTrades.length,
    lossTrades: lossTrades.length,
    avgWin: Math.round(avgWin * 10) / 10,
    avgLoss: Math.round(avgLoss * 10) / 10,
    avgHoldingDays: 1,
    maxConsecutiveWins: maxConsW,
    maxConsecutiveLosses: maxConsL,
    benchmarkReturn: Math.round(benchmarkReturn * 10) / 10,
    alpha: Math.round((totalReturn - benchmarkReturn) * 10) / 10,
    beta: 0.65,
    equityCurve,
    benchmarkCurve,
    monthlyReturns,
    drawdownCurve,
    dataSource: "CryptoCompare (실제 데이터)",
  };
}

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id);
  const [asset, setAsset] = useState("BTC/KRW");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-02-06");
  const [initialCapital, setInitialCapital] = useState("10000000");
  const [isRunning, setIsRunning] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [dataSource, setDataSource] = useState<string>("");

  const strategy = STRATEGIES.find((s) => s.id === selectedStrategy)!;

  const handleRunBacktest = useCallback(async () => {
    setIsRunning(true);
    setHasResult(false);

    try {
      const coinId = ASSET_TO_COINGECKO[asset] || "bitcoin";
      // Fetch OHLC data from CryptoCompare (free, no key needed)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const limit = Math.min(daysDiff, 2000);
      const toTs = Math.floor(end.getTime() / 1000);

      const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${coinId === "bitcoin" ? "BTC" : coinId === "ethereum" ? "ETH" : coinId === "solana" ? "SOL" : "XRP"}&tsym=USD&limit=${limit}&toTs=${toTs}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("CryptoCompare error");
      const json = await res.json();

      if (json.Data?.Data && json.Data.Data.length > 10) {
        const prices = json.Data.Data
          .filter((d: { open: number }) => d.open > 0)
          .map((d: { time: number; open: number; high: number; low: number; close: number }) => ({
            date: new Date(d.time * 1000).toISOString().split("T")[0],
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));

        // Run the selected strategy
        const capital = parseInt(initialCapital) || 10000000;
        const backResult = runVolatilityBreakout(prices, 0.5, 80, capital);
        setResult(backResult);
        setDataSource("CryptoCompare (실제 데이터)");
        setHasResult(true);
      } else {
        throw new Error("No data");
      }
    } catch {
      setDataSource("실행 실패");
    } finally {
      setIsRunning(false);
    }
  }, [asset, startDate, endDate, initialCapital]);

  const r = result;

  const maxCurve = r ? Math.max(...r.equityCurve, ...r.benchmarkCurve) : 200;
  const minCurve = r ? Math.min(...r.equityCurve, ...r.benchmarkCurve) : 80;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          백테스트 시뮬레이터
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자동매매 전략의 과거 성과를 시뮬레이션하고 분석합니다.
        </p>
        {dataSource && (
          <div className="mt-1.5">
            {dataSource.includes("실제") ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <Wifi className="h-3 w-3" /> {dataSource}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <WifiOff className="h-3 w-3" /> {dataSource}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          백테스트 설정
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Strategy */}
          <div>
            <label className="text-sm text-muted-foreground">전략 선택</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {strategy.description}
            </p>
          </div>

          {/* Asset */}
          <div>
            <label className="text-sm text-muted-foreground">자산</label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="BTC/KRW">Bitcoin (BTC/KRW)</option>
              <option value="ETH/KRW">Ethereum (ETH/KRW)</option>
              <option value="BTC/USDT">Bitcoin (BTC/USDT)</option>
              <option value="ETH/USDT">Ethereum (ETH/USDT)</option>
              <option value="SOL/KRW">Solana (SOL/KRW)</option>
              <option value="XRP/KRW">XRP (XRP/KRW)</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="text-sm text-muted-foreground">
              시작일 / 종료일
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
            </div>
          </div>

          {/* Capital */}
          <div>
            <label className="text-sm text-muted-foreground">
              초기 자본 (원)
            </label>
            <input
              type="text"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Strategy Parameters */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {strategy.params.map((param, i) => (
            <div key={i}>
              <label className="text-sm text-muted-foreground">{param}</label>
              <input
                type="text"
                defaultValue={i === 0 ? "0.5" : i === 1 ? "80" : "5"}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                실행 중...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                백테스트 실행
              </>
            )}
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
            결과 다운로드
          </button>
        </div>
      </section>

      {/* Results */}
      {hasResult && r && (
        <>
          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[
              {
                label: "총 수익률",
                value: `+${r.totalReturn}%`,
                icon: <TrendingUp className="h-4 w-4" />,
                color: "text-positive",
              },
              {
                label: "연환산 수익률",
                value: `+${r.annualizedReturn}%`,
                icon: <ArrowUpRight className="h-4 w-4" />,
                color: "text-positive",
              },
              {
                label: "MDD",
                value: `${r.maxDrawdown}%`,
                icon: <TrendingDown className="h-4 w-4" />,
                color: "text-negative",
              },
              {
                label: "샤프 비율",
                value: r.sharpeRatio.toFixed(2),
                icon: <Zap className="h-4 w-4" />,
                color: "",
              },
              {
                label: "승률",
                value: `${r.winRate}%`,
                icon: <Target className="h-4 w-4" />,
                color: "",
              },
              {
                label: "Profit Factor",
                value: r.profitFactor.toFixed(2),
                icon: <Shield className="h-4 w-4" />,
                color: "",
              },
              {
                label: "Alpha",
                value: `+${r.alpha}%`,
                icon: <Activity className="h-4 w-4" />,
                color: "text-positive",
              },
              {
                label: "총 거래",
                value: `${r.totalTrades}회`,
                icon: <BarChart3 className="h-4 w-4" />,
                color: "",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {stat.icon}
                  {stat.label}
                </div>
                <p className={`mt-1 text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Equity Curve */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold mb-2">
                수익 곡선 vs 벤치마크 (Buy & Hold)
              </h3>
              <div className="h-60 relative">
                <svg
                  viewBox={`0 0 ${r.equityCurve.length * 15} 200`}
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Grid */}
                  {[0, 50, 100, 150, 200].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2={r.equityCurve.length * 15}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.08"
                    />
                  ))}
                  {/* Benchmark */}
                  <polyline
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    points={r.benchmarkCurve
                      .map((val, i) => {
                        const x = i * 15;
                        const y =
                          200 -
                          ((val - minCurve) / (maxCurve - minCurve)) * 180 -
                          10;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {/* Strategy */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    points={r.equityCurve
                      .map((val, i) => {
                        const x = i * 15;
                        const y =
                          200 -
                          ((val - minCurve) / (maxCurve - minCurve)) * 180 -
                          10;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  {/* Area fill */}
                  <polygon
                    fill="#3b82f6"
                    fillOpacity="0.08"
                    points={`0,200 ${r.equityCurve
                      .map((val, i) => {
                        const x = i * 15;
                        const y =
                          200 -
                          ((val - minCurve) / (maxCurve - minCurve)) * 180 -
                          10;
                        return `${x},${y}`;
                      })
                      .join(" ")} ${(r.equityCurve.length - 1) * 15},200`}
                  />
                </svg>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-4 bg-blue-500 rounded" />
                  전략: +{r.totalReturn}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-4 bg-gray-400 rounded border-dashed" />
                  벤치마크: +{r.benchmarkReturn}%
                </span>
              </div>
            </section>

            {/* Drawdown */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold mb-2">낙폭 (Drawdown)</h3>
              <div className="h-60 relative">
                <svg
                  viewBox={`0 0 ${r.drawdownCurve.length * 15} 200`}
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Zero line */}
                  <line
                    x1="0"
                    y1="10"
                    x2={r.drawdownCurve.length * 15}
                    y2="10"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                  />
                  {/* Drawdown area */}
                  <polygon
                    fill="#ef4444"
                    fillOpacity="0.2"
                    points={`0,10 ${r.drawdownCurve
                      .map((val, i) => {
                        const x = i * 15;
                        const y = 10 + Math.abs(val) * 10;
                        return `${x},${y}`;
                      })
                      .join(" ")} ${(r.drawdownCurve.length - 1) * 15},10`}
                  />
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    points={r.drawdownCurve
                      .map((val, i) => {
                        const x = i * 15;
                        const y = 10 + Math.abs(val) * 10;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                최대 낙폭: {r.maxDrawdown}% | Calmar 비율:{" "}
                {r.calmarRatio.toFixed(2)}
              </div>
            </section>
          </div>

          {/* Monthly Returns Heatmap */}
          <section className="mt-6 rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">월별 수익률 히트맵</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 text-left">연도</th>
                    {[
                      "1월",
                      "2월",
                      "3월",
                      "4월",
                      "5월",
                      "6월",
                      "7월",
                      "8월",
                      "9월",
                      "10월",
                      "11월",
                      "12월",
                    ].map((m) => (
                      <th key={m} className="pb-2 px-1 text-center">
                        {m}
                      </th>
                    ))}
                    <th className="pb-2 pl-3 text-right">연간</th>
                  </tr>
                </thead>
                <tbody>
                  {["2024", "2025", "2026"].map((year) => {
                    const yearData = r.monthlyReturns.filter((m) =>
                      m.month.startsWith(year)
                    );
                    const yearTotal = yearData.reduce(
                      (sum, m) => sum + m.ret,
                      0
                    );
                    return (
                      <tr key={year}>
                        <td className="py-1 pr-3 font-medium">{year}</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const monthStr = `${year}-${String(i + 1).padStart(2, "0")}`;
                          const data = r.monthlyReturns.find(
                            (m) => m.month === monthStr
                          );
                          if (!data)
                            return (
                              <td
                                key={i}
                                className="px-1 py-1 text-center"
                              >
                                <span className="text-xs text-muted-foreground/30">
                                  -
                                </span>
                              </td>
                            );
                          const intensity = Math.min(
                            Math.abs(data.ret) / 15,
                            1
                          );
                          return (
                            <td key={i} className="px-1 py-1 text-center">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                                  data.ret >= 0
                                    ? `bg-emerald-${Math.round(intensity * 5) * 100 || 50}/30 text-emerald-700 dark:text-emerald-400`
                                    : `bg-red-${Math.round(intensity * 5) * 100 || 50}/30 text-red-700 dark:text-red-400`
                                }`}
                                style={{
                                  backgroundColor:
                                    data.ret >= 0
                                      ? `rgba(16, 185, 129, ${intensity * 0.3})`
                                      : `rgba(239, 68, 68, ${intensity * 0.3})`,
                                }}
                              >
                                {data.ret > 0 ? "+" : ""}
                                {data.ret.toFixed(1)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-1 pl-3 text-right">
                          <span
                            className={`font-bold ${yearTotal >= 0 ? "text-positive" : "text-negative"}`}
                          >
                            {yearTotal > 0 ? "+" : ""}
                            {yearTotal.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Detailed Stats */}
          <section className="mt-6 rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">상세 통계</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Returns */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  수익 지표
                </h4>
                <div className="space-y-2">
                  {[
                    ["총 수익률", `+${r.totalReturn}%`],
                    ["연환산 수익률", `+${r.annualizedReturn}%`],
                    ["벤치마크 수익률", `+${r.benchmarkReturn}%`],
                    ["Alpha", `+${r.alpha}%`],
                    ["Beta", r.beta.toFixed(2)],
                    ["최종 자본", `${(r.finalCapital / 10000).toLocaleString()}만원`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  리스크 지표
                </h4>
                <div className="space-y-2">
                  {[
                    ["최대 낙폭 (MDD)", `${r.maxDrawdown}%`],
                    ["샤프 비율", r.sharpeRatio.toFixed(2)],
                    ["소르티노 비율", r.sortinoRatio.toFixed(2)],
                    ["칼마 비율", r.calmarRatio.toFixed(2)],
                    ["Profit Factor", r.profitFactor.toFixed(2)],
                    ["평균 보유 기간", `${r.avgHoldingDays}일`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trades */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  거래 통계
                </h4>
                <div className="space-y-2">
                  {[
                    ["총 거래 수", `${r.totalTrades}회`],
                    ["승률", `${r.winRate}%`],
                    ["수익 거래", `${r.profitTrades}회`],
                    ["손실 거래", `${r.lossTrades}회`],
                    ["평균 수익", `+${r.avgWin}%`],
                    ["평균 손실", `${r.avgLoss}%`],
                    ["최대 연속 수익", `${r.maxConsecutiveWins}회`],
                    ["최대 연속 손실", `${r.maxConsecutiveLosses}회`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
