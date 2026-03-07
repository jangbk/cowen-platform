"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Shield, AlertTriangle, Plus, Trash2, Info, ChevronDown, Loader2, RefreshCw, Lock, Unlock, ExternalLink } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RiskMetric {
  name: string;
  value: number;
  displayValue: string;
  weight: number;
  score: number; // 0-100
  signal: string;
  description: string;
  live?: boolean; // true if fetched from API
  refUrl?: string; // reference URL for manual lookup
  unit?: string; // display unit label (e.g. "Z", "%")
  unitHint?: string; // input hint (e.g. "외부 % ÷ 100")
}

interface PortfolioAsset {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  price: number;
  risk: number; // 0-1
}

// CoinGecko ID mapping for price fetch
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  BNB: "binancecoin",
  ADA: "cardano",
  DOGE: "dogecoin",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  DOT: "polkadot",
};

const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XRP: "XRP",
  BNB: "BNB", ADA: "Cardano", DOGE: "Dogecoin", LINK: "Chainlink",
  AVAX: "Avalanche", DOT: "Polkadot",
};

// Default weights based on common on-chain analysis standards:
// - Tier 1 (Valuation): MVRV, NUPL — most reliable cycle indicators
// - Tier 2 (Behavioral): Reserve Risk, SOPR — investor behavior signals
// - Tier 3 (Structural): Pi Cycle, Puell, 200W MA — market structure
// - Tier 4 (Flow): RHODL, Exchange Reserves — shorter-term flow data
const DEFAULT_METRICS: RiskMetric[] = [
  { name: "MVRV Z-Score", value: 2.14, displayValue: "2.14", weight: 20, score: 55, signal: "Neutral", description: "시장가치/실현가치 비율 — 사이클 고점/저점 판별의 핵심 지표", refUrl: "https://www.lookintobitcoin.com/charts/mvrv-zscore/", unit: "Z", unitHint: "Z-Score 그대로 입력 (예: 2.14)" },
  { name: "NUPL", value: 0.58, displayValue: "0.58", weight: 15, score: 60, signal: "Belief", description: "순 미실현 이익/손실 — 시장 심리 단계 판별", refUrl: "https://www.lookintobitcoin.com/charts/relative-unrealized-profit--loss/", unit: "0~1", unitHint: "외부사이트 % ÷ 100 (예: 14.79% → 0.1479)" },
  { name: "Reserve Risk", value: 0.003, displayValue: "0.003", weight: 12, score: 25, signal: "Low Risk", description: "장기보유자 확신도 대비 가격 수준", refUrl: "https://www.lookintobitcoin.com/charts/reserve-risk/", unit: "소수", unitHint: "소수점 그대로 입력 (예: 0.003)" },
  { name: "SOPR", value: 1.04, displayValue: "1.04", weight: 12, score: 35, signal: "In Profit", description: "지출 산출물 수익 비율 — 매도자 심리", refUrl: "https://www.coinglass.com/pro/i/sopr", unit: "비율", unitHint: "비율 그대로 입력, 1.0 기준 (예: 1.04)" },
  { name: "Pi Cycle Top", value: 0, displayValue: "No", weight: 10, score: 10, signal: "Not Triggered", description: "111DMA/350DMA 크로스 — 고점 예측 정확도 높음", unit: "Y/N" },
  { name: "Puell Multiple", value: 1.24, displayValue: "1.24", weight: 10, score: 50, signal: "Fair Value", description: "채굴수익 연평균 대비 — 채굴자 매도 압력", unit: "배수", unitHint: "배수 그대로 입력 (예: 1.24)" },
  { name: "200W MA Multiple", value: 2.58, displayValue: "2.58", weight: 8, score: 65, signal: "Elevated", description: "200주 이동평균 배수 — 장기 추세 위치", unit: "배수", unitHint: "배수 그대로 입력 (예: 2.58)" },
  { name: "RHODL Ratio", value: 4821, displayValue: "4,821", weight: 7, score: 55, signal: "Mid-Cycle", description: "Realized HODL 비율 — 신규 vs 장기 보유자 활동", refUrl: "https://www.lookintobitcoin.com/charts/rhodl-ratio/", unit: "정수", unitHint: "정수 그대로 입력 (예: 4821)" },
  { name: "Exchange Reserves", value: -2.4, displayValue: "-2.4%", weight: 6, score: 20, signal: "Outflow", description: "거래소 BTC 30일 변화 — 단기 매도 압력", refUrl: "https://www.coinglass.com/pro/i/exchange-balance", unit: "%", unitHint: "30일 변화율 % (예: -2.4)" },
];

const DEFAULT_PORTFOLIO: PortfolioAsset[] = [
  { id: "1", name: "Bitcoin", symbol: "BTC", quantity: 1.5, price: 0, risk: 0.5 },
  { id: "2", name: "Ethereum", symbol: "ETH", quantity: 15, price: 0, risk: 0.5 },
  { id: "3", name: "Solana", symbol: "SOL", quantity: 100, price: 0, risk: 0.5 },
];

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#06b6d4", "#f97316"];

function formatUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

// Simple donut chart
function PortfolioDonut({ assets }: { assets: PortfolioAsset[] }) {
  const total = assets.reduce((s, a) => s + a.quantity * a.price, 0);
  if (total === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-4">
        <div className="h-24 w-24 rounded-full border-4 border-dashed border-muted-foreground/20 flex items-center justify-center">
          <span className="text-2xl text-muted-foreground/30">$</span>
        </div>
        <p className="text-xs text-muted-foreground">가격 데이터 로딩 대기 중</p>
        <p className="text-[10px] text-muted-foreground/60">API 연결 후 자동 표시됩니다</p>
      </div>
    );

  const size = 180;
  const r = size / 2 - 12;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size}>
        {assets.map((a, i) => {
          const pct = (a.quantity * a.price) / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={a.id}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
        })}
        <circle cx={c} cy={c} r={r - 16} className="fill-background" />
        <text x={c} y={c - 4} textAnchor="middle" className="fill-foreground text-sm font-bold" fontSize="14">
          {formatUSD(total)}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          총 포트폴리오
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {assets.map((a, i) => {
          const pct = ((a.quantity * a.price) / total) * 100;
          return (
            <span key={a.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {a.symbol} ({pct.toFixed(1)}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------
const LS_KEY_METRICS = "weighted-risk-metrics";
const LS_KEY_PORTFOLIO = "weighted-risk-portfolio";

function loadSavedMetrics(): RiskMetric[] {
  if (typeof window === "undefined") return DEFAULT_METRICS;
  try {
    const raw = localStorage.getItem(LS_KEY_METRICS);
    if (!raw) return DEFAULT_METRICS;
    const saved: RiskMetric[] = JSON.parse(raw);
    // Merge with defaults to pick up any new metrics added in code
    return DEFAULT_METRICS.map((def) => {
      const s = saved.find((m) => m.name === def.name);
      return s ? { ...def, value: s.value, displayValue: s.displayValue, weight: s.weight, score: s.score, signal: s.signal } : def;
    });
  } catch { return DEFAULT_METRICS; }
}

function loadSavedPortfolio(): PortfolioAsset[] {
  if (typeof window === "undefined") return DEFAULT_PORTFOLIO;
  try {
    const raw = localStorage.getItem(LS_KEY_PORTFOLIO);
    if (!raw) return DEFAULT_PORTFOLIO;
    return JSON.parse(raw);
  } catch { return DEFAULT_PORTFOLIO; }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WeightedRiskPage() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [initialized, setInitialized] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [unlockedRisks, setUnlockedRisks] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Record<string, { geckoId: string; name: string }>>(
    // Pre-populate with hardcoded mappings
    Object.fromEntries(
      Object.entries(COINGECKO_IDS).map(([sym, id]) => [sym, { geckoId: id, name: ASSET_NAMES[sym] || sym }])
    )
  );
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Search CoinGecko for an unknown symbol and cache the result
  const resolveSymbol = useCallback((symbol: string, assetId: string) => {
    const upper = symbol.toUpperCase();
    if (resolvedIds[upper] || upper.length < 2) return;

    // Debounce: wait 600ms after last keystroke
    if (searchTimers.current[assetId]) clearTimeout(searchTimers.current[assetId]);
    searchTimers.current[assetId] = setTimeout(async () => {
      setLoadingSymbols((prev) => new Set(prev).add(upper));
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(upper)}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await res.json();
        const coins: Array<{ id: string; symbol: string; name: string; market_cap_rank: number | null }> = data.coins || [];

        // Find best match: exact symbol match with highest market cap rank
        const exactMatches = coins.filter((c) => c.symbol.toUpperCase() === upper);
        const best = exactMatches.sort((a, b) => (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999))[0];

        if (best) {
          setResolvedIds((prev) => ({ ...prev, [upper]: { geckoId: best.id, name: best.name } }));

          // Auto-fill name
          setPortfolio((prev) =>
            prev.map((a) => (a.id === assetId && a.symbol.toUpperCase() === upper ? { ...a, name: best.name } : a))
          );

          // Fetch price
          fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${best.id}&vs_currencies=usd`, { signal: AbortSignal.timeout(6000) })
            .then((r) => r.json())
            .then((priceData) => {
              const price = priceData[best.id]?.usd;
              if (price) setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, price } : a)));
            })
            .catch(() => {});

          // Fetch risk
          fetch(`/api/crypto/risk?asset=${best.id}`, { signal: AbortSignal.timeout(6000) })
            .then((r) => r.json())
            .then((riskData) => {
              if (riskData.risk !== undefined) {
                setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, risk: riskData.risk } : a)));
              }
            })
            .catch(() => {});
        }
      } catch {
        // Search failed — leave as manual
      } finally {
        setLoadingSymbols((prev) => { const next = new Set(prev); next.delete(upper); return next; });
      }
    }, 600);
  }, [resolvedIds]);

  // Helper: convert raw indicator value to 0-100 risk score + signal
  const scoreFromMvrv = (v: number) => {
    if (v > 7) return { score: 95, signal: "Extreme Top" };
    if (v > 5) return { score: 80, signal: "Overvalued" };
    if (v > 3) return { score: 65, signal: "Elevated" };
    if (v > 1.5) return { score: 50, signal: "Neutral" };
    if (v > 0) return { score: 30, signal: "Fair Value" };
    return { score: 10, signal: "Undervalued" };
  };
  const scoreFromPuell = (v: number) => {
    if (v > 4) return { score: 90, signal: "Extreme" };
    if (v > 2) return { score: 70, signal: "High" };
    if (v > 1) return { score: 50, signal: "Fair Value" };
    if (v > 0.5) return { score: 30, signal: "Low" };
    return { score: 10, signal: "Very Low" };
  };
  const scoreFrom200wMa = (v: number) => {
    if (v > 5) return { score: 95, signal: "Extreme" };
    if (v > 3) return { score: 75, signal: "Overheated" };
    if (v > 2) return { score: 60, signal: "Elevated" };
    if (v > 1.2) return { score: 40, signal: "Normal" };
    if (v > 1) return { score: 25, signal: "Near MA" };
    return { score: 10, signal: "Below MA" };
  };

  // Fetch real risk & price data from API
  const fetchRiskData = useCallback(() => {
    setLoading(true);

    // Fetch portfolio risk scores, prices, AND on-chain indicators in parallel
    Promise.allSettled([
      fetch("/api/crypto/risk?asset=all").then((r) => r.json()),
      fetch("/api/crypto/onchain-indicators").then((r) => r.json()),
    ]).then(([riskRes, onchainRes]) => {
      // --- Portfolio risk & prices ---
      const risks: Record<string, number> = {};
      if (riskRes.status === "fulfilled" && riskRes.value?.risks) {
        for (const [symbol, info] of Object.entries(riskRes.value.risks)) {
          risks[symbol] = (info as { risk: number }).risk;
        }
        setDataSource(riskRes.value.source || "unknown");
      } else {
        setDataSource("fallback");
      }

      const symbols = portfolio.map((a) => a.symbol);
      const geckoIds = symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean);

      if (geckoIds.length > 0) {
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(",")}&vs_currencies=usd`)
          .then((r) => r.json())
          .then((priceData) => {
            setPortfolio((prev) =>
              prev.map((a) => {
                const geckoId = COINGECKO_IDS[a.symbol];
                const price = geckoId && priceData[geckoId]?.usd;
                const risk = risks[a.symbol];
                return { ...a, ...(price ? { price } : {}), ...(risk !== undefined ? { risk } : {}) };
              })
            );
          })
          .catch(() => {
            setPortfolio((prev) =>
              prev.map((a) => { const risk = risks[a.symbol]; return risk !== undefined ? { ...a, risk } : a; })
            );
          });
      }

      // --- On-chain indicators update ---
      if (onchainRes.status === "fulfilled") {
        const oc = onchainRes.value;
        setMetrics((prev) => prev.map((m) => {
          // MVRV Z-Score (CoinMetrics)
          if (m.name === "MVRV Z-Score" && oc.mvrv != null) {
            const v = parseFloat(oc.mvrv);
            const { score, signal } = scoreFromMvrv(v);
            return { ...m, value: v, displayValue: v.toFixed(2), score, signal, live: true };
          }
          // Puell Multiple (Blockchain.com)
          if (m.name === "Puell Multiple" && oc.puellMultiple != null) {
            const v = parseFloat(oc.puellMultiple);
            const { score, signal } = scoreFromPuell(v);
            return { ...m, value: v, displayValue: v.toFixed(2), score, signal, live: true };
          }
          // 200W MA Multiple (CoinGecko)
          if (m.name === "200W MA Multiple" && oc.ma200wMultiple != null) {
            const v = parseFloat(oc.ma200wMultiple);
            const { score, signal } = scoreFrom200wMa(v);
            return { ...m, value: v, displayValue: v.toFixed(2), score, signal, live: true };
          }
          // Pi Cycle Top (CoinGecko)
          if (m.name === "Pi Cycle Top" && oc.piCycleTriggered !== undefined) {
            const triggered = oc.piCycleTriggered as boolean;
            const gap = oc.piCycleGap != null ? parseFloat(oc.piCycleGap as string) : null;
            return {
              ...m,
              value: triggered ? 1 : 0,
              displayValue: triggered ? "Yes!" : gap != null ? `No (${gap.toFixed(1)}% gap)` : "No",
              score: triggered ? 95 : 10,
              signal: triggered ? "TRIGGERED" : "Not Triggered",
              live: true,
            };
          }
          return m;
        }));
      }

      setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
      setLoading(false);
    });
  }, []);

  // Load from localStorage on mount, then fetch live data
  useEffect(() => {
    const savedMetrics = loadSavedMetrics();
    const savedPortfolio = loadSavedPortfolio();
    setMetrics(savedMetrics);
    setPortfolio(savedPortfolio);
    setInitialized(true);
    fetchRiskData();
  }, [fetchRiskData]);

  // Save to localStorage whenever metrics or portfolio change (after initial load)
  useEffect(() => {
    if (!initialized) return;
    try { localStorage.setItem(LS_KEY_METRICS, JSON.stringify(metrics)); } catch {}
  }, [metrics, initialized]);

  useEffect(() => {
    if (!initialized) return;
    try { localStorage.setItem(LS_KEY_PORTFOLIO, JSON.stringify(portfolio)); } catch {}
  }, [portfolio, initialized]);

  // Composite score
  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  const compositeScore = totalWeight > 0
    ? metrics.reduce((s, m) => s + (m.score * m.weight) / totalWeight, 0)
    : 0;

  // Weighted portfolio risk
  const portfolioValue = portfolio.reduce((s, a) => s + a.quantity * a.price, 0);
  const weightedRisk = portfolioValue > 0
    ? portfolio.reduce((s, a) => s + a.risk * ((a.quantity * a.price) / portfolioValue), 0)
    : 0;

  const riskLevel = compositeScore > 75 ? "High Risk" : compositeScore > 50 ? "Elevated" : compositeScore > 25 ? "Moderate" : "Low Risk";

  // Auto-score calculators for manually editable metrics
  const autoScore = (name: string, val: number): { score: number; signal: string } => {
    switch (name) {
      case "NUPL":
        if (val >= 0.75) return { score: 90, signal: "Euphoria" };
        if (val >= 0.5) return { score: 60, signal: "Belief" };
        if (val >= 0.25) return { score: 40, signal: "Optimism" };
        if (val >= 0) return { score: 20, signal: "Hope" };
        return { score: 5, signal: "Capitulation" };
      case "Reserve Risk":
        if (val >= 0.02) return { score: 90, signal: "Very High" };
        if (val >= 0.008) return { score: 65, signal: "Elevated" };
        if (val >= 0.003) return { score: 35, signal: "Normal" };
        if (val >= 0.001) return { score: 15, signal: "Low Risk" };
        return { score: 5, signal: "Very Low" };
      case "SOPR":
        if (val >= 1.15) return { score: 85, signal: "High Profit" };
        if (val >= 1.05) return { score: 55, signal: "In Profit" };
        if (val >= 1.0) return { score: 35, signal: "Break Even" };
        if (val >= 0.95) return { score: 15, signal: "Loss Selling" };
        return { score: 5, signal: "Capitulation" };
      case "RHODL Ratio":
        if (val >= 50000) return { score: 90, signal: "Extreme" };
        if (val >= 10000) return { score: 70, signal: "Elevated" };
        if (val >= 3000) return { score: 50, signal: "Mid-Cycle" };
        if (val >= 500) return { score: 25, signal: "Low" };
        return { score: 10, signal: "Very Low" };
      case "Exchange Reserves":
        // Negative = outflow (bullish), positive = inflow (bearish)
        if (val >= 5) return { score: 85, signal: "Large Inflow" };
        if (val >= 1) return { score: 60, signal: "Inflow" };
        if (val >= -1) return { score: 40, signal: "Neutral" };
        if (val >= -5) return { score: 20, signal: "Outflow" };
        return { score: 5, signal: "Large Outflow" };
      default:
        return { score: 50, signal: "Unknown" };
    }
  };

  const updateMetricValue = (name: string, rawInput: string) => {
    const val = parseFloat(rawInput);
    if (isNaN(val)) return;
    const { score, signal } = autoScore(name, val);
    setMetrics((prev) =>
      prev.map((m) =>
        m.name === name
          ? { ...m, value: val, displayValue: rawInput, score, signal }
          : m
      )
    );
  };

  const updateMetricScore = (name: string, score: number) => {
    setMetrics((prev) =>
      prev.map((m) => (m.name === name ? { ...m, score } : m))
    );
  };

  // Composite analysis
  const analysisData = useMemo(() => {
    const lowRisk = metrics.filter((m) => m.score <= 25);
    const moderate = metrics.filter((m) => m.score > 25 && m.score <= 50);
    const elevated = metrics.filter((m) => m.score > 50 && m.score <= 75);
    const highRisk = metrics.filter((m) => m.score > 75);

    // Top 3 contributors by weighted score
    const sorted = [...metrics]
      .map((m) => ({ ...m, contribution: totalWeight > 0 ? (m.score * m.weight) / totalWeight : 0 }))
      .sort((a, b) => b.contribution - a.contribution);
    const topContributors = sorted.slice(0, 3);

    // Bullish / bearish signals
    const bullish = metrics.filter((m) => m.score <= 30);
    const bearish = metrics.filter((m) => m.score >= 60);

    let actionColor = "";
    if (compositeScore <= 25) actionColor = "text-green-500";
    else if (compositeScore <= 50) actionColor = "text-blue-500";
    else if (compositeScore <= 75) actionColor = "text-yellow-500";
    else actionColor = "text-red-500";

    // --- Metric lookups ---
    const m = (name: string) => metrics.find((x) => x.name === name);
    const mvrv = m("MVRV Z-Score");
    const reserve = m("Reserve Risk");
    const puell = m("Puell Multiple");
    const piCycle = m("Pi Cycle Top");
    const ma200w = m("200W MA Multiple");
    const rhodl = m("RHODL Ratio");
    const nupl = m("NUPL");
    const sopr = m("SOPR");
    const exReserves = m("Exchange Reserves");

    // --- Cycle position ---
    let cyclePhase = "";
    let cycleColor = "";
    if (compositeScore <= 20) { cyclePhase = "바닥/축적 구간"; cycleColor = "text-green-500"; }
    else if (compositeScore <= 40) { cyclePhase = "초기 상승 구간"; cycleColor = "text-blue-500"; }
    else if (compositeScore <= 55) { cyclePhase = "중기 상승 구간"; cycleColor = "text-blue-400"; }
    else if (compositeScore <= 70) { cyclePhase = "후기 상승 / 과열 초기"; cycleColor = "text-yellow-500"; }
    else if (compositeScore <= 85) { cyclePhase = "과열 / 고점 접근"; cycleColor = "text-orange-500"; }
    else { cyclePhase = "극단적 과열 / 고점"; cycleColor = "text-red-500"; }

    // --- Individual metric interpretations ---
    const metricInsights: Array<{ icon: string; title: string; text: string; sentiment: "bullish" | "neutral" | "bearish" }> = [];

    if (mvrv) {
      if (mvrv.score <= 25) metricInsights.push({ icon: "📗", title: "MVRV Z-Score: 저평가", text: `Z-Score ${mvrv.displayValue}로 실현가치 대비 시장가치가 낮습니다. 역사적 바닥권에서 나타나는 패턴으로, 장기 보유자에게 유리한 진입 구간입니다.`, sentiment: "bullish" });
      else if (mvrv.score <= 60) metricInsights.push({ icon: "📘", title: "MVRV Z-Score: 적정 가치", text: `Z-Score ${mvrv.displayValue}로 시장가치와 실현가치가 균형 잡힌 상태입니다. 극단적 과열이나 저평가 신호 없이 정상 범위 내에 있습니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "📕", title: "MVRV Z-Score: 고평가", text: `Z-Score ${mvrv.displayValue}로 시장가치가 실현가치를 크게 상회합니다. 미실현 이익이 높아 매도 압력이 증가할 수 있는 구간입니다.`, sentiment: "bearish" });
    }

    if (reserve) {
      if (reserve.score <= 30) metricInsights.push({ icon: "📗", title: "Reserve Risk: 장기 보유자 확신 높음", text: `Reserve Risk ${reserve.displayValue}로 장기 보유자들이 매도하지 않고 있습니다. 보유자 확신이 높을 때는 역사적으로 좋은 매수 기회였습니다.`, sentiment: "bullish" });
      else if (reserve.score <= 60) metricInsights.push({ icon: "📘", title: "Reserve Risk: 보통", text: `Reserve Risk가 중간 수준으로, 장기 보유자와 단기 트레이더 간 균형이 잡혀 있습니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "📕", title: "Reserve Risk: 경고", text: `Reserve Risk가 높아 장기 보유자들이 매도를 시작할 수 있는 구간입니다. 스마트 머니의 이익 실현 가능성에 주의하세요.`, sentiment: "bearish" });
    }

    if (nupl) {
      if (nupl.score <= 20) metricInsights.push({ icon: "📗", title: "NUPL: 항복/희망 구간", text: `NUPL ${nupl.displayValue}로 네트워크 전체가 손실 또는 미미한 이익 상태입니다. 역사적으로 가장 좋은 매수 기회 구간입니다.`, sentiment: "bullish" });
      else if (nupl.score <= 55) metricInsights.push({ icon: "📘", title: "NUPL: 낙관 구간", text: `NUPL ${nupl.displayValue}로 네트워크 참여자 대부분이 이익 상태이나 아직 탐욕 수준은 아닙니다.`, sentiment: "neutral" });
      else if (nupl.score <= 75) metricInsights.push({ icon: "📙", title: "NUPL: 확신/탐욕 구간", text: `NUPL ${nupl.displayValue}로 상당한 미실현 이익이 존재합니다. 이익 실현 매도 압력이 점차 증가하는 구간입니다.`, sentiment: "bearish" });
      else metricInsights.push({ icon: "📕", title: "NUPL: 유포리아", text: `NUPL이 극단적으로 높아 시장이 과도한 낙관에 빠져 있습니다. 역사적 고점 형성 패턴과 유사합니다.`, sentiment: "bearish" });
    }

    if (piCycle) {
      if (piCycle.score <= 15) metricInsights.push({ icon: "📗", title: "Pi Cycle Top: 미발동", text: "111일 MA와 350일 MA x2 크로스가 발생하지 않았습니다. 사이클 고점 신호가 아직 나타나지 않은 상태입니다.", sentiment: "bullish" });
      else metricInsights.push({ icon: "🚨", title: "Pi Cycle Top: 발동!", text: "Pi Cycle Top 지표가 발동되었습니다! 역사적으로 고점을 3일 이내 정확도로 예측한 지표입니다. 최대한 방어적 포지션을 권장합니다.", sentiment: "bearish" });
    }

    if (exReserves) {
      if (exReserves.score <= 30) metricInsights.push({ icon: "📗", title: "거래소 유출: 매도 압력 감소", text: `거래소 BTC 보유량이 ${exReserves.displayValue} 변화했습니다. 유출 흐름은 투자자들이 장기 보유 목적으로 자산을 이동하고 있음을 시사합니다.`, sentiment: "bullish" });
      else if (exReserves.score <= 60) metricInsights.push({ icon: "📘", title: "거래소 보유량: 보통", text: `거래소 BTC 보유량 변화가 중립적입니다. 뚜렷한 유입/유출 추세가 없는 상태입니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "📕", title: "거래소 유입: 매도 압력 증가", text: `거래소 BTC 보유량이 증가 중입니다. 투자자들이 매도를 위해 거래소로 자산을 이동하고 있을 가능성이 있습니다.`, sentiment: "bearish" });
    }

    if (sopr) {
      if (sopr.score <= 30) metricInsights.push({ icon: "📗", title: "SOPR: 손실 매도 구간", text: `SOPR ${sopr.displayValue}로 이동 중인 코인 대부분이 손실 상태에서 매도되고 있습니다. 바닥 형성의 전형적인 패턴입니다.`, sentiment: "bullish" });
      else if (sopr.score <= 60) metricInsights.push({ icon: "📘", title: "SOPR: 소폭 이익 실현", text: `SOPR ${sopr.displayValue}로 적당한 수준의 이익 실현이 이루어지고 있습니다. 건전한 시장 구조를 나타냅니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "📕", title: "SOPR: 과도한 이익 실현", text: `SOPR이 높아 대규모 이익 실현이 진행 중입니다. 지속적인 매도 압력이 가격 하락을 초래할 수 있습니다.`, sentiment: "bearish" });
    }

    // --- Cross-indicator patterns ---
    const patterns: Array<{ label: string; desc: string; type: "positive" | "warning" | "danger" }> = [];

    // Smart money accumulation
    if (reserve && exReserves && reserve.score <= 30 && exReserves.score <= 30) {
      patterns.push({ label: "스마트 머니 축적", desc: "Reserve Risk 낮음 + 거래소 유출 → 장기 보유자 축적 진행 중. 역사적으로 강한 상승 전 패턴.", type: "positive" });
    }
    // Overheated but no Pi Cycle
    if (compositeScore > 60 && piCycle && piCycle.score <= 15) {
      patterns.push({ label: "과열이나 고점 아님", desc: "복합 점수가 높지만 Pi Cycle Top 미발동 → 상승 여력 잔존. 단, 리스크 관리 필요.", type: "warning" });
    }
    // MVRV + NUPL divergence
    if (mvrv && nupl && Math.abs(mvrv.score - nupl.score) > 30) {
      patterns.push({ label: "MVRV-NUPL 괴리", desc: `MVRV(${mvrv.score})와 NUPL(${nupl.score}) 점수가 크게 다릅니다. 시장 참여자 간 인식 차이가 존재하며, 변동성 확대 가능성.`, type: "warning" });
    }
    // Full danger mode
    if (bearish.length >= 5) {
      patterns.push({ label: "다중 경고 집중", desc: `${bearish.length}개 지표가 동시에 위험 신호 → 단일 지표보다 신뢰도 높은 고점 경고. 최대한 방어적 대응 권장.`, type: "danger" });
    }
    // Healthy bull
    if (mvrv && nupl && sopr && mvrv.score > 30 && mvrv.score < 65 && nupl.score > 30 && nupl.score < 65 && sopr.score > 25 && sopr.score < 55) {
      patterns.push({ label: "건전한 상승 추세", desc: "핵심 지표(MVRV, NUPL, SOPR)가 모두 중간 영역에 위치. 과열 없이 상승이 진행되는 건강한 시장 구조.", type: "positive" });
    }
    // Capitulation
    if (bullish.length >= 5) {
      patterns.push({ label: "항복 매도 징후", desc: `${bullish.length}개 지표가 동시에 저위험 → 극단적 공포 구간. 역사적으로 최고의 매수 기회를 형성하는 패턴.`, type: "positive" });
    }

    // --- Action strategy ---
    const strategies: Array<{ action: string; detail: string }> = [];
    if (compositeScore <= 25) {
      strategies.push({ action: "적극 매수 고려", detail: "포트폴리오 비중 확대, DCA 금액 증가" });
      strategies.push({ action: "장기 포지션 구축", detail: "3~5년 보유 관점의 핵심 자산 매수" });
      strategies.push({ action: "레버리지 주의", detail: "저점이라도 추가 하락 가능, 레버리지 최소화" });
    } else if (compositeScore <= 50) {
      strategies.push({ action: "기존 포지션 유지", detail: "추세에 순응하며 보유 지속" });
      strategies.push({ action: "선별적 추가 매수", detail: "급락 시 분할 매수, 신규 진입은 소량으로" });
      strategies.push({ action: "이익 실현 계획 수립", detail: "목표가 설정, Exit Strategy 페이지 참고" });
    } else if (compositeScore <= 75) {
      strategies.push({ action: "단계적 이익 실현", detail: `포트폴리오의 ${Math.round((compositeScore - 40) * 0.8)}~${Math.round((compositeScore - 30) * 0.8)}% 수준 매도 고려` });
      strategies.push({ action: "신규 매수 자제", detail: "FOMO 주의, 추격 매수 금지" });
      strategies.push({ action: "스탑로스 설정", detail: "주요 지지선 기준 손절 라인 재설정" });
    } else {
      strategies.push({ action: "적극적 이익 실현", detail: `포트폴리오의 ${Math.round((compositeScore - 30) * 0.8)}% 이상 매도 강력 권장` });
      strategies.push({ action: "스테이블코인 비중 확대", detail: "현금성 자산으로 전환하여 하락 대비" });
      strategies.push({ action: "하락 시나리오 준비", detail: "재진입 가격 미리 설정, 패닉셀 방지" });
    }

    return { lowRisk, moderate, elevated, highRisk, topContributors, bullish, bearish, actionColor, cyclePhase, cycleColor, metricInsights, patterns, strategies };
  }, [metrics, compositeScore, totalWeight]);

  const updateWeight = (name: string, weight: number) => {
    setMetrics(metrics.map((m) => (m.name === name ? { ...m, weight } : m)));
  };

  const addAsset = () => {
    const id = Date.now().toString();
    setPortfolio([...portfolio, { id, name: "New Asset", symbol: "???", quantity: 0, price: 0, risk: 0.5 }]);
  };

  const removeAsset = (id: string) => {
    setPortfolio(portfolio.filter((a) => a.id !== id));
  };

  // Fetch price & risk for a known geckoId
  const fetchAssetData = useCallback((assetId: string, geckoId: string) => {
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((data) => {
        const price = data[geckoId]?.usd;
        if (price) setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, price } : a)));
      })
      .catch(() => {});

    fetch(`/api/crypto/risk?asset=${geckoId}`, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((data) => {
        if (data.risk !== undefined) setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, risk: data.risk } : a)));
      })
      .catch(() => {});
  }, []);

  const updateAsset = (id: string, field: keyof PortfolioAsset, value: string | number) => {
    const symbol = field === "symbol" ? String(value).toUpperCase() : null;

    setPortfolio((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, [field]: value };
        // Auto-fill name if already resolved
        if (symbol && resolvedIds[symbol]) {
          updated.name = resolvedIds[symbol].name;
        }
        return updated;
      })
    );

    if (symbol && symbol.length >= 2) {
      const cached = resolvedIds[symbol];
      if (cached) {
        // Already known — fetch immediately
        fetchAssetData(id, cached.geckoId);
      } else {
        // Unknown — debounced CoinGecko search
        resolveSymbol(symbol, id);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Weighted Risk Assessment</h1>
        </div>
        <p className="text-muted-foreground">
          온체인/시장 지표 가중 리스크 점수 + 포트폴리오 가중 리스크 분석
        </p>
      </div>

      {/* Usage Guide */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            사용법 안내
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`}
          />
        </button>
        {showGuide && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                Weighted Risk Assessment란?
              </h4>
              <p>
                다양한 온체인/시장 리스크 지표에 <strong>개인화된 가중치</strong>를
                부여하여 복합 리스크 점수를 산출하고, 포트폴리오 각 자산의{" "}
                <strong>비중 가중 리스크</strong>를 실시간으로 분석하는 도구입니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                1. 시장 리스크 점수 (Market Risk Score)
              </h4>
              <p>
                9개 온체인/시장 지표의 가중 평균 점수입니다. 0~100 스케일로 표시되며,
                각 지표의 가중치를 직접 조절하여 <strong>개인 투자 방법론</strong>에
                맞게 커스터마이징할 수 있습니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                2. 포트폴리오 리스크 (Portfolio Risk)
              </h4>
              <p>
                각 자산의 개별 리스크 점수(0~1)를 포트폴리오 비중으로 가중 평균하여
                산출합니다. <strong>CoinGecko 실시간 가격</strong>과{" "}
                <strong>365일 히스토리컬 데이터</strong> 기반으로 자동 계산됩니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                3. 포트폴리오 자산 관리
              </h4>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>
                  <strong>자산 추가/삭제</strong>: 우측 상단 &quot;자산 추가&quot; 버튼으로
                  자산을 추가하고, 휴지통 아이콘으로 삭제합니다.
                </li>
                <li>
                  <strong>수량/가격 편집</strong>: 테이블에서 직접 수정 가능합니다.
                  가격은 API에서 자동 로드되지만 수동 변경도 가능합니다.
                </li>
                <li>
                  <strong>리스크 슬라이더</strong>: 자동 계산된 리스크 값을 수동으로
                  조정할 수 있습니다.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">
                4. 온체인 지표 가중치 조절
              </h4>
              <p>
                각 지표 행의 가중치 입력란에 원하는 값을 입력하세요. 총 가중치 합과
                무관하게 점수는 자동 정규화됩니다. 중요하다고 판단하는 지표에 더
                높은 가중치를 부여하세요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Data Status */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                dataSource === "coingecko" ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span>
              데이터 소스: {dataSource === "coingecko" ? "CoinGecko (실시간)" : dataSource === "sample" ? "샘플 데이터" : dataSource}
            </span>
            {lastUpdated && <span>| 업데이트: {lastUpdated}</span>}
          </div>
          <button
            onClick={fetchRiskData}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted text-xs"
          >
            <RefreshCw className="h-3 w-3" /> 새로고침
          </button>
        </div>
      )}

      {/* Top: Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Market Risk Score</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <GaugeChart
                value={compositeScore / 100}
                label="시장 리스크"
                displayValue={`${compositeScore.toFixed(1)} / 100`}
                size="lg"
              />
              <p className={`mt-2 text-sm font-semibold ${
                compositeScore > 75 ? "text-red-500" : compositeScore > 50 ? "text-yellow-500" : compositeScore > 25 ? "text-blue-500" : "text-green-500"
              }`}>
                {riskLevel} ({compositeScore.toFixed(0)}/100)
              </p>
            </>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Portfolio Risk</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GaugeChart
              value={weightedRisk}
              label="포트폴리오 가중 리스크"
              size="lg"
              subMetrics={portfolio.map((a, i) => ({
                label: a.symbol,
                value: a.risk,
                color: COLORS[i % COLORS.length],
              }))}
            />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Portfolio Allocation</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PortfolioDonut assets={portfolio} />
          )}
        </div>
      </div>

      {/* Portfolio Holdings */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">포트폴리오 자산</h2>
          <button
            onClick={addAsset}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> 자산 추가
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          심볼을 입력하면 CoinGecko에서 <strong>자동 검색</strong>하여 이름, 가격, 리스크(0~1)를 로드합니다.
          CoinGecko에 등록된 모든 암호화폐를 지원합니다.
          <span className="inline-flex items-center gap-1 ml-2"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />인식됨</span>
          <span className="inline-flex items-center gap-1 ml-1"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />검색 중</span>
          <span className="inline-flex items-center gap-1 ml-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />미인식</span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">자산</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">심볼</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">수량</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">가격</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">가치</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">리스크 (0-1) <span className="font-normal text-[10px]">자동</span></th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">비중</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((a, i) => {
                const val = a.quantity * a.price;
                const pct = portfolioValue > 0 ? (val / portfolioValue) * 100 : 0;
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={a.name}
                        onChange={(e) => updateAsset(a.id, "name", e.target.value)}
                        className="w-full bg-transparent text-sm font-medium focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={a.symbol}
                          onChange={(e) => updateAsset(a.id, "symbol", e.target.value)}
                          className="w-16 bg-transparent text-sm uppercase focus:outline-none"
                          placeholder="심볼"
                        />
                        {loadingSymbols.has(a.symbol.toUpperCase()) ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                        ) : resolvedIds[a.symbol.toUpperCase()] ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" title={`인식됨: ${resolvedIds[a.symbol.toUpperCase()].name}`} />
                        ) : a.symbol !== "???" && a.symbol.length >= 2 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" title="미인식 — 수동 입력 필요" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={a.quantity}
                        onChange={(e) => updateAsset(a.id, "quantity", parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        value={a.price}
                        onChange={(e) => updateAsset(a.id, "price", parseFloat(e.target.value) || 0)}
                        className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {formatUSD(val)}
                    </td>
                    <td className="px-3 py-2">
                      {unlockedRisks.has(a.id) ? (
                        <div className="flex items-center gap-1.5 justify-center">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round(a.risk * 100)}
                            onChange={(e) => updateAsset(a.id, "risk", parseInt(e.target.value) / 100)}
                            className="w-16 accent-primary"
                          />
                          <span className="text-xs font-mono w-8">{a.risk.toFixed(2)}</span>
                          <button
                            onClick={() => setUnlockedRisks((prev) => { const next = new Set(prev); next.delete(a.id); return next; })}
                            className="text-yellow-500 hover:text-yellow-400"
                            title="잠금 (자동 계산값 사용)"
                          >
                            <Unlock className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            a.risk > 0.65 ? "bg-red-500/10 text-red-500" :
                            a.risk > 0.4 ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-green-500/10 text-green-500"
                          }`}>
                            {a.risk.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-muted-foreground">자동</span>
                          <button
                            onClick={() => setUnlockedRisks((prev) => new Set(prev).add(a.id))}
                            className="text-muted-foreground hover:text-foreground"
                            title="잠금 해제 (수동 조정)"
                          >
                            <Lock className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-mono text-white"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeAsset(a.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">온체인/시장 리스크 지표 (가중치 조절 가능)</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                기본 가중치: Tier 1 밸류에이션(MVRV 20, NUPL 15) → Tier 2 투자심리(Reserve 12, SOPR 12) → Tier 3 구조(Pi 10, Puell 10, 200W 8) → Tier 4 자금흐름(RHODL 7, Exchange 6)
              </p>
            </div>
            <button
              onClick={() => {
                setMetrics(DEFAULT_METRICS);
                try { localStorage.removeItem(LS_KEY_METRICS); } catch {}
              }}
              className="shrink-0 ml-3 flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] hover:bg-muted whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3" /> 전체 리셋
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">지표</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">현재값</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">신호</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">리스크 점수</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">가중치</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">기여도</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.name} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">
                        {m.name}
                        {!m.live && m.refUrl && (
                          <a
                            href={m.refUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex ml-1 text-muted-foreground hover:text-primary transition-colors align-middle"
                            title={`${m.name} 실시간 확인`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">{m.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {m.live ? (
                      <span className="flex items-center justify-end gap-1.5">
                        {m.displayValue}
                        {m.unit && <span className="text-[9px] text-muted-foreground/60 font-sans">{m.unit}</span>}
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" title="실시간 데이터" />
                      </span>
                    ) : (
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="flex items-center gap-1">
                          <input
                            type="text"
                            value={m.displayValue}
                            onChange={(e) => updateMetricValue(m.name, e.target.value)}
                            className="w-16 rounded border border-dashed border-yellow-500/40 bg-yellow-500/5 px-1.5 py-0.5 text-right text-xs font-mono focus:outline-none focus:border-yellow-500"
                            title={m.unitHint || "직접 입력 가능 — 값 입력 시 리스크 점수 자동 재계산"}
                          />
                          {m.unit && <span className="text-[9px] text-yellow-500/70 font-sans w-6 text-left">{m.unit}</span>}
                          {!m.unit && <span className="text-[9px] text-yellow-500/70">수동</span>}
                        </span>
                        {m.unitHint && <span className="text-[8px] text-muted-foreground/50 font-sans">{m.unitHint}</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.score > 65 ? "bg-red-500/10 text-red-500" :
                      m.score > 40 ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-green-500/10 text-green-500"
                    }`}>
                      {m.signal}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="h-2 w-16 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.score > 65 ? "bg-red-500" : m.score > 40 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${m.score}%` }}
                        />
                      </div>
                      {m.live ? (
                        <span className="text-xs font-mono w-6">{m.score}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={m.score}
                          onChange={(e) => updateMetricScore(m.name, parseInt(e.target.value) || 0)}
                          className="w-10 rounded border border-dashed border-yellow-500/40 bg-yellow-500/5 px-1 py-0.5 text-center text-xs font-mono focus:outline-none focus:border-yellow-500"
                          title="리스크 점수 직접 조정"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={m.weight}
                      onChange={(e) => updateWeight(m.name, parseInt(e.target.value) || 0)}
                      className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-xs font-mono"
                    />
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {totalWeight > 0 ? ((m.score * m.weight) / totalWeight).toFixed(1) : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Composite Analysis */}
      {!loading && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-5">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            종합 분석 리포트
          </h2>

          {/* ① Cycle Position + Score Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">사이클 포지션</p>
              <p className={`text-lg font-bold ${analysisData.cycleColor}`}>{analysisData.cyclePhase}</p>
              <p className="text-xs text-muted-foreground mt-1">
                복합 리스크 점수 <strong className={analysisData.actionColor}>{compositeScore.toFixed(1)}/100</strong> 기반 판단
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">신호 분포</p>
              <div className="flex items-end gap-2 mt-1">
                <div className="flex-1">
                  <div className="flex h-5 rounded-full overflow-hidden">
                    {analysisData.lowRisk.length > 0 && <div className="bg-green-500" style={{ width: `${(analysisData.lowRisk.length / metrics.length) * 100}%` }} />}
                    {analysisData.moderate.length > 0 && <div className="bg-blue-500" style={{ width: `${(analysisData.moderate.length / metrics.length) * 100}%` }} />}
                    {analysisData.elevated.length > 0 && <div className="bg-yellow-500" style={{ width: `${(analysisData.elevated.length / metrics.length) * 100}%` }} />}
                    {analysisData.highRisk.length > 0 && <div className="bg-red-500" style={{ width: `${(analysisData.highRisk.length / metrics.length) * 100}%` }} />}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{analysisData.lowRisk.length} 저위험</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{analysisData.moderate.length} 보통</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />{analysisData.elevated.length} 주의</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{analysisData.highRisk.length} 위험</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ② Individual Metric Insights */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">개별 지표 분석</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {analysisData.metricInsights.map((insight) => (
                <div
                  key={insight.title}
                  className={`rounded-md border p-3 text-xs ${
                    insight.sentiment === "bullish" ? "border-green-500/20 bg-green-500/5" :
                    insight.sentiment === "bearish" ? "border-red-500/20 bg-red-500/5" :
                    "border-border bg-muted/30"
                  }`}
                >
                  <p className={`font-semibold mb-0.5 ${
                    insight.sentiment === "bullish" ? "text-green-600 dark:text-green-400" :
                    insight.sentiment === "bearish" ? "text-red-600 dark:text-red-400" :
                    "text-foreground"
                  }`}>
                    {insight.icon} {insight.title}
                  </p>
                  <p className="text-muted-foreground">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ③ Cross-Indicator Patterns */}
          {analysisData.patterns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">교차 분석 패턴</p>
              <div className="space-y-2">
                {analysisData.patterns.map((p) => (
                  <div
                    key={p.label}
                    className={`rounded-md border p-3 flex items-start gap-2.5 ${
                      p.type === "positive" ? "border-green-500/20 bg-green-500/5" :
                      p.type === "danger" ? "border-red-500/20 bg-red-500/5" :
                      "border-yellow-500/20 bg-yellow-500/5"
                    }`}
                  >
                    <span className={`text-sm mt-0.5 ${
                      p.type === "positive" ? "text-green-500" : p.type === "danger" ? "text-red-500" : "text-yellow-500"
                    }`}>
                      {p.type === "positive" ? "▲" : p.type === "danger" ? "▼" : "◆"}
                    </span>
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">{p.label}</p>
                      <p className="text-muted-foreground mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ④ Top Risk Contributors */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">리스크 기여도 TOP 3</p>
            <div className="space-y-1.5">
              {analysisData.topContributors.map((m, i) => (
                <div key={m.name} className="flex items-center gap-3 text-xs">
                  <span className="w-4 text-muted-foreground font-mono">{i + 1}.</span>
                  <span className="font-medium w-36">{m.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.score > 65 ? "bg-red-500" : m.score > 40 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                  <span className="font-mono text-muted-foreground w-16 text-right">
                    {m.contribution.toFixed(1)}점
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ⑤ Bullish vs Bearish Signals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1.5">
                긍정적 신호 ({analysisData.bullish.length}개)
              </p>
              {analysisData.bullish.length > 0 ? (
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  {analysisData.bullish.map((m) => (
                    <li key={m.name} className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      {m.name}: {m.signal}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">해당 없음</p>
              )}
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">
                경고 신호 ({analysisData.bearish.length}개)
              </p>
              {analysisData.bearish.length > 0 ? (
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  {analysisData.bearish.map((m) => (
                    <li key={m.name} className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      {m.name}: {m.signal}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">해당 없음</p>
              )}
            </div>
          </div>

          {/* ⑥ Action Strategy */}
          <div className="rounded-md border border-primary/20 bg-primary/[0.03] p-4">
            <p className="text-xs font-semibold text-foreground mb-2">대응 전략</p>
            <div className="space-y-2">
              {analysisData.strategies.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="font-mono text-primary font-bold mt-0.5">{i + 1}</span>
                  <div>
                    <span className="font-semibold text-foreground">{s.action}</span>
                    <span className="text-muted-foreground"> — {s.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk Criteria */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowCriteria(!showCriteria)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            리스크 점수 기준 및 지표 해석
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showCriteria ? "rotate-180" : ""}`}
          />
        </button>
        {showCriteria && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-4">
            {/* Risk Level Criteria */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">리스크 레벨 기준</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md border border-green-500/30 bg-green-500/5 p-2.5">
                  <p className="text-xs font-bold text-green-500">Low Risk (0~25)</p>
                  <p className="text-[10px] mt-1">시장이 저평가 구간에 있으며, 역사적으로 매수 기회가 될 수 있는 구간입니다.</p>
                </div>
                <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
                  <p className="text-xs font-bold text-blue-500">Moderate (25~50)</p>
                  <p className="text-[10px] mt-1">시장이 적정 가치 범위 내에 있으며, 정상적인 상승 추세 또는 횡보 구간입니다.</p>
                </div>
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5">
                  <p className="text-xs font-bold text-yellow-500">Elevated (50~75)</p>
                  <p className="text-[10px] mt-1">시장 과열 초기 징후가 나타나며, 리스크 관리와 포지션 축소를 고려해야 합니다.</p>
                </div>
                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2.5">
                  <p className="text-xs font-bold text-red-500">High Risk (75~100)</p>
                  <p className="text-[10px] mt-1">시장이 극도로 과열된 상태이며, 역사적으로 고점 형성 구간에 해당합니다.</p>
                </div>
              </div>
            </div>

            {/* Portfolio Risk Criteria */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">포트폴리오 리스크 (0~1) 산출 기준</h4>
              <p className="text-xs mb-2">
                각 자산의 리스크 점수는 CoinGecko 365일 가격 데이터를 기반으로 아래 3가지 요소를 가중 평균하여 자동 산출됩니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">요소</th>
                      <th className="px-3 py-2 text-center font-medium">비중</th>
                      <th className="px-3 py-2 text-left font-medium">설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 font-medium">Price Position</td>
                      <td className="px-3 py-2 text-center">45%</td>
                      <td className="px-3 py-2">365일 최저~최고 범위에서 현재 가격의 위치 (0=바닥, 1=꼭대기)</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 font-medium">Momentum</td>
                      <td className="px-3 py-2 text-center">35%</td>
                      <td className="px-3 py-2">200일 이동평균(SMA) 대비 현재 가격 비율로 과열/저평가 판단</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium">Volatility</td>
                      <td className="px-3 py-2 text-center">20%</td>
                      <td className="px-3 py-2">30일 연환산 변동성 (높을수록 리스크 높음)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* On-chain Metric Explanations */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">온체인 지표 상세 해석</h4>
              <div className="space-y-2 text-xs">
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>MVRV Z-Score</strong> — 시장가치(Market Cap)와 실현가치(Realized Cap)의 차이를 표준편차로 나눈 값. Z &gt; 7이면 고점, Z &lt; 0이면 바닥 신호.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Reserve Risk</strong> — 장기 보유자의 확신도 대비 현재 가격. 낮을수록 보유자 확신이 높아 매수 적기, 높으면 매도 적기.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Puell Multiple</strong> — 일일 채굴 수익을 365일 이동평균으로 나눈 값. 4 이상이면 과열, 0.5 이하면 저평가.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Pi Cycle Top</strong> — 111일 MA가 350일 MA x2를 상향 돌파하면 시장 고점 신호. 역사적으로 고점을 3일 이내 정확도로 예측.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>200W MA Multiple</strong> — 현재 가격을 200주 이동평균으로 나눈 배수. 5 이상이면 극도의 과열, 1 이하면 저평가.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>RHODL Ratio</strong> — 1주 보유자와 1~2년 보유자의 Realized Value 비율. 높으면 신규 투기 자금 유입 과열.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>NUPL</strong> — 네트워크 전체의 미실현 이익/손실. 0.75 이상이면 &quot;탐욕(Euphoria)&quot;, 0 이하면 &quot;항복(Capitulation)&quot;.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>SOPR</strong> — 이동한 코인의 매도 시점 가격 / 매수 시점 가격 비율. 1 이상이면 수익 실현 상태, 1 이하면 손실 매도.
                </div>
                <div className="rounded-md bg-muted/30 p-2.5">
                  <strong>Exchange Reserves</strong> — 거래소 보유 BTC 30일 변화율. 감소(유출)는 매도 압력 감소로 긍정적, 증가(유입)는 매도 압력.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weight customization note */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          가중치를 조절하여 개인 투자 방법론에 맞게 복합 점수를 커스터마이징하세요.
          현재 총 가중치: <strong>{totalWeight}%</strong>. 점수는 총 가중치와 무관하게 정규화됩니다.
        </p>
      </div>

      {/* Disclaimers */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li>
            <strong>온체인 지표(MVRV, NUPL, SOPR 등)는 현재 샘플 데이터</strong>입니다. Glassnode 등 온체인 API 연동 시 실시간 데이터로 대체됩니다.
          </li>
          <li>
            포트폴리오 자산의 <strong>가격과 리스크 점수</strong>는 CoinGecko API에서 실시간으로 가져옵니다 (1시간 캐시).
          </li>
          <li>
            리스크 점수는 <strong>과거 가격 데이터 기반 통계적 추정치</strong>이며, 미래 수익률이나 손실을 예측하지 않습니다.
          </li>
          <li>
            각 지표의 가중치는 <strong>개인의 투자 철학과 시장 해석</strong>에 따라 달라져야 합니다. 기본 가중치는 참고용입니다.
          </li>
          <li>
            암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험 자산이며, 본 도구는 <strong>교육 및 참고 목적</strong>입니다.
          </li>
          <li>
            본 도구는 투자 조언이 아닙니다. <strong>투자 결정은 본인 책임</strong>입니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
