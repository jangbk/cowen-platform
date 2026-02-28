import { NextResponse } from "next/server";
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

const APP_KEY = process.env.KIS_APP_KEY ?? "";
const APP_SECRET = process.env.KIS_APP_SECRET ?? "";
const CANO = process.env.KIS_CANO ?? "";
const ACNT_PRDT_CD = process.env.KIS_ACNT_PRDT_CD ?? "01";
const BASE_URL = "https://openapivts.koreainvestment.com:29443"; // 모의투자

const WATCHLIST = [
  { symbol: "005930", name: "삼성전자" },
  { symbol: "000660", name: "SK하이닉스" },
  { symbol: "035420", name: "NAVER" },
  { symbol: "035720", name: "카카오" },
  { symbol: "051910", name: "LG화학" },
];

// In-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 10-min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 600_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: APP_KEY,
      appsecret: APP_SECRET,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`KIS token error: ${JSON.stringify(data)}`);
  }

  const expiresIn = parseInt(data.expires_in || "86400", 10) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn,
  };

  return cachedToken.token;
}

function getHeaders(token: string, trId: string): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    authorization: `Bearer ${token}`,
    appkey: APP_KEY,
    appsecret: APP_SECRET,
    tr_id: trId,
  };
}

async function kisGet(
  token: string,
  endpoint: string,
  trId: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(token, trId),
  });

  const data = await res.json();
  if (data.rt_cd !== "0") {
    throw new Error(`KIS API error (${trId}): ${data.msg1 || JSON.stringify(data)}`);
  }
  return data;
}

export async function GET() {
  if (!APP_KEY || !APP_SECRET || !CANO) {
    return NextResponse.json(
      { error: "KIS_APP_KEY, KIS_APP_SECRET, or KIS_CANO not configured" },
      { status: 503 }
    );
  }

  try {
    const token = await getAccessToken();

    // 1. Get balance (holdings)
    const balanceData = await kisGet(
      token,
      "/uapi/domestic-stock/v1/trading/inquire-balance",
      "VTTC8434R",
      {
        CANO,
        ACNT_PRDT_CD,
        AFHR_FLPR_YN: "N",
        OFL_YN: "",
        INQR_DVSN: "02",
        UNPR_DVSN: "01",
        FUND_STTL_ICLD_YN: "N",
        FNCG_AMT_AUTO_RDPT_YN: "N",
        PRCS_DVSN: "00",
        CTX_AREA_FK100: "",
        CTX_AREA_NK100: "",
      }
    );

    const output1 = (balanceData.output1 as Array<Record<string, string>>) ?? [];
    const output2 = ((balanceData.output2 as Array<Record<string, string>>) ?? [{}])[0] ?? {};

    const holdings = output1
      .filter((item) => parseInt(item.hldg_qty || "0", 10) > 0)
      .map((item) => ({
        symbol: item.pdno || "",
        name: item.prdt_name || "",
        quantity: parseInt(item.hldg_qty || "0", 10),
        avgPrice: parseFloat(item.pchs_avg_pric || "0"),
        currentPrice: parseInt(item.prpr || "0", 10),
        evalAmount: parseInt(item.evlu_amt || "0", 10),
        profitLoss: parseInt(item.evlu_pfls_amt || "0", 10),
        profitLossRate: parseFloat(item.evlu_pfls_rt || "0"),
      }));

    const totalEval = parseInt(output2.tot_evlu_amt || "0", 10);
    const totalPurchase = parseInt(output2.pchs_amt_smtl_amt || "0", 10);
    const totalProfitLoss = parseInt(output2.evlu_pfls_smtl_amt || "0", 10);
    const availableCash = parseInt(output2.dnca_tot_amt || "0", 10);
    const totalAsset =
      parseInt(output2.scts_evlu_amt || "0", 10) + availableCash;

    // 2. Get order history (today)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    // Look back 30 days for trade history
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDateStr = thirtyDaysAgo.toISOString().slice(0, 10).replace(/-/g, "");

    const orderData = await kisGet(
      token,
      "/uapi/domestic-stock/v1/trading/inquire-daily-ccld",
      "VTTC8001R",
      {
        CANO,
        ACNT_PRDT_CD,
        INQR_STRT_DT: startDateStr,
        INQR_END_DT: dateStr,
        SLL_BUY_DVSN_CD: "00",
        INQR_DVSN: "00",
        PDNO: "",
        CCLD_DVSN: "00",
        ORD_GNO_BRNO: "",
        ODNO: "",
        INQR_DVSN_3: "00",
        INQR_DVSN_1: "",
        CTX_AREA_FK100: "",
        CTX_AREA_NK100: "",
      }
    );

    const orderOutput = (orderData.output1 as Array<Record<string, string>>) ?? [];

    // Convert orders to Trade format
    const trades: Trade[] = orderOutput
      .filter((item) => parseInt(item.tot_ccld_qty || "0", 10) > 0)
      .map((item) => {
        const isBuy = item.sll_buy_dvsn_cd === "02";
        const execPrice = parseInt(item.avg_prvs || "0", 10);
        const execQty = parseInt(item.tot_ccld_qty || "0", 10);
        const amount = execPrice * execQty;
        const ordDate = item.ord_dt || dateStr;
        const ordTime = item.ord_tmd || "000000";
        const timeStr = `${ordDate.slice(0, 4)}-${ordDate.slice(4, 6)}-${ordDate.slice(6, 8)} ${ordTime.slice(0, 2)}:${ordTime.slice(2, 4)}`;

        return {
          time: timeStr,
          type: isBuy ? ("buy" as const) : ("sell" as const),
          price: execPrice,
          qty: execQty,
          amount,
          fee: 0,
        };
      });

    // Pair trades for P&L
    const pairedTrades = pairTradesForPnL(trades);

    // 실제 입금액 (수동 설정) - 모의투자 1억원
    const MANUAL_INITIAL_CAPITAL = 100_000_000; // 1억원
    const initialCapital = MANUAL_INITIAL_CAPITAL;
    const currentValue = totalAsset || initialCapital;

    const equityCurve = buildEquityCurve(pairedTrades, initialCapital);
    const winLoss = calcWinRate(pairedTrades);
    const avgWL = calcAvgWinLoss(pairedTrades);
    const dailyPnL = calcDailyPnL(pairedTrades, initialCapital);
    const monthlyReturns = calcMonthlyReturns(pairedTrades, initialCapital);
    const dailyReturns = dailyPnL.filter((d) => d !== 0);

    const botStrategy = {
      id: "kis-rsi-macd",
      name: "KIS RSI/MACD Bot",
      description: "RSI 14 + MACD 12/26/9 전략",
      asset: WATCHLIST.map((w) => w.name).join(", "),
      exchange: "한국투자증권",
      status: "active" as const,
      startDate: trades.length
        ? trades[trades.length - 1].time.split(" ")[0]
        : "2025-04-01",
      initialCapital,
      currentValue,
      totalReturn: initialCapital > 0
        ? Math.round(((currentValue - initialCapital) / initialCapital) * 1000) / 10
        : calcTotalReturn(pairedTrades, initialCapital),
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
        time: t.time,
        type: t.type === "buy" ? "Buy" : "Sell",
        price: t.price.toLocaleString(),
        qty: t.qty.toString(),
        pnl:
          t.pnl !== undefined
            ? `${t.pnl >= 0 ? "+" : ""}${Math.round(t.pnl).toLocaleString()}`
            : "-",
      })),
      holdings,
      accountSummary: {
        totalEval,
        totalPurchase,
        totalProfitLoss,
        availableCash,
        totalAsset,
      },
    };

    return NextResponse.json(botStrategy);
  } catch (err) {
    console.error("KIS API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function pairTradesForPnL(trades: Trade[]): Trade[] {
  // Group by symbol-like approach: since KIS trades multiple stocks,
  // we pair buy/sell per trade sequence
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
      const costBasis = matchedBuy ? matchedBuy.amount : 0;
      const sellProceeds = t.amount;
      result.push({
        ...t,
        pnl: matchedBuy ? sellProceeds - costBasis : undefined,
      });
    }
  }

  return result.reverse();
}
