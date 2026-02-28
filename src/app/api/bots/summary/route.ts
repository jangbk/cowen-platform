import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Fallback demo data matching the 3 actual bots
const FALLBACK_STRATEGIES = [
  {
    id: "seykota-ema",
    name: "Seykota EMA Bot",
    description: "EMA 15/150 추세추종 전략",
    asset: "BTC/KRW",
    exchange: "Bithumb",
    status: "active" as const,
    startDate: "2026-01-20",
    initialCapital: 3500000,
    currentValue: 6920000,
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
    status: "active" as const,
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
    status: "active" as const,
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

export async function GET() {
  const botEndpoints = [
    { id: "seykota-ema", path: "/api/bots/bithumb" },
    { id: "ptj-200ma", path: "/api/bots/coinone" },
    { id: "kis-rsi-macd", path: "/api/bots/kis" },
  ];

  const results = await Promise.allSettled(
    botEndpoints.map(async (bot) => {
      const res = await fetch(`${BASE_URL}${bot.path}`, {
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        throw new Error(`${bot.id}: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(`${bot.id}: ${data.error}`);
      return { ...data, _live: true };
    })
  );

  const strategies = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    // Fallback to demo data
    console.warn(
      `Bot ${botEndpoints[index].id} failed, using fallback:`,
      result.reason
    );
    return { ...FALLBACK_STRATEGIES[index], _live: false };
  });

  return NextResponse.json(
    { strategies, timestamp: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
      },
    }
  );
}
