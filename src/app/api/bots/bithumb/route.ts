import { NextResponse } from "next/server";
import crypto from "crypto";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
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

// --- JWT 생성 (Open API 2.0) ---
function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createJWT(payload: Record<string, unknown>): string {
  const header = base64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const signature = base64url(
    crypto.createHmac("sha256", SECRET_KEY).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

function getAuthHeader(queryString?: string): string {
  const payload: Record<string, unknown> = {
    access_key: API_KEY,
    nonce: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  if (queryString) {
    payload.query_hash = crypto.createHash("sha512").update(queryString, "utf-8").digest("hex");
    payload.query_hash_alg = "SHA512";
  }

  return `Bearer ${createJWT(payload)}`;
}

// --- API 2.0 요청 ---
async function bithumbGet(
  endpoint: string,
  params?: Record<string, string>
): Promise<unknown> {
  const queryString = params ? new URLSearchParams(params).toString() : "";
  const url = queryString ? `${BASE_URL}${endpoint}?${queryString}` : `${BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(queryString || undefined),
    },
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
    // 1. 잔고 조회 (v1/accounts) + BTC 시세 (public)
    const [accountsRes, tickerRes] = await Promise.all([
      bithumbGet("/v1/accounts"),
      fetch(`${BASE_URL}/public/ticker/BTC_KRW`).then((r) => r.json()),
    ]);

    const accounts = accountsRes as Array<{
      currency: string;
      balance: string;
      locked: string;
      avg_buy_price: string;
    }>;

    if (!Array.isArray(accounts)) {
      throw new Error(`Bithumb accounts error: ${JSON.stringify(accountsRes)}`);
    }

    const btcAccount = accounts.find((a) => a.currency === "BTC");
    const krwAccount = accounts.find((a) => a.currency === "KRW");

    const totalBtc = parseFloat(btcAccount?.balance || "0") + parseFloat(btcAccount?.locked || "0");
    const availableBtc = parseFloat(btcAccount?.balance || "0");
    const totalKrw = parseFloat(krwAccount?.balance || "0") + parseFloat(krwAccount?.locked || "0");
    const availableKrw = parseFloat(krwAccount?.balance || "0");

    const currentPrice = parseFloat(
      (tickerRes.data as Record<string, string>)?.closing_price || "0"
    );

    const btcValueKrw = totalBtc * currentPrice;
    const currentValue = btcValueKrw + totalKrw;

    // 2. 주문 내역 조회 (체결 완료된 것)
    const ordersRes = await bithumbGet("/v1/orders", {
      market: "KRW-BTC",
      state: "done",
      limit: "50",
      order_by: "desc",
    });

    const orders = Array.isArray(ordersRes) ? ordersRes as Array<{
      uuid: string;
      side: string;
      ord_type: string;
      price: string;
      state: string;
      volume: string;
      remaining_volume: string;
      executed_volume: string;
      trades_count: number;
      created_at: string;
      paid_fee: string;
    }> : [];

    // Parse orders into Trade format
    const trades: Trade[] = [];
    for (const order of orders) {
      const isBuy = order.side === "bid";
      const executedVolume = parseFloat(order.executed_volume || "0");
      if (executedVolume <= 0) continue;

      const price = parseFloat(order.price || "0");
      const fee = parseFloat(order.paid_fee || "0");
      const amount = price * executedVolume;

      trades.push({
        time: order.created_at?.replace("T", " ").slice(0, 19) || "",
        type: isBuy ? "buy" : "sell",
        price,
        qty: executedVolume,
        amount,
        fee,
      });
    }

    // Pair buy/sell for P&L calculation
    const pairedTrades = pairTradesForPnL(trades);

    // Initial capital estimate
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
      description: "EMA 100 + ATR 동적밴드 추세추종 전략",
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
