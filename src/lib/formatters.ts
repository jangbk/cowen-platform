export function formatCurrency(value: number, decimals?: number): string {
  if (Math.abs(value) >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }

  const dec = decimals ?? (value < 1 ? 6 : value < 100 ? 4 : 2);
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}`;
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

export function formatRisk(value: number): string {
  return value.toFixed(3);
}

export function getRiskColor(value: number): string {
  if (value <= 0.2) return "bg-emerald-500";
  if (value <= 0.4) return "bg-green-400";
  if (value <= 0.5) return "bg-lime-400";
  if (value <= 0.6) return "bg-yellow-400";
  if (value <= 0.7) return "bg-amber-400";
  if (value <= 0.8) return "bg-orange-400";
  if (value <= 0.9) return "bg-red-400";
  return "bg-red-600";
}

export function getRiskTextColor(value: number): string {
  if (value <= 0.3) return "text-emerald-600 dark:text-emerald-400";
  if (value <= 0.5) return "text-lime-600 dark:text-lime-400";
  if (value <= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
