import { NextResponse } from "next/server";
import crypto from "crypto";
import dns from "dns";
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

// Force IPv4 to avoid IPv6 IP mismatch with Coinone whitelist
dns.setDefaultResultOrder("ipv4first");

const ACCESS_TOKEN = (process.env.COINONE_ACCESS_TOKEN ?? "").trim();
const SECRET_KEY = (process.env.COINONE_SECRET_KEY ?? "").trim();
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

export async function getCoinoneBotData() {
  if (!ACCESS_TOKEN || !SECRET_KEY) {
    throw new Error("COINONE_ACCESS_TOKEN or COINONE_SECRET_KEY not configured");
  }
  {
    // Parallel: balance + ticker + completed orders
    const [balanceRes, tickerRes, ordersRes] = await Promise.all([
      coinonePrivateRequest("/v2.1/account/balance/all"),
      coinonePublicRequest("/public/v2/ticker_new/KRW/BTC"),
      coinonePrivateRequest("/v2.1/order/completed_orders", {
        target_currency: "btc",
        quote_currency: "krw",
      }),
    ]);

    if (balanceRes.result !== "success") {
      throw new Error(`Coinone balance error: ${JSON.stringify(balanceRes)}`);
    }

    // Coinone V2.1: fields are "available" and "limit" (not "balance"/"locked")
    const balances = balanceRes.balances as Array<Record<string, string>> ?? [];
    const btcBalance = balances.find((b) => b.currency === "BTC");
    const krwBalance = balances.find((b) => b.currency === "KRW");

    const availableBtc = parseFloat(btcBalance?.available || "0");
    const limitBtc = parseFloat(btcBalance?.limit || "0");
    const totalBtc = availableBtc + limitBtc;

    const availableKrw = parseFloat(krwBalance?.available || "0");
    const limitKrw = parseFloat(krwBalance?.limit || "0");
    const totalKrw = availableKrw + limitKrw;

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

    // 실제 입금액 (수동 설정)
    const MANUAL_INITIAL_CAPITAL = 2_500_000; // 250만원
    const initialCapital = MANUAL_INITIAL_CAPITAL;

    const equityCurve = buildEquityCurve(pairedTrades, initialCapital);
    const winLoss = calcWinRate(pairedTrades);
    const avgWL = calcAvgWinLoss(pairedTrades);
    const dailyPnL = calcDailyPnL(pairedTrades, initialCapital);
    const monthlyReturns = calcMonthlyReturns(pairedTrades, initialCapital);
    const dailyReturns = dailyPnL.filter((d) => d !== 0);

    const hasTraded = pairedTrades.some((t) => t.type === "sell" && t.pnl !== undefined);

    const botStrategy = {
      id: "ptj-200ma",
      name: "PTJ 200MA Bot",
      description: "200MA + 50MA 모멘텀 전략",
      asset: "BTC/KRW",
      exchange: "Coinone",
      status: "active" as const,
      startDate: trades.length
        ? trades[trades.length - 1].time.split("T")[0]
        : "2026-01-20",
      initialCapital,
      currentValue: Math.round(currentValue),
      totalReturn: hasTraded && initialCapital > 0
        ? Math.round(((currentValue - initialCapital) / initialCapital) * 1000) / 10
        : 0,
      monthlyReturn: hasTraded && monthlyReturns.filter((r) => r !== 0).length > 0
        ? Math.round(
            (monthlyReturns.reduce((s, r) => s + r, 0) /
              monthlyReturns.filter((r) => r !== 0).length) * 10
          ) / 10
        : 0,
      maxDrawdown: hasTraded ? calcMaxDrawdown(equityCurve) : 0,
      sharpeRatio: hasTraded ? calcSharpeRatio(dailyReturns) : 0,
      winRate: winLoss.winRate,
      totalTrades: winLoss.totalTrades,
      profitTrades: winLoss.profitTrades,
      lossTrades: winLoss.lossTrades,
      avgWin: avgWL.avgWin,
      avgLoss: avgWL.avgLoss,
      profitFactor: hasTraded ? calcProfitFactor(pairedTrades) : 0,
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

    return botStrategy;
  }
}

export async function GET() {
  try {
    const data = await getCoinoneBotData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Coinone API error:", err);
    const status = (err instanceof Error && err.message.includes("not configured")) ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status }
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
