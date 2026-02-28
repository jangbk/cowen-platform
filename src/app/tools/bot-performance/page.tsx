"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Zap,
  Target,
  Shield,
  Wifi,
  WifiOff,
  Loader2,
  Pencil,
} from "lucide-react";

interface BotStrategy {
  id: string;
  name: string;
  description: string;
  asset: string;
  exchange: string;
  status: "active" | "paused" | "stopped";
  startDate: string;
  initialCapital: number;
  currentValue: number;
  totalReturn: number;
  monthlyReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitTrades: number;
  lossTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  dailyPnL: number[];
  monthlyReturns: number[];
  recentTrades?: Array<{
    time: string;
    type: string;
    price: string;
    qty: string;
    pnl: string;
  }>;
  _live?: boolean;
}

const FALLBACK_STRATEGIES: BotStrategy[] = [
  {
    id: "seykota-ema",
    name: "Seykota EMA Bot",
    description: "EMA 15/150 추세추종 전략",
    asset: "BTC/KRW",
    exchange: "Bithumb",
    status: "active",
    startDate: "2026-01-20",
    initialCapital: 3500000,
    currentValue: 3530000,
    totalReturn: 38.4,
    monthlyReturn: 3.5,
    maxDrawdown: -15.7,
    sharpeRatio: 1.52,
    winRate: 45.8,
    totalTrades: 120,
    profitTrades: 55,
    lossTrades: 65,
    avgWin: 8.5,
    avgLoss: -3.2,
    profitFactor: 1.95,
    dailyPnL: [
      -0.3, 1.5, 2.8, -1.0, 0.2, 3.5, -2.1, 1.8, -0.5, 4.2, 1.0, -1.8,
      0.7, 2.3, -0.8, 1.2, 3.0, -1.5, 2.1, -0.4, 1.6, 0.9, -2.5, 3.8, 1.3,
      -0.7, 2.5, -1.2, 0.5, 1.8,
    ],
    monthlyReturns: [
      4.1, -3.2, 7.5, 2.8, -1.2, 5.5, 8.2, 3.1, -2.5, 6.3, 4.8, 2.9,
    ],
    recentTrades: [
      { time: "2026-02-06 22:15", type: "Sell", price: "97,250,000", qty: "0.015000", pnl: "+125,000" },
      { time: "2026-02-06 18:30", type: "Buy", price: "96,800,000", qty: "0.015000", pnl: "-" },
      { time: "2026-02-06 14:45", type: "Sell", price: "97,100,000", qty: "0.012000", pnl: "+89,000" },
      { time: "2026-02-06 10:20", type: "Buy", price: "96,350,000", qty: "0.012000", pnl: "-" },
    ],
  },
  {
    id: "ptj-200ma",
    name: "PTJ 200MA Bot",
    description: "200MA + 50MA 모멘텀 전략",
    asset: "BTC/KRW",
    exchange: "Coinone",
    status: "active",
    startDate: "2026-01-20",
    initialCapital: 2500000,
    currentValue: 9680000,
    totalReturn: 21.0,
    monthlyReturn: 2.8,
    maxDrawdown: -8.5,
    sharpeRatio: 1.68,
    winRate: 58.3,
    totalTrades: 180,
    profitTrades: 105,
    lossTrades: 75,
    avgWin: 2.8,
    avgLoss: -1.5,
    profitFactor: 1.75,
    dailyPnL: [
      1.2, 0.8, -0.5, 1.5, -0.3, 2.0, 1.1, -1.0, 0.6, 1.8, -0.7, 1.3, 0.4,
      -0.2, 2.2, 1.0, -0.8, 1.6, 0.9, -0.4, 1.4, 2.1, -0.6, 0.7, 1.5, -0.3,
      1.1, 0.5, 1.9, -0.5,
    ],
    monthlyReturns: [
      3.2, 2.1, -0.8, 4.5, 1.8, 2.5, -1.2, 3.8, 2.9, 1.5, -0.5, 1.2,
    ],
    recentTrades: [
      { time: "2026-02-06 20:30", type: "Sell", price: "97,500,000", qty: "0.010000", pnl: "+95,000" },
      { time: "2026-02-06 15:10", type: "Buy", price: "96,900,000", qty: "0.010000", pnl: "-" },
      { time: "2026-02-05 23:45", type: "Sell", price: "98,200,000", qty: "0.008000", pnl: "-32,000" },
      { time: "2026-02-05 19:20", type: "Buy", price: "98,600,000", qty: "0.008000", pnl: "-" },
    ],
  },
  {
    id: "kis-rsi-macd",
    name: "KIS RSI/MACD Bot",
    description: "RSI 14 + MACD 12/26/9 전략",
    asset: "삼성전자, SK하이닉스, NAVER, 카카오, LG화학",
    exchange: "한국투자증권",
    status: "active",
    startDate: "2025-04-01",
    initialCapital: 100000000,
    currentValue: 22100000,
    totalReturn: 10.5,
    monthlyReturn: 1.2,
    maxDrawdown: -6.2,
    sharpeRatio: 1.35,
    winRate: 55.0,
    totalTrades: 310,
    profitTrades: 171,
    lossTrades: 139,
    avgWin: 1.8,
    avgLoss: -1.2,
    profitFactor: 1.45,
    dailyPnL: [
      0.5, -0.3, 0.8, 0.2, -0.6, 1.0, 0.4, -0.2, 0.7, -0.5, 0.3, 0.9,
      -0.4, 0.6, 0.1, -0.3, 0.8, 0.5, -0.1, 0.4, -0.7, 0.6, 0.3, -0.2, 0.5,
      0.8, -0.4, 0.3, 0.6, -0.1,
    ],
    monthlyReturns: [
      1.5, 0.8, -0.5, 2.1, 1.2, 0.9, -0.3, 1.8, 1.5, 0.6, -0.2, 1.1,
    ],
    recentTrades: [
      { time: "2026-02-06 14:50", type: "Sell", price: "58,200", qty: "10", pnl: "+15,000" },
      { time: "2026-02-06 10:05", type: "Buy", price: "56,700", qty: "10", pnl: "-" },
      { time: "2026-02-05 15:20", type: "Sell", price: "198,500", qty: "3", pnl: "+4,500" },
      { time: "2026-02-05 09:30", type: "Buy", price: "197,000", qty: "3", pnl: "-" },
    ],
  },
];

/** 금액을 한국식으로 포맷 (억/만원 단위) */
function formatKRW(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const remainder = abs % 100_000_000;
    const man = Math.floor(remainder / 10_000);
    const won = Math.round(remainder % 10_000);
    if (man > 0 && won > 0) return `${sign}${eok}억 ${man.toLocaleString()}만 ${won.toLocaleString()}원`;
    if (man > 0) return `${sign}${eok}억 ${man.toLocaleString()}만원`;
    if (won > 0) return `${sign}${eok}억 ${won.toLocaleString()}원`;
    return `${sign}${eok}억원`;
  }
  if (abs >= 10_000) {
    const man = Math.floor(abs / 10_000);
    const won = Math.round(abs % 10_000);
    return won > 0
      ? `${sign}${man.toLocaleString()}만 ${won.toLocaleString()}원`
      : `${sign}${man.toLocaleString()}만원`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}원`;
}

function getStatusBadge(status: string) {
  if (status === "active")
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  if (status === "paused")
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Paused
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Stopped
    </span>
  );
}

const CAPITALS_KEY = "bot-capitals";

export default function BotPerformancePage() {
  const [strategies, setStrategies] = useState<BotStrategy[]>(FALLBACK_STRATEGIES);
  const [selectedBot, setSelectedBot] = useState(FALLBACK_STRATEGIES[0].id);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // 투자금 수동 오버라이드
  const [capitalOverrides, setCapitalOverrides] = useState<Record<string, number>>({});
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CAPITALS_KEY);
      if (saved) setCapitalOverrides(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  function getCapital(b: BotStrategy): number {
    return capitalOverrides[b.id] ?? b.initialCapital;
  }

  function saveCapital(botId: string, won: number) {
    if (won <= 0) return;
    const next = { ...capitalOverrides, [botId]: won };
    setCapitalOverrides(next);
    localStorage.setItem(CAPITALS_KEY, JSON.stringify(next));
    setEditingBotId(null);
  }

  function startEditing(botId: string) {
    setEditingBotId(botId);
    const current = capitalOverrides[botId] ?? strategies.find((s) => s.id === botId)?.initialCapital ?? 0;
    setEditValue(current.toLocaleString());
    setTimeout(() => editRef.current?.focus(), 50);
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchBotData() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/bots/summary");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const live = data.strategies as BotStrategy[];
        if (live && live.length > 0) {
          setStrategies(live);
          setIsLive(live.some((s: BotStrategy & { _live?: boolean }) => s._live));
          setLastUpdated(data.timestamp);
          if (!live.find((s: BotStrategy) => s.id === selectedBot)) {
            setSelectedBot(live[0].id);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch bot data, using fallback:", err);
        if (!cancelled) {
          setStrategies(FALLBACK_STRATEGIES);
          setIsLive(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBotData();
    const interval = setInterval(fetchBotData, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bot = strategies.find((b) => b.id === selectedBot) ?? strategies[0];

  // Calculate aggregated stats — 실투자 vs 모의투자 분리
  const realBots = strategies.filter((b) => b.id !== "kis-rsi-macd");
  const simBots = strategies.filter((b) => b.id === "kis-rsi-macd");

  const realInvested = realBots.reduce((sum, b) => sum + getCapital(b), 0);
  const realCurrent = realBots.reduce((sum, b) => sum + b.currentValue, 0);
  const realPnL = realCurrent - realInvested;
  const realReturnPct = realInvested > 0
    ? ((realPnL / realInvested) * 100).toFixed(1)
    : "0.0";

  const simInvested = simBots.reduce((sum, b) => sum + getCapital(b), 0);
  const simCurrent = simBots.reduce((sum, b) => sum + b.currentValue, 0);
  const simPnL = simCurrent - simInvested;
  const simReturnPct = simInvested > 0
    ? ((simPnL / simInvested) * 100).toFixed(1)
    : "0.0";

  // Simple equity curve from daily PnL
  const equityCurve = bot.dailyPnL.reduce(
    (acc: number[], pnl) => {
      acc.push(acc[acc.length - 1] * (1 + pnl / 100));
      return acc;
    },
    [bot.initialCapital]
  );

  const maxEquity = Math.max(...equityCurve);
  const minEquity = Math.min(...equityCurve);

  // Recent trades: use API data if available, fallback to demo
  const recentTrades = bot.recentTrades ?? [
    { time: "2026-02-06 22:15", type: "Sell", price: "97,250,000", qty: "0.015", pnl: "+125,000" },
    { time: "2026-02-06 18:30", type: "Buy", price: "96,800,000", qty: "0.015", pnl: "-" },
    { time: "2026-02-06 14:45", type: "Sell", price: "97,100,000", qty: "0.012", pnl: "+89,000" },
    { time: "2026-02-06 10:20", type: "Buy", price: "96,350,000", qty: "0.012", pnl: "-" },
  ];

  const effectiveCapital = getCapital(bot);
  const botPnL = bot.currentValue - effectiveCapital;
  const botReturnPct = effectiveCapital > 0
    ? ((botPnL / effectiveCapital) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            자동매매 봇 실적
          </h1>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                로딩 중
              </span>
            ) : isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Wifi className="h-3 w-3" />
                실시간
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <WifiOff className="h-3 w-3" />
                데모
              </span>
            )}
            {lastUpdated && !isLoading && (
              <span className="text-xs text-muted-foreground">
                {new Date(lastUpdated).toLocaleTimeString("ko-KR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bot Selection Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {strategies.map((b) => {
          const cap = getCapital(b);
          const pnl = b.currentValue - cap;
          const ret = cap > 0 ? ((pnl / cap) * 100).toFixed(1) : "0.0";
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBot(b.id)}
              className={`shrink-0 rounded-lg border px-4 py-3 text-left transition-colors ${
                selectedBot === b.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{b.name}</span>
                {getStatusBadge(b.status)}
                {(b as BotStrategy & { _live?: boolean })._live && (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {b.exchange} · {b.asset}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">
                  {formatKRW(cap)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">
                  {formatKRW(b.currentValue)}
                </span>
                <span className={`font-bold ${Number(ret) >= 0 ? "text-positive" : "text-negative"}`}>
                  {Number(ret) >= 0 ? "+" : ""}{ret}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Bot Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            투자금
            {editingBotId !== bot.id && (
              <button
                onClick={() => startEditing(bot.id)}
                className="ml-auto rounded p-0.5 hover:bg-muted transition-colors"
                title="투자금 수정"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
          {editingBotId === bot.id ? (
            <div className="mt-1 flex items-center gap-1">
              <input
                ref={editRef}
                type="text"
                inputMode="numeric"
                value={editValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setEditValue(raw ? parseInt(raw, 10).toLocaleString() : "");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveCapital(bot.id, parseInt(editValue.replace(/,/g, "")) || 0);
                  if (e.key === "Escape") setEditingBotId(null);
                }}
                onBlur={() => saveCapital(bot.id, parseInt(editValue.replace(/,/g, "")) || 0)}
                className="w-28 rounded border border-primary bg-background px-2 py-0.5 text-lg font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">원</span>
            </div>
          ) : (
            <p
              className="mt-1 text-lg font-bold cursor-pointer hover:text-primary transition-colors"
              onClick={() => startEditing(bot.id)}
              title="클릭하여 수정"
            >
              {formatKRW(effectiveCapital)}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            현재 평가금
          </div>
          <p className="mt-1 text-lg font-bold">{formatKRW(bot.currentValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            수익
          </div>
          <p className={`mt-1 text-lg font-bold ${botPnL >= 0 ? "text-positive" : "text-negative"}`}>
            {botPnL >= 0 ? "+" : ""}{formatKRW(botPnL)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            수익률
          </div>
          <p className={`mt-1 text-lg font-bold ${Number(botReturnPct) >= 0 ? "text-positive" : "text-negative"}`}>
            {Number(botReturnPct) >= 0 ? "+" : ""}{botReturnPct}%
          </p>
        </div>
      </div>

      {/* Summary Bars — 실투자 / 모의투자 분리 */}
      <div className="mb-6 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
          <span className="text-muted-foreground font-medium">실투자 합계</span>
          <span>투자금 <strong>{formatKRW(realInvested)}</strong></span>
          <span>평가금 <strong>{formatKRW(realCurrent)}</strong></span>
          <span className={realPnL >= 0 ? "text-positive" : "text-negative"}>
            수익 <strong>{realPnL >= 0 ? "+" : ""}{formatKRW(realPnL)}</strong>
          </span>
          <span className={Number(realReturnPct) >= 0 ? "text-positive" : "text-negative"}>
            <strong>{Number(realReturnPct) >= 0 ? "+" : ""}{realReturnPct}%</strong>
          </span>
        </div>
        {simBots.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-dashed border-border bg-muted/10 px-4 py-2 text-sm text-muted-foreground">
            <span className="font-medium">모의투자</span>
            <span>투자금 <strong>{formatKRW(simInvested)}</strong></span>
            <span>평가금 <strong>{formatKRW(simCurrent)}</strong></span>
            <span className={simPnL >= 0 ? "text-positive" : "text-negative"}>
              수익 <strong>{simPnL >= 0 ? "+" : ""}{formatKRW(simPnL)}</strong>
            </span>
            <span className={Number(simReturnPct) >= 0 ? "text-positive" : "text-negative"}>
              <strong>{Number(simReturnPct) >= 0 ? "+" : ""}{simReturnPct}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Selected Bot Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Performance Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equity Curve */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{bot.name} - 수익 곡선</h3>
              <span className="text-xs text-muted-foreground">
                {bot.startDate} ~ 현재
              </span>
            </div>
            <div className="h-56 relative">
              <svg
                viewBox={`0 0 ${equityCurve.length * 20} 200`}
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0, 50, 100, 150, 200].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2={equityCurve.length * 20}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                  />
                ))}
                {/* Equity line */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  points={equityCurve
                    .map((val, i) => {
                      const x = i * 20;
                      const y =
                        200 -
                        ((val - minEquity) / (maxEquity - minEquity)) * 180 -
                        10;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
                {/* Area fill */}
                <polygon
                  fill="#3b82f6"
                  fillOpacity="0.1"
                  points={`0,200 ${equityCurve
                    .map((val, i) => {
                      const x = i * 20;
                      const y =
                        200 -
                        ((val - minEquity) / (maxEquity - minEquity)) * 180 -
                        10;
                      return `${x},${y}`;
                    })
                    .join(" ")} ${(equityCurve.length - 1) * 20},200`}
                />
                {/* Initial capital line */}
                <line
                  x1="0"
                  y1={
                    200 -
                    ((bot.initialCapital - minEquity) /
                      (maxEquity - minEquity)) *
                      180 -
                    10
                  }
                  x2={equityCurve.length * 20}
                  y2={
                    200 -
                    ((bot.initialCapital - minEquity) /
                      (maxEquity - minEquity)) *
                      180 -
                    10
                  }
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          </section>

          {/* Daily PnL Bar Chart */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">일별 손익 (%)</h3>
            <div className="flex items-end gap-1 h-32">
              {bot.dailyPnL.map((pnl, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <div
                    className={`w-full rounded-sm ${pnl >= 0 ? "bg-positive/70" : "bg-negative/70"}`}
                    style={{ height: `${Math.abs(pnl) * 20}px` }}
                    title={`Day ${i + 1}: ${pnl > 0 ? "+" : ""}${pnl}%`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>30일 전</span>
              <span>오늘</span>
            </div>
          </section>

          {/* Monthly Returns */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">월별 수익률</h3>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {bot.monthlyReturns.map((ret, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2 text-center ${ret >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
                >
                  <div className="text-[10px] text-muted-foreground">
                    {i + 1}월
                  </div>
                  <div
                    className={`text-sm font-bold ${ret >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {ret > 0 ? "+" : ""}
                    {ret}%
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Trades */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">최근 거래 내역</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">시간</th>
                    <th className="pb-2 pr-4">유형</th>
                    <th className="pb-2 pr-4">가격</th>
                    <th className="pb-2 pr-4">수량</th>
                    <th className="pb-2 text-right">손익</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {trade.time}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${trade.type === "Buy" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {trade.price}원
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {trade.qty}
                      </td>
                      <td
                        className={`py-2 text-right font-mono text-xs ${trade.pnl.startsWith("+") ? "text-positive" : trade.pnl.startsWith("-") && trade.pnl !== "-" ? "text-negative" : "text-muted-foreground"}`}
                      >
                        {trade.pnl === "-" ? "-" : `${trade.pnl}원`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: Stats Cards */}
        <div className="space-y-4">
          {/* Key Metrics */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">핵심 성과 지표</h3>
            <div className="space-y-3">
              {[
                {
                  icon: <TrendingUp className="h-4 w-4 text-positive" />,
                  label: "총 수익률",
                  value: `${bot.totalReturn >= 0 ? "+" : ""}${bot.totalReturn}%`,
                  color: bot.totalReturn >= 0 ? "text-positive" : "text-negative",
                },
                {
                  icon: <Activity className="h-4 w-4 text-primary" />,
                  label: "월평균 수익률",
                  value: `${bot.monthlyReturn >= 0 ? "+" : ""}${bot.monthlyReturn}%`,
                  color: bot.monthlyReturn >= 0 ? "text-positive" : "text-negative",
                },
                {
                  icon: <TrendingDown className="h-4 w-4 text-negative" />,
                  label: "최대 낙폭 (MDD)",
                  value: `${bot.maxDrawdown}%`,
                  color: "text-negative",
                },
                {
                  icon: <Zap className="h-4 w-4 text-amber-500" />,
                  label: "샤프 비율",
                  value: bot.sharpeRatio.toFixed(2),
                  color: "",
                },
                {
                  icon: <Target className="h-4 w-4 text-blue-500" />,
                  label: "승률",
                  value: `${bot.winRate}%`,
                  color: "",
                },
                {
                  icon: <Shield className="h-4 w-4 text-emerald-500" />,
                  label: "Profit Factor",
                  value: bot.profitFactor.toFixed(2),
                  color: "",
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {metric.icon}
                    {metric.label}
                  </div>
                  <span className={`font-bold font-mono ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Trade Stats */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">거래 통계</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">총 거래 수</span>
                <span className="font-bold">{bot.totalTrades}회</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">수익 거래</span>
                <span className="font-bold text-positive">
                  {bot.profitTrades}회
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">손실 거래</span>
                <span className="font-bold text-negative">
                  {bot.lossTrades}회
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-positive rounded-full"
                  style={{
                    width: `${bot.totalTrades > 0 ? (bot.profitTrades / bot.totalTrades) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">평균 수익</span>
                <span className="font-bold text-positive">
                  +{bot.avgWin}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">평균 손실</span>
                <span className="font-bold text-negative">
                  {bot.avgLoss}%
                </span>
              </div>
            </div>
          </section>

          {/* Bot Info */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">봇 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">전략</span>
                <span className="font-medium">{bot.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">거래소</span>
                <span className="font-medium">{bot.exchange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">자산</span>
                <span className="font-medium">{bot.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">운영 시작</span>
                <span className="font-medium">{bot.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">투자금</span>
                <span className="font-medium">
                  {formatKRW(effectiveCapital)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">현재 평가</span>
                <span
                  className={`font-bold ${bot.currentValue >= effectiveCapital ? "text-positive" : "text-negative"}`}
                >
                  {formatKRW(bot.currentValue)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
