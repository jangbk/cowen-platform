import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  type Trade,
  calcTotalReturn,
  calcMaxDrawdown,
  calcSharpeRatio,
  calcWinRate,
  calcProfitFactor,
  calcMonthlyReturns,
  calcDailyPnL,
  buildEquityCurve,
  calcAvgWinLoss,
} from "@/lib/bot-metrics";

const ACCESS_TOKEN = process.env.COINONE_ACCESS_TOKEN ?? "";
const SECRET_KEY = process.env.COINONE_SECRET_KEY ?? "";
const BASE_URL = "https://api.coinone.co.kr";

function coinoneSignature(payload: string): string {
  return crypto
    .createHmac("sha512", SECRET_KEY)
    .update(payload)
    .digest("hex");
}

async function coinonePrivateRequest(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const body = {
    ...params,
    access_token: ACCESS_TOKEN,
    nonce: crypto.randomUUID(),
  };

  const payloadStr = Buffer.from(JSON.stringify(body)).toString("base64");
  const signature = coinoneSignature(payloadStr);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-COINONE-PAYLOAD": payloadStr,
      "X-COINONE-SIGNATURE": signature,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

async function coinonePublicRequest(
  endpoint: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  return res.json();
}

export async function GET() {
  if (!ACCESS_TOKEN || !SECRET_KEY) {
    return NextResponse.json(
      { error: "COINONE_ACCESS_TOKEN or COINONE_SECRET_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    // Parallel: balance + ticker + completed orders
    const [balanceRes, tickerRes, ordersRes] = await Promise.all([
      coinonePrivateRequest("/v2.1/account/balance/all"),
      coinonePublicRequest("/public/v2/ticker_new/KRW/BTC"),
      coinonePrivateRequest("/v2.1/order/completed_orders", {
        target_currency: "BTC",
        quote_currency: "KRW",
      }),
    ]);

    if (balanceRes.result !== "success") {
      throw new Error(`Coinone balance error: ${JSON.stringify(balanceRes)}`);
    }

    // Parse balance
    const balances = balanceRes.balances as Array<Record<string, string>> ?? [];
    const btcBalance = balances.find((b) => b.currency === "BTC");
    const krwBalance = balances.find((b) => b.currency === "KRW");

    const totalBtc = parseFloat(btcBalance?.balance || "0");
    const availableBtc = parseFloat(btcBalance?.available || "0");
    const totalKrw = parseFloat(krwBalance?.balance || "0");
    const availableKrw = parseFloat(krwBalance?.available || "0");

    // Current BTC price from ticker
    const tickers = (tickerRes.tickers as Array<Record<string, string>>) ?? [];
    const currentPrice = parseFloat(tickers[0]?.last || "0");

    const btcValueKrw = totalBtc * currentPrice;
    const currentValue = btcValueKrw + totalKrw;

    // Parse completed orders into trades
    const trades: Trade[] = [];
    const orderList =
      (ordersRes.completed_orders as Array<Record<string, string>>) ?? [];

    for (const order of orderList) {
      const isBuy = order.is_ask === "0"; // 0=buy, 1=sell
      const price = parseFloat(order.price || "0");
      const qty = parseFloat(order.qty || "0");
      const fee = parseFloat(order.fee || "0");
      const total = price * qty;

      trades.push({
        time: order.timestamp
          ? new Date(parseInt(order.timestamp) * 1000).toISOString()
          : "",
        type: isBuy ? "buy" : "sell",
        price,
        qty,
        amount: total,
        fee,
      });
    }

    // Pair buy/sell for P&L
    const pairedTrades = pairTradesForPnL(trades);

    const realizedPnL = pairedTrades
      .filter((t) => t.pnl !== undefined)
      .reduce((s, t) => s + (t.pnl ?? 0), 0);
    const initialCapital = Math.max(currentValue - realizedPnL, 8000000);

    const equityCurve = buildEquityCurve(pairedTrades, initialCapital);
    const winLoss = calcWinRate(pairedTrades);
    const avgWL = calcAvgWinLoss(pairedTrades);
    const dailyPnL = calcDailyPnL(pairedTrades, initialCapital);
    const monthlyReturns = calcMonthlyReturns(pairedTrades, initialCapital);
    const dailyReturns = dailyPnL.filter((d) => d !== 0);

    const botStrategy = {
      id: "ptj-200ma",
      name: "PTJ 200MA Bot",
      description: "200MA + 50MA 모멘텀 전략",
      asset: "BTC/KRW",
      exchange: "Coinone",
      status: "active" as const,
      startDate: trades.length
        ? trades[trades.length - 1].time.split("T")[0]
        : "2025-09-01",
      initialCapital,
      currentValue: Math.round(currentValue),
      totalReturn: calcTotalReturn(pairedTrades, initialCapital),
      monthlyReturn:
        monthlyReturns.length > 0
          ? Math.round(
              (monthlyReturns.reduce((s, r) => s + r, 0) /
                (monthlyReturns.filter((r) => r !== 0).length || 1)) * 10
            ) / 10
          : 0,
      maxDrawdown: calcMaxDrawdown(equityCurve),
      sharpeRatio: calcSharpeRatio(dailyReturns),
      winRate: winLoss.winRate,
      totalTrades: winLoss.totalTrades,
      profitTrades: winLoss.profitTrades,
      lossTrades: winLoss.lossTrades,
      avgWin: avgWL.avgWin,
      avgLoss: avgWL.avgLoss,
      profitFactor: calcProfitFactor(pairedTrades),
      dailyPnL,
      monthlyReturns,
      recentTrades: pairedTrades.slice(0, 10).map((t) => ({
        time: t.time.replace("T", " ").slice(0, 16),
        type: t.type === "buy" ? "Buy" : "Sell",
        price: t.price.toLocaleString(),
        qty: t.qty.toFixed(6),
        pnl:
          t.pnl !== undefined
            ? `${t.pnl >= 0 ? "+" : ""}${Math.round(t.pnl).toLocaleString()}`
            : "-",
      })),
      balance: {
        totalBtc,
        availableBtc,
        totalKrw,
        availableKrw,
        btcPrice: currentPrice,
      },
    };

    return NextResponse.json(botStrategy);
  } catch (err) {
    console.error("Coinone API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function pairTradesForPnL(trades: Trade[]): Trade[] {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const result: Trade[] = [];
  const buyQueue: Trade[] = [];

  for (const t of sorted) {
    if (t.type === "buy") {
      buyQueue.push(t);
      result.push(t);
    } else if (t.type === "sell") {
      const matchedBuy = buyQueue.shift();
      const costBasis = matchedBuy
        ? matchedBuy.amount + (matchedBuy.fee ?? 0)
        : 0;
      const sellProceeds = t.amount - (t.fee ?? 0);
      result.push({
        ...t,
        pnl: matchedBuy ? sellProceeds - costBasis : undefined,
      });
    }
  }

  return result.reverse();
}
