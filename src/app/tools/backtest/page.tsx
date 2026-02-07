"use client";

import { useState } from "react";
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

// Sample backtest result
const SAMPLE_RESULT = {
  strategy: "변동성 돌파 (Larry Williams)",
  asset: "BTC/KRW",
  period: "2024-01-01 ~ 2026-02-06",
  initialCapital: 10000000,
  finalCapital: 18750000,
  totalReturn: 87.5,
  annualizedReturn: 38.2,
  maxDrawdown: -18.5,
  sharpeRatio: 2.15,
  sortinoRatio: 2.85,
  calmarRatio: 2.06,
  winRate: 63.2,
  profitFactor: 2.35,
  totalTrades: 512,
  profitTrades: 324,
  lossTrades: 188,
  avgWin: 4.1,
  avgLoss: -2.3,
  avgHoldingDays: 1.2,
  maxConsecutiveWins: 12,
  maxConsecutiveLosses: 5,
  benchmarkReturn: 45.0,
  alpha: 42.5,
  beta: 0.65,
  // Equity curve data (normalized)
  equityCurve: [
    100, 102, 98, 105, 103, 110, 108, 115, 112, 120, 118, 125, 122, 130,
    127, 135, 132, 140, 137, 145, 142, 150, 148, 155, 152, 160, 158, 165,
    162, 170, 167, 175, 172, 180, 177, 185, 182, 187.5,
  ],
  benchmarkCurve: [
    100, 101, 97, 103, 100, 106, 103, 108, 105, 112, 109, 114, 111, 118,
    115, 120, 117, 122, 119, 125, 122, 128, 125, 130, 127, 133, 130, 135,
    132, 138, 135, 140, 137, 142, 139, 143, 140, 145,
  ],
  monthlyReturns: [
    { month: "2024-01", ret: 8.2 },
    { month: "2024-02", ret: 5.5 },
    { month: "2024-03", ret: -3.2 },
    { month: "2024-04", ret: 12.1 },
    { month: "2024-05", ret: 2.8 },
    { month: "2024-06", ret: -1.5 },
    { month: "2024-07", ret: 6.3 },
    { month: "2024-08", ret: -4.8 },
    { month: "2024-09", ret: 9.1 },
    { month: "2024-10", ret: 3.5 },
    { month: "2024-11", ret: 15.2 },
    { month: "2024-12", ret: 7.8 },
    { month: "2025-01", ret: -2.1 },
    { month: "2025-02", ret: 4.5 },
    { month: "2025-03", ret: 8.3 },
    { month: "2025-04", ret: -5.2 },
    { month: "2025-05", ret: 3.1 },
    { month: "2025-06", ret: 6.8 },
    { month: "2025-07", ret: -1.8 },
    { month: "2025-08", ret: 9.5 },
    { month: "2025-09", ret: 2.2 },
    { month: "2025-10", ret: -3.5 },
    { month: "2025-11", ret: 7.1 },
    { month: "2025-12", ret: 11.5 },
    { month: "2026-01", ret: 4.8 },
    { month: "2026-02", ret: 2.1 },
  ],
  drawdownCurve: [
    0, -0.5, -3.2, -1.0, -2.5, 0, -1.2, 0, -2.0, 0, -1.5, 0, -2.8, 0,
    -1.8, 0, -3.5, 0, -2.2, 0, -1.0, 0, -1.5, 0, -3.0, 0, -1.2, 0,
    -2.5, 0, -1.8, 0, -4.2, 0, -2.0, 0, -1.0, 0,
  ],
};

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id);
  const [asset, setAsset] = useState("BTC/KRW");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-02-06");
  const [initialCapital, setInitialCapital] = useState("10000000");
  const [isRunning, setIsRunning] = useState(false);
  const [hasResult, setHasResult] = useState(true);

  const strategy = STRATEGIES.find((s) => s.id === selectedStrategy)!;
  const r = SAMPLE_RESULT;

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasResult(true);
    }, 2000);
  };

  const maxCurve = Math.max(...r.equityCurve, ...r.benchmarkCurve);
  const minCurve = Math.min(...r.equityCurve, ...r.benchmarkCurve);

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
      {hasResult && (
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
