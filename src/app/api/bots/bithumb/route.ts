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

const API_KEY = process.env.BITHUMB_API_KEY ?? "";
const SECRET_KEY = process.env.BITHUMB_SECRET_KEY ?? "";
const BASE_URL = "https://api.bithumb.com";

function createSignature(
  endpoint: string,
  params: Record<string, string>,
  timestamp: string
): string {
  const queryString = new URLSearchParams(params).toString();
  const hmacData =
    endpoint + String.fromCharCode(0) + queryString + String.fromCharCode(0) + timestamp;
  return crypto
    .createHmac("sha512", SECRET_KEY)
    .update(hmacData)
    .digest("hex");
}

async function bithumbRequest(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const timestamp = Date.now().toString();
  const nonce = timestamp;
  const signature = createSignature(endpoint, params, timestamp);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Api-Key": API_KEY,
      "Api-Sign": signature,
      "Api-Timestamp": timestamp,
      "Api-Nonce": nonce,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });

  return res.json();
}

export async function GET() {
  if (!API_KEY || !SECRET_KEY) {
    return NextResponse.json(
      { error: "BITHUMB_API_KEY or BITHUMB_SECRET_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    // Parallel: balance + transactions
    const [balanceRes, txRes] = await Promise.all([
      bithumbRequest("/info/balance", {
        order_currency: "BTC",
        payment_currency: "KRW",
      }),
      bithumbRequest("/info/user_transactions", {
        order_currency: "BTC",
        payment_currency: "KRW",
        searchGb: "0", // all
        offset: "0",
        count: "50",
      }),
    ]);

    if (balanceRes.status !== "0000") {
      throw new Error(`Bithumb balance error: ${balanceRes.message}`);
    }

    const balData = balanceRes.data as Record<string, string>;
    const totalBtc = parseFloat(balData.total_btc || "0");
    const availableBtc = parseFloat(balData.available_btc || "0");
    const totalKrw = parseFloat(balData.total_krw || "0");
    const availableKrw = parseFloat(balData.available_krw || "0");

    // Get current BTC price from public ticker
    const tickerRes = await fetch(
      `${BASE_URL}/public/ticker/BTC_KRW`
    ).then((r) => r.json());
    const currentPrice = parseFloat(
      (tickerRes.data as Record<string, string>)?.closing_price || "0"
    );

    const btcValueKrw = totalBtc * currentPrice;
    const currentValue = btcValueKrw + totalKrw;

    // Parse transactions into Trade format
    const trades: Trade[] = [];
    const txList = (txRes.data as Array<Record<string, string>>) ?? [];

    for (const tx of txList) {
      // type: 1=buy, 2=sell
      const txType = tx.search;
      if (txType !== "1" && txType !== "2") continue;

      const price = Math.abs(parseFloat(tx.price || "0"));
      const units = Math.abs(parseFloat(tx[`units`] || tx.units || "0"));
      const total = Math.abs(parseFloat(tx.total || "0"));
      const fee = parseFloat(tx.fee || "0");

      trades.push({
        time: tx.transfer_date || "",
        type: txType === "1" ? "buy" : "sell",
        price,
        qty: units,
        amount: total,
        fee: Math.abs(fee),
        pnl: txType === "2" ? total - fee : undefined,
      });
    }

    // Pair buy/sell for P&L calculation
    const pairedTrades = pairTradesForPnL(trades);

    // Initial capital estimate: current value minus total realized P&L
    const realizedPnL = pairedTrades
      .filter((t) => t.pnl !== undefined)
      .reduce((s, t) => s + (t.pnl ?? 0), 0);
    const initialCapital = Math.max(currentValue - realizedPnL, 5000000);

    const equityCurve = buildEquityCurve(pairedTrades, initialCapital);
    const winLoss = calcWinRate(pairedTrades);
    const avgWL = calcAvgWinLoss(pairedTrades);
    const dailyPnL = calcDailyPnL(pairedTrades, initialCapital);
    const monthlyReturns = calcMonthlyReturns(pairedTrades, initialCapital);
    const dailyReturns = dailyPnL.filter((d) => d !== 0);

    const botStrategy = {
      id: "seykota-ema",
      name: "Seykota EMA Bot",
      description: "EMA 15/150 추세추종 전략",
      asset: "BTC/KRW",
      exchange: "Bithumb",
      status: "active" as const,
      startDate: trades.length
        ? trades[trades.length - 1].time.split(" ")[0]
        : "2025-06-01",
      initialCapital,
      currentValue: Math.round(currentValue),
      totalReturn: calcTotalReturn(pairedTrades, initialCapital),
      monthlyReturn:
        monthlyReturns.length > 0
          ? Math.round(
              (monthlyReturns.reduce((s, r) => s + r, 0) /
                monthlyReturns.filter((r) => r !== 0).length || 1) * 10
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
        time: t.time,
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
    console.error("Bithumb API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Pair buy→sell transactions to calculate per-trade P&L.
 */
function pairTradesForPnL(trades: Trade[]): Trade[] {
  // Sort chronologically (oldest first)
  const sorted = [...trades].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const result: Trade[] = [];
  let buyQueue: Trade[] = [];

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

  // Return newest first for display
  return result.reverse();
}
