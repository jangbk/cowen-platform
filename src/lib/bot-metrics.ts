/**
 * Bot performance metrics calculation utilities.
 * Shared across all bot API routes.
 */

export interface Trade {
  time: string;
  type: "buy" | "sell";
  price: number;
  qty: number;
  amount: number; // price * qty (KRW)
  fee?: number;
  pnl?: number; // realized P&L for sell trades
}

/**
 * Calculate total return percentage from a list of trades.
 * Pairs buy→sell trades and sums realized P&L.
 */
export function calcTotalReturn(
  trades: Trade[],
  initialCapital: number
): number {
  if (!trades.length || initialCapital <= 0) return 0;
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  return (totalPnL / initialCapital) * 100;
}

/**
 * Calculate Maximum Drawdown from an equity curve (array of portfolio values).
 */
export function calcMaxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;
  let peak = equityCurve[0];
  let maxDD = 0;
  for (const value of equityCurve) {
    if (value > peak) peak = value;
    const dd = ((value - peak) / peak) * 100;
    if (dd < maxDD) maxDD = dd;
  }
  return Math.round(maxDD * 100) / 100;
}

/**
 * Calculate annualized Sharpe Ratio from daily return percentages.
 * Risk-free rate default: 3.5% annual.
 */
export function calcSharpeRatio(
  dailyReturns: number[],
  riskFreeRate: number = 3.5
): number {
  if (dailyReturns.length < 2) return 0;
  const mean =
    dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) /
    (dailyReturns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  const dailyRf = riskFreeRate / 365;
  return Math.round(((mean - dailyRf) / std) * Math.sqrt(365) * 100) / 100;
}

/**
 * Calculate win rate and trade counts from sell trades that have pnl.
 */
export function calcWinRate(trades: Trade[]): {
  winRate: number;
  profitTrades: number;
  lossTrades: number;
  totalTrades: number;
} {
  const sellTrades = trades.filter(
    (t) => t.type === "sell" && t.pnl !== undefined
  );
  if (!sellTrades.length)
    return { winRate: 0, profitTrades: 0, lossTrades: 0, totalTrades: 0 };
  const profitTrades = sellTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const lossTrades = sellTrades.filter((t) => (t.pnl ?? 0) <= 0).length;
  return {
    winRate: Math.round((profitTrades / sellTrades.length) * 1000) / 10,
    profitTrades,
    lossTrades,
    totalTrades: sellTrades.length,
  };
}

/**
 * Calculate Profit Factor = gross profit / gross loss.
 */
export function calcProfitFactor(trades: Trade[]): number {
  const sellTrades = trades.filter(
    (t) => t.type === "sell" && t.pnl !== undefined
  );
  const grossProfit = sellTrades
    .filter((t) => (t.pnl ?? 0) > 0)
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(
    sellTrades
      .filter((t) => (t.pnl ?? 0) < 0)
      .reduce((s, t) => s + (t.pnl ?? 0), 0)
  );
  if (grossLoss === 0) return grossProfit > 0 ? 99.99 : 0;
  return Math.round((grossProfit / grossLoss) * 100) / 100;
}

/**
 * Calculate monthly returns (last 12 months) from trades.
 * Returns array of 12 numbers (percentage return per month).
 */
export function calcMonthlyReturns(
  trades: Trade[],
  initialCapital: number
): number[] {
  const now = new Date();
  const months: number[] = new Array(12).fill(0);

  for (const t of trades) {
    if (t.type !== "sell" || t.pnl === undefined) continue;
    const d = new Date(t.time);
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 +
      (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 12) {
      months[11 - monthsAgo] += t.pnl;
    }
  }

  // Convert absolute P&L to percentage of initial capital
  return months.map(
    (pnl) => Math.round((pnl / (initialCapital || 1)) * 1000) / 10
  );
}

/**
 * Calculate daily P&L (last 30 days) from trades.
 * Returns array of 30 numbers (percentage).
 */
export function calcDailyPnL(
  trades: Trade[],
  initialCapital: number
): number[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const days: number[] = new Array(30).fill(0);

  for (const t of trades) {
    if (t.type !== "sell" || t.pnl === undefined) continue;
    const d = new Date(t.time);
    const diffMs = now.getTime() - d.getTime();
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (daysAgo >= 0 && daysAgo < 30) {
      days[29 - daysAgo] += t.pnl;
    }
  }

  return days.map(
    (pnl) => Math.round((pnl / (initialCapital || 1)) * 1000) / 10
  );
}

/**
 * Build an equity curve from trades and initial capital.
 */
export function buildEquityCurve(
  trades: Trade[],
  initialCapital: number
): number[] {
  const sorted = [...trades]
    .filter((t) => t.type === "sell" && t.pnl !== undefined)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const curve = [initialCapital];
  let equity = initialCapital;
  for (const t of sorted) {
    equity += t.pnl ?? 0;
    curve.push(equity);
  }
  return curve;
}

/**
 * Calculate average win and average loss percentages.
 */
export function calcAvgWinLoss(trades: Trade[]): {
  avgWin: number;
  avgLoss: number;
} {
  const sells = trades.filter(
    (t) => t.type === "sell" && t.pnl !== undefined
  );
  const wins = sells.filter((t) => (t.pnl ?? 0) > 0);
  const losses = sells.filter((t) => (t.pnl ?? 0) < 0);

  // avg win/loss as percentage of trade amount
  const avgWin =
    wins.length > 0
      ? wins.reduce(
          (s, t) => s + ((t.pnl ?? 0) / (t.amount || 1)) * 100,
          0
        ) / wins.length
      : 0;

  const avgLoss =
    losses.length > 0
      ? losses.reduce(
          (s, t) => s + ((t.pnl ?? 0) / (t.amount || 1)) * 100,
          0
        ) / losses.length
      : 0;

  return {
    avgWin: Math.round(avgWin * 10) / 10,
    avgLoss: Math.round(avgLoss * 10) / 10,
  };
}
