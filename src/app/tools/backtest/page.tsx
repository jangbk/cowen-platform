"use client";

import { useState, useCallback } from "react";
import EquityCurveChart from "@/components/charts/EquityCurveChart";
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
  ArrowUpRight,
  Settings,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Info,
} from "lucide-react";

interface Strategy {
  id: string;
  name: string;
  description: string;
  params: string[];
  paramHints?: string[];
  isBotStrategy?: boolean;
}

const STRATEGIES: Strategy[] = [
  // --- 일반 전략 ---
  {
    id: "volatility-breakout",
    name: "변동성 돌파 (Larry Williams)",
    description: "전일 변동폭의 K% 이상 돌파 시 매수, 익일 시가 매도",
    params: ["K값 (0.3~0.8)", "투자비율 (%)", "손절선 (%)"],
    paramHints: [
      "전일 변동폭 대비 돌파 기준. 낮을수록 진입 빈번, 높을수록 보수적",
      "보유 현금 중 한 번에 투자할 비율",
      "매수 후 이 비율만큼 하락하면 손절 매도",
    ],
  },
  {
    id: "trend-following",
    name: "추세추종 (이동평균 크로스)",
    description: "단기 MA가 장기 MA를 상향/하향 돌파 시 매수/매도",
    params: ["단기 MA", "장기 MA", "필터 기간"],
    paramHints: [
      "단기 이동평균 기간 (일). 작을수록 민감하게 반응",
      "장기 이동평균 기간 (일). 클수록 큰 추세만 포착",
      "크로스 후 확인 기간. 가짜 신호 필터링",
    ],
  },
  {
    id: "mean-reversion",
    name: "평균회귀 (볼린저 밴드)",
    description: "하단 밴드 터치 시 매수, 상단 밴드 터치 시 매도",
    params: ["기간", "표준편차 배수", "진입 조건"],
    paramHints: [
      "볼린저 밴드 중심선(SMA) 계산 기간",
      "밴드 폭 결정. 2.0이 표준, 높을수록 밴드가 넓어짐",
      "밴드 터치/돌파 등 진입 조건 설정",
    ],
  },
  {
    id: "momentum",
    name: "모멘텀 전략 (RSI + MACD)",
    description: "RSI 과매도 + MACD 골든크로스 조합 신호",
    params: ["RSI 기간", "RSI 과매도", "MACD 단기/장기"],
    paramHints: [
      "RSI 계산 기간. 14가 표준, 짧으면 민감",
      "과매도 기준값. 30 이하가 일반적",
      "MACD의 단기/장기 EMA 기간 (예: 12/26)",
    ],
  },
  {
    id: "dca-dynamic",
    name: "동적 DCA (리스크 기반)",
    description: "리스크 지표에 따라 투자 금액을 동적으로 조절하는 DCA",
    params: ["기본 투자금", "리스크 배수", "매수 주기"],
    paramHints: [
      "한 회차 기본 투자 금액 (원)",
      "리스크 점수에 따라 투자금을 조절하는 배수",
      "정기 매수 주기 (일 단위)",
    ],
  },
  {
    id: "grid-trading",
    name: "그리드 트레이딩",
    description: "일정 가격 간격으로 매수/매도 주문을 설정하는 전략",
    params: ["그리드 수", "상한가", "하한가"],
    paramHints: [
      "상한~하한 사이에 배치할 주문 개수. 많을수록 촘촘",
      "그리드 상단 가격 (이 위에서는 매도만)",
      "그리드 하단 가격 (이 아래에서는 매수만)",
    ],
  },
  // --- 가동 중인 봇 ---
  {
    id: "bot-seykota-ema",
    name: "🤖 Seykota EMA Bot (빗썸)",
    description: "EMA100 + ATR 동적밴드 추세추종 — 실제 가동 중",
    params: ["EMA 기간", "ATR 배수", "ATR 기간"],
    paramHints: [
      "지수이동평균 기간 (일). 추세의 중심선을 결정. 클수록 장기 추세",
      "ATR에 곱하는 배수. 매수/매도 밴드 폭을 결정. 클수록 보수적",
      "평균 변동폭(ATR) 계산 기간 (일). 최근 변동성 민감도 조절",
    ],
    isBotStrategy: true,
  },
  {
    id: "bot-ptj-200ma",
    name: "🤖 PTJ 200MA Bot (코인원)",
    description: "EMA200 + ATR 동적밴드 추세추종 — 실제 가동 중",
    params: ["EMA 기간", "ATR 배수", "ATR 기간"],
    paramHints: [
      "지수이동평균 기간 (일). 200일이 장기 추세의 표준 기준선",
      "ATR에 곱하는 배수. 매수/매도 밴드 폭을 결정. 클수록 보수적",
      "평균 변동폭(ATR) 계산 기간 (일). 최근 변동성 민감도 조절",
    ],
    isBotStrategy: true,
  },
  {
    id: "bot-kis-rsi-macd",
    name: "🤖 KIS RSI/MACD Bot (한투)",
    description: "MACD 크로스 + EMA 트렌드 필터 — 실제 가동 중",
    params: ["MACD 단기/장기/시그널", "EMA 필터", "손절 (%)"],
    paramHints: [
      "MACD 계산용 단기/장기/시그널 EMA 기간 (예: 12/26/9)",
      "트렌드 필터 EMA 기간. 가격이 이 위에 있을 때만 매수",
      "매수 후 이 비율만큼 하락하면 강제 매도 (손실 제한)",
    ],
    isBotStrategy: true,
  },
];

const KR_STOCK_ASSETS: { label: string; value: string; symbol: string }[] = [
  { label: "삼성전자", value: "삼성전자", symbol: "005930" },
  { label: "SK하이닉스", value: "SK하이닉스", symbol: "000660" },
  { label: "NAVER", value: "NAVER", symbol: "035420" },
  { label: "카카오", value: "카카오", symbol: "035720" },
  { label: "LG화학", value: "LG화학", symbol: "051910" },
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

type PriceBar = { date: string; open: number; high: number; low: number; close: number };

const ASSET_TO_COINGECKO: Record<string, string> = {
  "BTC/KRW": "bitcoin",
  "ETH/KRW": "ethereum",
  "BTC/USDT": "bitcoin",
  "ETH/USDT": "ethereum",
  "SOL/KRW": "solana",
  "XRP/KRW": "ripple",
  "BTC/USD": "bitcoin",
};

// --- Helper: compute common stats from equity curve and trades ---
function computeStats(
  prices: PriceBar[],
  equityCurve: number[],
  drawdownCurve: number[],
  trades: { pnl: number; holdDays: number }[],
  capital: number,
  initialCapital: number,
  maxDD: number,
  strategyName: string,
  assetName: string,
  dataSourceLabel: string,
): BacktestResult {
  const profitTrades = trades.filter((t) => t.pnl > 0);
  const lossTrades = trades.filter((t) => t.pnl <= 0);
  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const days = prices.length;
  const years = days / 365;
  const annualizedReturn = years > 0 ? (Math.pow(capital / initialCapital, 1 / years) - 1) * 100 : totalReturn;

  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i] / equityCurve[i - 1] - 1) * 100);
  }
  const meanDaily = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const stdDaily = dailyReturns.length > 0
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / dailyReturns.length)
    : 0;
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downside = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((s, r) => s + r * r, 0) / downsideReturns.length)
    : 0;

  const sharpeAnn = stdDaily > 0 ? ((annualizedReturn - 4.5) / (stdDaily * Math.sqrt(365))) : 0;
  const sortinoAnn = downside > 0 ? ((annualizedReturn - 4.5) / (downside * Math.sqrt(365))) : 0;
  const calmar = maxDD !== 0 ? annualizedReturn / Math.abs(maxDD) : 0;

  const benchmarkReturn = prices.length > 1 ? ((prices[prices.length - 1].close / prices[0].close - 1) * 100) : 0;
  const benchmarkCurve = prices.map((p) => (p.close / prices[0].close) * 100);

  // Compute beta: Cov(strategy, benchmark) / Var(benchmark)
  const benchDailyReturns: number[] = [];
  for (let i = 1; i < benchmarkCurve.length; i++) {
    benchDailyReturns.push((benchmarkCurve[i] / benchmarkCurve[i - 1] - 1) * 100);
  }
  let beta = 0.65;
  if (dailyReturns.length > 0 && benchDailyReturns.length > 0) {
    const minLen = Math.min(dailyReturns.length, benchDailyReturns.length);
    const meanStrat = dailyReturns.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
    const meanBench = benchDailyReturns.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
    let cov = 0, varBench = 0;
    for (let i = 0; i < minLen; i++) {
      cov += (dailyReturns[i] - meanStrat) * (benchDailyReturns[i] - meanBench);
      varBench += (benchDailyReturns[i] - meanBench) ** 2;
    }
    beta = varBench > 0 ? cov / varBench : 0;
  }

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

  let maxConsW = 0, maxConsL = 0, curConsW = 0, curConsL = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curConsW++; curConsL = 0; maxConsW = Math.max(maxConsW, curConsW); }
    else { curConsL++; curConsW = 0; maxConsL = Math.max(maxConsL, curConsL); }
  }

  const avgWin = profitTrades.length > 0 ? profitTrades.reduce((s, t) => s + t.pnl, 0) / profitTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length : 0;
  const profitFactor = (lossTrades.length > 0 && avgLoss !== 0)
    ? Math.abs(profitTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.reduce((s, t) => s + t.pnl, 0))
    : 0;
  const avgHoldingDays = trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t.holdDays, 0) / trades.length) : 0;

  return {
    strategy: strategyName,
    asset: assetName,
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
    avgHoldingDays: avgHoldingDays || 1,
    maxConsecutiveWins: maxConsW,
    maxConsecutiveLosses: maxConsL,
    benchmarkReturn: Math.round(benchmarkReturn * 10) / 10,
    alpha: Math.round((totalReturn - benchmarkReturn) * 10) / 10,
    beta: Math.round(beta * 100) / 100,
    equityCurve,
    benchmarkCurve,
    monthlyReturns,
    drawdownCurve,
    dataSource: dataSourceLabel,
  };
}

// Run volatility breakout backtest on real data
function runVolatilityBreakout(
  prices: PriceBar[],
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

  const tradesMapped = trades.map((t) => ({ pnl: t.pnl, holdDays: 1 }));
  return computeStats(
    prices,
    equityCurve,
    drawdownCurve,
    tradesMapped,
    capital,
    initialCapital,
    maxDD,
    "변동성 돌파 (Larry Williams)",
    "BTC",
    "CryptoCompare (실제 데이터)",
  );
}

// --- EMA helper ---
function calcEMA(closes: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  ema[0] = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema[i] = closes[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

// --- SMA helper ---
function calcSMA(closes: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      sma.push(sum / period);
    }
  }
  return sma;
}

// --- ATR helper (Wilder's smoothing) ---
function calcATR(prices: PriceBar[], period: number): number[] {
  const atr: number[] = [];
  atr[0] = prices[0].high - prices[0].low;
  for (let i = 1; i < prices.length; i++) {
    const tr = Math.max(
      prices[i].high - prices[i].low,
      Math.abs(prices[i].high - prices[i - 1].close),
      Math.abs(prices[i].low - prices[i - 1].close),
    );
    if (i < period) {
      atr[i] = atr[i - 1] + (tr - atr[i - 1]) / (i + 1);
    } else {
      atr[i] = atr[i - 1] * (period - 1) / period + tr / period;
    }
  }
  return atr;
}

// --- Seykota EMA Bot ---
// EMA + ATR 동적밴드 추세추종 전략 (Ed Seykota 스타일)
// 매수: price > EMA + ATR*배수 (상승 추세 돌파)
// 매도: price < EMA - ATR*배수 (하락 추세 돌파)
// ATR 동적밴드로 변동성에 따라 진입/청산 기준 자동 조절
function runSeykotaEMA(
  prices: PriceBar[],
  emaPeriod: number = 100,
  atrMult: number = 1.5,
  atrPeriod: number = 14,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, atrPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema[i];
    const band = atr[i] * atrMult;

    if (position === 0) {
      // 매수: 가격이 EMA + ATR*배수 위로 돌파
      if (close > ma + band) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      // 매도: 가격이 EMA - ATR*배수 아래로 하락
      if (close < ma - band) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // Close open position at end
  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve,
    drawdownCurve,
    trades,
    capital,
    initialCapital,
    maxDD,
    "Seykota EMA Bot",
    "BTC",
    "CryptoCompare (실제 데이터)",
  );
}

// --- PTJ 200MA Bot ---
// EMA200 + ATR 동적밴드 추세추종 전략
// 매수: price > EMA200 + ATR*배수 (상승 추세 확인)
// 매도: price < EMA200 - ATR*배수 (하락 추세 확인)
// ATR 동적밴드로 변동성에 따라 진입/청산 기준 자동 조절
function runPTJ200MA(
  prices: PriceBar[],
  emaPeriod: number = 200,
  atrMult: number = 1.5,
  atrPeriod: number = 14,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema200 = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, atrPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema200[i];
    const band = atr[i] * atrMult;

    if (position === 0) {
      // 매수: 가격이 EMA200 + ATR*배수 위로 돌파
      if (close > ma + band) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      // 매도: 가격이 EMA200 - ATR*배수 아래로 하락
      if (close < ma - band) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // Close open position
  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve,
    drawdownCurve,
    trades,
    capital,
    initialCapital,
    maxDD,
    "PTJ 200MA Bot",
    "BTC",
    "CryptoCompare (실제 데이터)",
  );
}

// --- KIS MACD Bot ---
// MACD 크로스 + EMA 트렌드 필터 전략
// 매수: MACD 골든크로스 (MACD가 시그널 상향돌파) AND price > EMA (상승추세 확인)
// 매도: MACD 데드크로스 (MACD가 시그널 하향돌파) OR 손절
// 익절 없음 (수익 거래를 조기 청산하지 않음)
function runKISRsiMacd(
  prices: PriceBar[],
  macdFast: number = 12,
  macdSlow: number = 26,
  macdSignalPeriod: number = 9,
  emaPeriod: number = 20,
  stopLoss: number = 7,
  commission: number = 0.00015,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema = calcEMA(closes, emaPeriod);

  // MACD
  const emaFastArr = calcEMA(closes, macdFast);
  const emaSlowArr = calcEMA(closes, macdSlow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(emaFastArr[i] - emaSlowArr[i]);
  }
  const signalLine = calcEMA(macdLine, macdSignalPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = Math.max(macdSlow + macdSignalPeriod, emaPeriod);

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const curMacd = macdLine[i];
    const prevMacd = macdLine[i - 1];
    const curSignal = signalLine[i];
    const prevSignal = signalLine[i - 1];

    if (position === 0) {
      // 매수: MACD 골든크로스 + 가격이 EMA 위 (상승추세)
      const macdGoldenCross = prevMacd <= prevSignal && curMacd > curSignal;
      if (macdGoldenCross && close > ema[i]) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      const pnlPct = ((close - entryPrice) / entryPrice) * 100;

      let shouldSell = false;
      // MACD 데드크로스
      const macdDeadCross = prevMacd >= prevSignal && curMacd < curSignal;
      if (macdDeadCross) shouldSell = true;
      // 손절
      if (stopLoss > 0 && pnlPct <= -stopLoss) shouldSell = true;

      if (shouldSell) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // Close open position
  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve,
    drawdownCurve,
    trades,
    capital,
    initialCapital,
    maxDD,
    "KIS MACD Bot",
    "한국주식",
    "Yahoo Finance (실제 데이터)",
  );
}

// --- Default param values per bot strategy ---
function getBotDefaults(strategyId: string): string[] {
  switch (strategyId) {
    case "bot-seykota-ema": return ["100", "1.5", "14"];
    case "bot-ptj-200ma": return ["200", "1.5", "14"];
    case "bot-kis-rsi-macd": return ["12/26/9", "20", "7"];
    default: return ["0.5", "80", "5"];
  }
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
  const [paramValues, setParamValues] = useState<string[]>(["0.5", "80", "5"]);

  const strategy = STRATEGIES.find((s) => s.id === selectedStrategy)!;
  const isBotStrategy = strategy?.isBotStrategy ?? false;
  const isKIS = selectedStrategy === "bot-kis-rsi-macd";
  const isCryptoBotStrategy = selectedStrategy === "bot-seykota-ema" || selectedStrategy === "bot-ptj-200ma";

  const normalStrategies = STRATEGIES.filter((s) => !s.isBotStrategy);
  const botStrategies = STRATEGIES.filter((s) => s.isBotStrategy);

  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    const newDefaults = getBotDefaults(strategyId);
    setParamValues(newDefaults);

    // Auto-set asset and date range
    if (strategyId === "bot-seykota-ema" || strategyId === "bot-ptj-200ma") {
      setAsset("BTC/USD");
      setStartDate("2017-01-01");
    } else if (strategyId === "bot-kis-rsi-macd") {
      setAsset("삼성전자");
    }
  };

  const handleRunBacktest = useCallback(async () => {
    setIsRunning(true);
    setHasResult(false);

    try {
      const capital = parseInt(initialCapital) || 10000000;

      // KIS RSI/MACD: fetch from Yahoo Finance
      if (selectedStrategy === "bot-kis-rsi-macd") {
        const krStock = KR_STOCK_ASSETS.find((s) => s.value === asset);
        const symbol = krStock ? krStock.symbol : "005930";
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.KS?range=2y&interval=1d`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Yahoo Finance error");
        const json = await res.json();

        const chart = json.chart?.result?.[0];
        if (!chart || !chart.timestamp) throw new Error("No Yahoo data");

        const timestamps = chart.timestamp;
        const quote = chart.indicators?.quote?.[0];
        if (!quote) throw new Error("No quote data");

        const prices: PriceBar[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (quote.open[i] != null && quote.close[i] != null) {
            prices.push({
              date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
              open: quote.open[i],
              high: quote.high[i],
              low: quote.low[i],
              close: quote.close[i],
            });
          }
        }

        if (prices.length < 50) throw new Error("Insufficient data");

        // Parse KIS params
        const macdParts = paramValues[0].split("/").map(Number);
        const macdFast = macdParts[0] || 12;
        const macdSlow = macdParts[1] || 26;
        const macdSignal = macdParts[2] || 9;
        const emaPeriod = parseInt(paramValues[1]) || 20;
        const stopLoss = parseFloat(paramValues[2]) || 7;

        const backResult = runKISRsiMacd(prices, macdFast, macdSlow, macdSignal, emaPeriod, stopLoss, 0.00015, capital);
        backResult.asset = krStock?.label || "삼성전자";
        backResult.dataSource = "Yahoo Finance (실제 데이터)";
        setResult(backResult);
        setDataSource("Yahoo Finance (실제 데이터)");
        setHasResult(true);
        return;
      }

      // Crypto strategies: CryptoCompare
      const coinId = ASSET_TO_COINGECKO[asset] || "bitcoin";
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Bot strategies need extra warmup bars for MA calculation
      let warmupBars = 0;
      if (selectedStrategy === "bot-ptj-200ma") {
        warmupBars = (parseInt(paramValues[0]) || 200) + 10;
      } else if (selectedStrategy === "bot-seykota-ema") {
        warmupBars = (parseInt(paramValues[0]) || 100) + 10;
      }
      const totalBarsNeeded = daysDiff + warmupBars;
      const toTs = Math.floor(end.getTime() / 1000);
      const fsym = coinId === "bitcoin" ? "BTC" : coinId === "ethereum" ? "ETH" : coinId === "solana" ? "SOL" : "XRP";

      // Fetch data — multiple requests if >2000 bars needed
      const allDataMap = new Map<number, { time: number; open: number; high: number; low: number; close: number }>();
      if (totalBarsNeeded <= 2000) {
        const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=USD&limit=${totalBarsNeeded}&toTs=${toTs}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("CryptoCompare error");
        const json = await res.json();
        if (json.Data?.Data) for (const d of json.Data.Data) if (d.open > 0) allDataMap.set(d.time, d);
      } else {
        // Split into 2 requests
        const midTs = toTs - Math.floor(totalBarsNeeded / 2) * 86400;
        const urls = [
          `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=USD&limit=2000&toTs=${midTs}`,
          `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=USD&limit=2000&toTs=${toTs}`,
        ];
        const results = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json())));
        for (const json of results) {
          if (json.Data?.Data) for (const d of json.Data.Data) if (d.open > 0) allDataMap.set(d.time, d);
        }
      }

      const pricesSorted = Array.from(allDataMap.values()).sort((a, b) => a.time - b.time);

      if (pricesSorted.length > 10) {
        const prices: PriceBar[] = pricesSorted
          .map((d) => ({
            date: new Date(d.time * 1000).toISOString().split("T")[0],
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));

        let backResult: BacktestResult;

        switch (selectedStrategy) {
          case "bot-seykota-ema": {
            const emaPeriod = parseInt(paramValues[0]) || 100;
            const atrMult = parseFloat(paramValues[1]) || 1.5;
            const atrPeriod = parseInt(paramValues[2]) || 14;
            backResult = runSeykotaEMA(prices, emaPeriod, atrMult, atrPeriod, 0.001, capital);
            break;
          }
          case "bot-ptj-200ma": {
            const emaPeriod = parseInt(paramValues[0]) || 200;
            const atrMult = parseFloat(paramValues[1]) || 1.5;
            const atrPeriod = parseInt(paramValues[2]) || 14;
            backResult = runPTJ200MA(prices, emaPeriod, atrMult, atrPeriod, 0.001, capital);
            break;
          }
          default: {
            backResult = runVolatilityBreakout(prices, 0.5, 80, capital);
            break;
          }
        }

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
  }, [asset, startDate, endDate, initialCapital, selectedStrategy, paramValues]);

  const handleDownload = () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push("지표,값");
    lines.push(`전략,${result.strategy}`);
    lines.push(`자산,${result.asset}`);
    lines.push(`기간,${result.period}`);
    lines.push(`초기자본,${result.initialCapital}`);
    lines.push(`최종자본,${result.finalCapital}`);
    lines.push(`총수익률,${result.totalReturn}%`);
    lines.push(`연환산수익률,${result.annualizedReturn}%`);
    lines.push(`최대낙폭,${result.maxDrawdown}%`);
    lines.push(`샤프비율,${result.sharpeRatio}`);
    lines.push(`소르티노비율,${result.sortinoRatio}`);
    lines.push(`칼마비율,${result.calmarRatio}`);
    lines.push(`승률,${result.winRate}%`);
    lines.push(`Profit Factor,${result.profitFactor}`);
    lines.push(`총거래수,${result.totalTrades}`);
    lines.push(`수익거래,${result.profitTrades}`);
    lines.push(`손실거래,${result.lossTrades}`);
    lines.push(`평균수익,${result.avgWin}%`);
    lines.push(`평균손실,${result.avgLoss}%`);
    lines.push(`벤치마크수익률,${result.benchmarkReturn}%`);
    lines.push(`Alpha,${result.alpha}%`);
    lines.push(`Beta,${result.beta}`);
    lines.push("");
    lines.push("월,수익률(%)");
    for (const m of result.monthlyReturns) {
      lines.push(`${m.month},${m.ret}`);
    }

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_${result.strategy.replace(/\s+/g, "_")}_${result.asset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const r = result;


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
              onChange={(e) => handleStrategyChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <optgroup label="일반 전략">
                {normalStrategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🤖 가동 중인 봇">
                {botStrategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {strategy.description}
            </p>
          </div>

          {/* Asset */}
          <div>
            <label className="text-sm text-muted-foreground">자산</label>
            {isKIS ? (
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {KR_STOCK_ASSETS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({s.symbol}.KS)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {isCryptoBotStrategy && (
                  <option value="BTC/USD">Bitcoin (BTC/USD)</option>
                )}
                <option value="BTC/KRW">Bitcoin (BTC/KRW)</option>
                <option value="ETH/KRW">Ethereum (ETH/KRW)</option>
                <option value="BTC/USDT">Bitcoin (BTC/USDT)</option>
                <option value="ETH/USDT">Ethereum (ETH/USDT)</option>
                <option value="SOL/KRW">Solana (SOL/KRW)</option>
                <option value="XRP/KRW">XRP (XRP/KRW)</option>
              </select>
            )}
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
            <div key={`${selectedStrategy}-${i}`}>
              <label className="text-sm text-muted-foreground">{param}</label>
              <input
                type="text"
                value={paramValues[i] ?? ""}
                onChange={(e) => {
                  const next = [...paramValues];
                  next[i] = e.target.value;
                  setParamValues(next);
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {strategy.paramHints?.[i] && (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground/60">
                  {strategy.paramHints[i]}
                </p>
              )}
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
          <button
            onClick={handleDownload}
            disabled={!result}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
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
                value: `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn}%`,
                icon: <TrendingUp className="h-4 w-4" />,
                color: r.totalReturn >= 0 ? "text-positive" : "text-negative",
              },
              {
                label: "연환산 수익률",
                value: `${r.annualizedReturn >= 0 ? "+" : ""}${r.annualizedReturn}%`,
                icon: <ArrowUpRight className="h-4 w-4" />,
                color: r.annualizedReturn >= 0 ? "text-positive" : "text-negative",
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
                value: `${r.alpha >= 0 ? "+" : ""}${r.alpha}%`,
                icon: <Activity className="h-4 w-4" />,
                color: r.alpha >= 0 ? "text-positive" : "text-negative",
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
              <EquityCurveChart
                curves={[
                  { data: r.equityCurve, color: "#3b82f6", fillOpacity: 0.08 },
                  { data: r.benchmarkCurve, color: "#94a3b8", strokeWidth: 1.5, dashed: true },
                ]}
                height="h-60"
              />
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-4 bg-blue-500 rounded" />
                  전략: {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-4 bg-gray-400 rounded border-dashed" />
                  벤치마크: {r.benchmarkReturn >= 0 ? "+" : ""}{r.benchmarkReturn}%
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
                  {Array.from(new Set(r.monthlyReturns.map((m) => m.month.slice(0, 4)))).map((year) => {
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
                    ["총 수익률", `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn}%`, "투자 시작부터 종료까지의 전체 누적 수익률"],
                    ["연환산 수익률", `${r.annualizedReturn >= 0 ? "+" : ""}${r.annualizedReturn}%`, "총 수익률을 연 단위로 환산한 복리 수익률 (CAGR)"],
                    ["벤치마크 수익률", `${r.benchmarkReturn >= 0 ? "+" : ""}${r.benchmarkReturn}%`, "같은 기간 해당 자산을 단순 매수 보유(Buy & Hold)했을 때의 수익률"],
                    ["Alpha", `${r.alpha >= 0 ? "+" : ""}${r.alpha}%`, "벤치마크 대비 초과 수익률. 양수면 시장을 이긴 전략"],
                    ["Beta", r.beta.toFixed(2), "시장 대비 변동성 민감도. 1 미만이면 시장보다 덜 변동"],
                    ["최종 자본", `${(r.finalCapital / 10000).toLocaleString()}만원`, "백테스트 종료 시점의 총 자산 가치"],
                  ].map(([label, value, desc]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {label}
                        <span className="relative group/tip">
                          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary cursor-help transition-colors" />
                          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tip:block w-52 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg z-50 bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-800 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-zinc-800 dark:before:border-r-zinc-100">
                            {desc}
                          </span>
                        </span>
                      </span>
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
                    ["최대 낙폭 (MDD)", `${r.maxDrawdown}%`, "고점 대비 최대 하락폭. 투자 중 겪을 수 있는 최악의 손실"],
                    ["샤프 비율", r.sharpeRatio.toFixed(2), "위험 대비 수익. 1 이상이면 양호, 2 이상이면 우수"],
                    ["소르티노 비율", r.sortinoRatio.toFixed(2), "하방 위험만 고려한 샤프 비율. 하락 변동성 대비 수익 측정"],
                    ["칼마 비율", r.calmarRatio.toFixed(2), "연환산 수익률 ÷ MDD. 낙폭 대비 수익 효율 측정"],
                    ["Profit Factor", r.profitFactor.toFixed(2), "총 수익 ÷ 총 손실. 1 이상이면 수익이 손실보다 큰 전략"],
                    ["평균 보유 기간", `${r.avgHoldingDays}일`, "한 포지션의 평균 유지 기간 (진입~청산)"],
                  ].map(([label, value, desc]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {label}
                        <span className="relative group/tip">
                          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary cursor-help transition-colors" />
                          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tip:block w-52 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg z-50 bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-800 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-zinc-800 dark:before:border-r-zinc-100">
                            {desc}
                          </span>
                        </span>
                      </span>
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
                    ["총 거래 수", `${r.totalTrades}회`, "백테스트 기간 동안 실행된 전체 매매 횟수"],
                    ["승률", `${r.winRate}%`, "전체 거래 중 수익을 낸 거래의 비율"],
                    ["수익 거래", `${r.profitTrades}회`, "수익으로 마감된 거래 횟수"],
                    ["손실 거래", `${r.lossTrades}회`, "손실로 마감된 거래 횟수"],
                    ["평균 수익", `+${r.avgWin}%`, "수익 거래의 평균 수익률"],
                    ["평균 손실", `${r.avgLoss}%`, "손실 거래의 평균 손실률"],
                    ["최대 연속 수익", `${r.maxConsecutiveWins}회`, "연속으로 수익을 낸 최대 거래 횟수"],
                    ["최대 연속 손실", `${r.maxConsecutiveLosses}회`, "연속으로 손실을 낸 최대 횟수. 심리적 압박 지표"],
                  ].map(([label, value, desc]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {label}
                        <span className="relative group/tip">
                          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary cursor-help transition-colors" />
                          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tip:block w-52 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg z-50 bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-800 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-zinc-800 dark:before:border-r-zinc-100">
                            {desc}
                          </span>
                        </span>
                      </span>
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
