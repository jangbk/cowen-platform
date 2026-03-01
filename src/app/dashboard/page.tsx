"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, RefreshCw, Play, ChevronRight, Lightbulb } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import SparklineChart from "@/components/ui/SparklineChart";
import {
  formatCurrency,
  formatPercent,
  formatCompactNumber,
} from "@/lib/formatters";

// Dynamic import for Lightweight Charts (needs window object)
const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// ─── Types ───────────────────────────────────────────────────────
interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d: { price: number[] };
}

interface MarketCapData {
  data: Array<[number, number]>;
  trendline?: { slope: number; intercept: number; r2: number };
}

interface DominanceData {
  withStables: { data: Array<[number, number]>; current: number };
  withoutStables: { data: Array<[number, number]>; current: number };
}

interface MacroData {
  data: Array<{ date: string; value: string }>;
  label: string;
  unit: string;
}

interface RiskData {
  risks: Record<string, { risk: number; label: string }>;
}

interface RecessionRiskData {
  risk: number;
  components: Array<{ label: string; value: number; color: string }>;
}

interface FearGreedData {
  value: number;
  classification: string;
}

interface CalendarEvent {
  name: string;
  date: string;
  prev: string;
  forecast: string;
  importance: "high" | "medium" | "low";
}

interface LatestVideoData {
  videoId: string;
  title: string;
  thumbnail: string;
  author: string;
  published: string;
  link: string;
}

// ─── Skeleton ────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="h-48 rounded bg-muted/50 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      차트 로딩 중...
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Insight Box ─────────────────────────────────────────────────
function InsightBox({ text, type = "neutral" }: { text: string; type?: "bullish" | "bearish" | "neutral" | "caution" }) {
  const colors = {
    bullish: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    bearish: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400",
    caution: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    neutral: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
  };
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed ${colors[type]}`}>
      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function getMcapInsight(tab: string, value: number): { text: string; type: "bullish" | "bearish" | "caution" | "neutral" } {
  const t = value / 1e12;
  const label = tab === "total" ? "전체 크립토" : tab.toUpperCase();
  if (tab === "total") {
    if (t >= 3) return { text: `${label} 시총 $${t.toFixed(1)}T - 시장이 과열 구간에 진입할 수 있습니다. 신규 진입 시 분할 매수를 고려하세요.`, type: "caution" };
    if (t >= 2) return { text: `${label} 시총 $${t.toFixed(1)}T - 상승 추세이나 아직 과열은 아닙니다. 장기 관점에서 긍정적입니다.`, type: "bullish" };
    if (t >= 1) return { text: `${label} 시총 $${t.toFixed(1)}T - 회복 구간입니다. 역사적으로 이 수준은 축적의 기회입니다.`, type: "bullish" };
    return { text: `${label} 시총 $${t.toFixed(2)}T - 약세장 구간입니다. DCA 전략으로 장기 포지션을 구축할 좋은 시기입니다.`, type: "neutral" };
  }
  if (tab === "btc") {
    if (t >= 2) return { text: `BTC 시총 $${t.toFixed(1)}T - 비트코인이 새로운 가치 영역을 탐색 중입니다. 변동성에 주의하세요.`, type: "caution" };
    if (t >= 1) return { text: `BTC 시총 $${t.toFixed(1)}T - 건강한 성장 구간입니다. 기관 자금 유입이 시장을 지지합니다.`, type: "bullish" };
    return { text: `BTC 시총 $${t.toFixed(2)}T - 저평가 구간입니다. 역사적으로 장기 투자자에게 유리한 진입점입니다.`, type: "bullish" };
  }
  const b = value / 1e9;
  if (b >= 500) return { text: `ETH 시총 $${b.toFixed(0)}B - 이더리움 생태계가 강세입니다. DeFi/NFT 활성도를 함께 모니터링하세요.`, type: "bullish" };
  if (b >= 200) return { text: `ETH 시총 $${b.toFixed(0)}B - 안정적 성장 구간입니다. ETH/BTC 비율 추이도 확인하세요.`, type: "neutral" };
  return { text: `ETH 시총 $${b.toFixed(0)}B - 저평가 구간입니다. 스마트 컨트랙트 플랫폼 중 가장 큰 생태계를 보유하고 있습니다.`, type: "bullish" };
}

function getDomInsight(tab: string, withStables: number): { text: string; type: "bullish" | "bearish" | "caution" | "neutral" } {
  if (tab === "btc") {
    if (withStables >= 60) return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - 비트코인 독주 구간입니다. 알트코인 투자 비중을 줄이고 BTC 위주로 포지션을 유지하세요.`, type: "caution" };
    if (withStables >= 50) return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - BTC가 시장을 주도합니다. 알트 시즌은 아직이며, 비트코인 중심 전략이 유리합니다.`, type: "neutral" };
    if (withStables >= 40) return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - 알트코인으로 자금이 분산되고 있습니다. 알트 시즌의 초기 징후일 수 있습니다.`, type: "bullish" };
    return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - 알트 시즌입니다! 알트코인이 BTC 대비 아웃퍼폼 중이지만, 과열 주의가 필요합니다.`, type: "caution" };
  }
  if (withStables >= 20) return { text: `ETH 도미넌스 ${withStables.toFixed(1)}% - 이더리움이 강세를 보이며, L2 생태계 성장이 뒷받침되고 있습니다.`, type: "bullish" };
  if (withStables >= 15) return { text: `ETH 도미넌스 ${withStables.toFixed(1)}% - 정상 수준입니다. 이더리움의 시장 점유율이 안정적입니다.`, type: "neutral" };
  return { text: `ETH 도미넌스 ${withStables.toFixed(1)}% - 이더리움 도미넌스가 낮습니다. L1 경쟁 심화 또는 BTC 독주 구간을 의미할 수 있습니다.`, type: "bearish" };
}

function getRiskInsight(tab: string, value: number): { text: string; type: "bullish" | "bearish" | "caution" | "neutral" } {
  if (value >= 0.7) return { text: `${tab} 리스크 ${value.toFixed(3)} - 극도의 과열 구간입니다. 이익 실현 및 비중 축소를 강력히 고려하세요. 역사적으로 이 수준에서 대폭락이 발생했습니다.`, type: "bearish" };
  if (value >= 0.5) return { text: `${tab} 리스크 ${value.toFixed(3)} - 과열 경고 구간입니다. 출구 전략을 준비하고, 단계적 이익 실현을 시작하는 것이 현명합니다.`, type: "caution" };
  if (value >= 0.3) return { text: `${tab} 리스크 ${value.toFixed(3)} - 중립 구간입니다. 시장이 적정 가치 부근에 있으며, 장기 보유 전략을 유지하세요.`, type: "neutral" };
  if (value >= 0.15) return { text: `${tab} 리스크 ${value.toFixed(3)} - 저평가 구간입니다. DCA로 포지션을 확대하기 좋은 시기입니다. 장기적으로 높은 수익률이 기대됩니다.`, type: "bullish" };
  return { text: `${tab} 리스크 ${value.toFixed(3)} - 극도의 저평가 구간입니다! 역사적으로 최고의 매수 기회입니다. 적극적인 축적을 고려하세요.`, type: "bullish" };
}

function getCryptoRiskInsight(value: number): { text: string; type: "bullish" | "bearish" | "caution" | "neutral" } {
  if (value >= 0.7) return { text: `크립토 리스크 ${value.toFixed(3)} - 극도의 과열! 가격·모멘텀·변동성 모두 고위험입니다. 단계적 이익 실현을 고려하세요.`, type: "bearish" };
  if (value >= 0.5) return { text: `크립토 리스크 ${value.toFixed(3)} - 과열 경고 구간입니다. 출구 전략을 미리 준비하는 것이 현명합니다.`, type: "caution" };
  if (value >= 0.3) return { text: `크립토 리스크 ${value.toFixed(3)} - 중립 구간입니다. 장기 보유 전략을 유지하되 추가 매수는 신중하게 접근하세요.`, type: "neutral" };
  if (value >= 0.15) return { text: `크립토 리스크 ${value.toFixed(3)} - 저평가 구간입니다. DCA로 포지션을 확대하기 좋은 시기입니다.`, type: "bullish" };
  return { text: `크립토 리스크 ${value.toFixed(3)} - 극도의 저평가! 역사적으로 최고의 축적 기회입니다. 적극적인 매수를 고려하세요.`, type: "bullish" };
}

function getRecessionInsight(value: number): { text: string; type: "bullish" | "bearish" | "caution" | "neutral" } {
  if (value >= 0.6) return { text: `경기침체 리스크 ${value.toFixed(3)} - 경기 침체 가능성이 높습니다. 방어적 포지션과 현금 비중 확대를 고려하세요.`, type: "bearish" };
  if (value >= 0.3) return { text: `경기침체 리스크 ${value.toFixed(3)} - 경기 둔화 신호가 감지됩니다. 포트폴리오 리밸런싱을 검토하세요.`, type: "caution" };
  if (value >= 0.1) return { text: `경기침체 리스크 ${value.toFixed(3)} - 안전한 수준입니다. 경제 지표가 안정적이며 리스크 자산에 우호적입니다.`, type: "bullish" };
  return { text: `경기침체 리스크 ${value.toFixed(3)} - 매우 안전합니다. 경기 확장 국면으로 리스크 자산 투자에 최적의 환경입니다.`, type: "bullish" };
}

function getMacroInsight(tab: string, value: number): { text: string; type: "bullish" | "bearish" | "caution" | "neutral" } {
  if (tab === "unemployment") {
    if (value >= 6) return { text: `실업률 ${value}% - 노동시장이 크게 악화되었습니다. 연준의 적극적 금리 인하가 예상되며, 이는 리스크 자산에 유동성을 공급할 수 있습니다.`, type: "caution" };
    if (value >= 4.5) return { text: `실업률 ${value}% - 노동시장이 둔화되고 있습니다. 연준의 금리 인하 가능성이 높아지며, 크립토에 중기적으로 긍정적입니다.`, type: "neutral" };
    if (value >= 3.5) return { text: `실업률 ${value}% - 노동시장이 견고합니다. 연착륙 시나리오를 지지하며, 리스크 자산에 우호적인 환경입니다.`, type: "bullish" };
    return { text: `실업률 ${value}% - 노동시장이 과열 상태입니다. 연준이 매파적 스탠스를 유지할 수 있어 단기적으로 리스크 자산에 부담입니다.`, type: "caution" };
  }
  if (tab === "inflation") {
    if (value >= 5) return { text: `인플레이션 ${value}% - 물가 상승이 심각합니다. 연준의 긴축이 예상되며, 단기적으로 크립토를 포함한 리스크 자산에 부정적입니다.`, type: "bearish" };
    if (value >= 3) return { text: `인플레이션 ${value}% - 물가가 목표(2%)를 상회합니다. 금리 인하가 지연될 수 있으며, 시장 불확실성이 높습니다.`, type: "caution" };
    if (value >= 2) return { text: `인플레이션 ${value}% - 물가가 목표 부근에서 안정적입니다. 연준이 완화적 정책으로 전환할 여지가 있어 리스크 자산에 긍정적입니다.`, type: "bullish" };
    return { text: `인플레이션 ${value}% - 디스인플레이션 또는 디플레이션 우려가 있습니다. 경기 둔화 신호이며, 연준의 대규모 부양이 예상됩니다.`, type: "neutral" };
  }
  if (tab === "rgdp") {
    if (value >= 3) return { text: `실질 GDP 성장률 ${value}% - 경제가 강하게 성장하고 있습니다. 리스크 자산에 긍정적이지만, 과열 위험도 모니터링하세요.`, type: "bullish" };
    if (value >= 1) return { text: `실질 GDP 성장률 ${value}% - 경제가 안정적으로 성장 중입니다. 골디락스 환경으로 크립토에 우호적입니다.`, type: "bullish" };
    if (value >= 0) return { text: `실질 GDP 성장률 ${value}% - 경제가 정체되고 있습니다. 경기 침체 가능성을 주시하며, 방어적 포지션을 고려하세요.`, type: "caution" };
    return { text: `실질 GDP 성장률 ${value}% - 경기 침체 구간입니다. 연준의 대규모 완화 정책이 예상되며, 장기적으로 크립토에 긍정적일 수 있습니다.`, type: "bearish" };
  }
  if (value >= 5) return { text: `기준금리 ${value}% - 긴축 정점입니다. 금리 인하 전환이 가까울 수 있으며, 전환 시 크립토 시장의 강한 반등이 기대됩니다.`, type: "neutral" };
  if (value >= 3) return { text: `기준금리 ${value}% - 제약적 수준입니다. 고금리 환경이 리스크 자산에 부담이지만, 인하 기대감이 시장을 지지할 수 있습니다.`, type: "caution" };
  if (value >= 1) return { text: `기준금리 ${value}% - 중립적 수준입니다. 유동성이 풍부하지는 않지만, 리스크 자산이 성장할 수 있는 환경입니다.`, type: "neutral" };
  return { text: `기준금리 ${value}% - 초저금리/양적완화 구간입니다. 유동성이 크립토 시장으로 유입되기 좋은 환경이며, 강세장의 토대가 됩니다.`, type: "bullish" };
}

// ─── Main Dashboard ──────────────────────────────────────────────
export default function DashboardPage() {
  // ─── State ──────────────────────────────────────────────────────
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const [mcapTab, setMcapTab] = useState<"total" | "btc" | "eth">("total");
  const [mcapData, setMcapData] = useState<MarketCapData | null>(null);
  const [mcapLoading, setMcapLoading] = useState(true);

  const [domTab, setDomTab] = useState<"btc" | "eth">("btc");
  const [domData, setDomData] = useState<DominanceData | null>(null);
  const [domLoading, setDomLoading] = useState(true);

  const [riskTab, setRiskTab] = useState("BTC");
  const [macroTab, setMacroTab] = useState("unemployment");
  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [macroLoading, setMacroLoading] = useState(true);

  // NEW: Live data states
  const [cryptoRiskData, setCryptoRiskData] = useState<RiskData | null>(null);
  const [recessionRisk, setRecessionRisk] = useState<RecessionRiskData | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [latestVideo, setLatestVideo] = useState<LatestVideoData | null>(null);

  // ─── Fetch all independent data on mount ──────────────────────
  useEffect(() => {
    async function fetchAll() {
      const results = await Promise.allSettled([
        fetch("/api/crypto/prices").then((r) => r.json()),
        fetch("/api/crypto/risk").then((r) => r.json()),
        fetch("/api/macro/recession-risk").then((r) => r.json()),
        fetch("/api/crypto/fear-greed").then((r) => r.json()),
        fetch("/api/macro/calendar").then((r) => r.json()),
        fetch("/api/youtube/latest").then((r) => r.json()),
      ]);
      if (results[0].status === "fulfilled") setAssets(results[0].value.data || []);
      if (results[1].status === "fulfilled") setCryptoRiskData(results[1].value);
      if (results[2].status === "fulfilled") setRecessionRisk(results[2].value);
      if (results[3].status === "fulfilled") setFearGreed(results[3].value);
      if (results[4].status === "fulfilled") setCalendarEvents(results[4].value.events || []);
      if (results[5].status === "fulfilled") setLatestVideo(results[5].value);
      setAssetsLoading(false);
    }
    fetchAll();
  }, []);

  // ─── Fetch market cap (tab-dependent) ─────────────────────────
  useEffect(() => {
    async function fetchMcap() {
      setMcapLoading(true);
      try {
        const res = await fetch(`/api/crypto/market-cap?type=${mcapTab}`);
        setMcapData(await res.json());
      } catch { /* ignore */ }
      finally { setMcapLoading(false); }
    }
    fetchMcap();
  }, [mcapTab]);

  // ─── Fetch dominance (tab-dependent) ──────────────────────────
  useEffect(() => {
    async function fetchDom() {
      setDomLoading(true);
      try {
        const res = await fetch(`/api/crypto/dominance?type=${domTab}`);
        setDomData(await res.json());
      } catch { /* ignore */ }
      finally { setDomLoading(false); }
    }
    fetchDom();
  }, [domTab]);

  // ─── Fetch macro data (tab-dependent) ─────────────────────────
  useEffect(() => {
    async function fetchMacro() {
      setMacroLoading(true);
      try {
        const res = await fetch(`/api/macro/indicators?indicator=${macroTab}`);
        setMacroData(await res.json());
      } catch { /* ignore */ }
      finally { setMacroLoading(false); }
    }
    fetchMacro();
  }, [macroTab]);

  // ─── Transform data for charts ────────────────────────────────
  const mcapChartData = useMemo(() => {
    if (!mcapData?.data) return [];
    return mcapData.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [mcapData]);

  const domChartData = useMemo(() => {
    if (!domData?.withStables?.data) return [];
    return domData.withStables.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [domData]);

  const macroChartData = useMemo(() => {
    if (!macroData?.data) return [];
    return macroData.data.map((d) => ({
      time: d.date,
      value: parseFloat(d.value),
    }));
  }, [macroData]);

  // Latest market cap value
  const latestMcap = mcapData?.data?.length
    ? mcapData.data[mcapData.data.length - 1][1]
    : 0;

  // Risk values from API (with fallback)
  const riskValues: Record<string, number> = useMemo(() => {
    if (cryptoRiskData?.risks) {
      const result: Record<string, number> = {};
      for (const [key, val] of Object.entries(cryptoRiskData.risks)) {
        result[key] = val.risk;
      }
      return result;
    }
    return { TOTAL: 0.35, BTC: 0.4, ETH: 0.38, BNB: 0.3, SOL: 0.33, XRP: 0.35, ADA: 0.3, DOGE: 0.35, LINK: 0.33 };
  }, [cryptoRiskData]);

  // Crypto risk summary (average of all)
  const cryptoRiskSummary = useMemo(() => {
    if (!cryptoRiskData?.risks) return 0.35;
    const vals = Object.values(cryptoRiskData.risks).map((r) => r.risk);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [cryptoRiskData]);

  // Fear & Greed normalized to 0-1
  const fearGreedNormalized = fearGreed ? fearGreed.value / 100 : 0.35;
  const fearGreedLabel = fearGreed?.classification || "Loading...";

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ──── Main Content ──────────────────────────────────── */}
        <div className="space-y-6">
          {/* Favorite Assets Table */}
          <section className="rounded-lg border border-border bg-card p-3 sm:p-4" aria-label="주요 자산">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Favorite Assets</h2>
              <button
                onClick={() => {
                  setAssetsLoading(true);
                  fetch("/api/crypto/prices")
                    .then((r) => r.json())
                    .then((j) => setAssets(j.data || []))
                    .finally(() => setAssetsLoading(false));
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${assetsLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
            </div>
            {assetsLoading ? (
              <TableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4 text-right">Price</th>
                      <th className="pb-3 pr-4 text-right">24h %</th>
                      <th className="pb-3 pr-4 text-right">7d %</th>
                      <th className="pb-3 pr-4 text-right">Market Cap</th>
                      <th className="pb-3 text-right">Last 7 Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.slice(0, 20).map((asset, i) => (
                      <tr
                        key={asset.id}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {asset.image ? (
                              <Image
                                src={asset.image}
                                alt={asset.symbol}
                                width={24}
                                height={24}
                                className="h-6 w-6 rounded-full"
                                unoptimized
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-primary/20" />
                            )}
                            <span className="font-medium">{asset.name}</span>
                            <span className="text-xs text-muted-foreground uppercase">
                              {asset.symbol}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {formatCurrency(asset.current_price)}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-mono ${
                            asset.price_change_percentage_24h >= 0
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {formatPercent(asset.price_change_percentage_24h)}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-mono ${
                            (asset.price_change_percentage_7d_in_currency ?? 0) >= 0
                              ? "text-positive"
                              : "text-negative"
                          }`}
                        >
                          {formatPercent(
                            asset.price_change_percentage_7d_in_currency ?? 0
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {formatCurrency(asset.market_cap, 0)}
                        </td>
                        <td className="py-3 text-right">
                          {asset.sparkline_in_7d?.price ? (
                            <SparklineChart
                              data={asset.sparkline_in_7d.price}
                              width={80}
                              height={32}
                            />
                          ) : (
                            <div className="inline-block h-8 w-20 rounded bg-muted" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Risk Gauges */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Crypto Risk */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Crypto Risk Indicators</h3>
                <Link
                  href="/crypto/indicators"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-col items-center py-4">
                <GaugeChart
                  value={cryptoRiskSummary}
                  label="Crypto Risk Summary"
                  size="md"
                  subMetrics={[
                    { label: "BTC", value: cryptoRiskData?.risks?.BTC?.risk ?? 0.4, color: "#f97316" },
                    { label: "ETH", value: cryptoRiskData?.risks?.ETH?.risk ?? 0.35, color: "#10b981" },
                    { label: "SOL", value: cryptoRiskData?.risks?.SOL?.risk ?? 0.3, color: "#8b5cf6" },
                  ]}
                />
                <div className="mt-2 flex items-center justify-between w-full max-w-[14rem] text-[10px] text-muted-foreground">
                  <span className="text-emerald-500 font-medium">0 = 저평가 (매수 기회)</span>
                  <span className="text-red-500 font-medium">1 = 고평가 (과열)</span>
                </div>
              </div>
              {(() => {
                const insight = getCryptoRiskInsight(cryptoRiskSummary);
                return <InsightBox text={insight.text} type={insight.type} />;
              })()}
            </section>

            {/* Macro Recession Risk */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Macro Recession Risk</h3>
                <Link
                  href="/macro/indicators"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-col items-center py-4">
                <GaugeChart
                  value={recessionRisk?.risk ?? 0.071}
                  label="Recession Risk Summary"
                  size="md"
                  subMetrics={recessionRisk?.components ?? [
                    { label: "Employment", value: 0.071, color: "#3b82f6" },
                    { label: "Yield Curve", value: 0.12, color: "#ef4444" },
                    { label: "SAHM Rule", value: 0.045, color: "#f97316" },
                  ]}
                />
                <div className="mt-2 flex items-center justify-between w-full max-w-[14rem] text-[10px] text-muted-foreground">
                  <span className="text-emerald-500 font-medium">0 = 안전 (경기 확장)</span>
                  <span className="text-red-500 font-medium">1 = 위험 (경기 침체)</span>
                </div>
              </div>
              {(() => {
                const insight = getRecessionInsight(recessionRisk?.risk ?? 0.071);
                return <InsightBox text={insight.text} type={insight.type} />;
              })()}
            </section>
          </div>

          {/* Market Cap & Dominance Charts */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Market Cap */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {(["total", "btc", "eth"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMcapTab(tab)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        mcapTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab === "total" ? "Total" : tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                CMC: {formatCurrency(latestMcap, 0)}
                {mcapData?.trendline &&
                  ` - R²: ${mcapData.trendline.r2.toFixed(3)}`}
              </p>
              {mcapLoading ? (
                <ChartSkeleton />
              ) : (
                <>
                  <LightweightChartWrapper
                    data={mcapChartData}
                    type="area"
                    color="#2962FF"
                    height={200}
                    showGrid
                    logarithmic
                  />
                  {latestMcap > 0 && (() => {
                    const insight = getMcapInsight(mcapTab, latestMcap);
                    return <InsightBox text={insight.text} type={insight.type} />;
                  })()}
                </>
              )}
            </section>

            {/* Dominance */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {(["btc", "eth"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDomTab(tab)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        domTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab.toUpperCase()}.D
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {domData
                  ? `With Stables: ${domData.withStables.current.toFixed(2)}% · Without Stables: ${domData.withoutStables.current.toFixed(2)}%`
                  : "Loading..."}
              </p>
              {domLoading ? (
                <ChartSkeleton />
              ) : (
                <>
                  <LightweightChartWrapper
                    data={domChartData}
                    type="area"
                    color="#E040FB"
                    height={200}
                    showGrid
                  />
                  {domData && (() => {
                    const insight = getDomInsight(domTab, domData.withStables.current);
                    return <InsightBox text={insight.text} type={insight.type} />;
                  })()}
                </>
              )}
            </section>
          </div>

          {/* Risk per Asset & Macro Indicators */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Risk per Asset */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
                {Object.keys(riskValues).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRiskTab(tab)}
                    className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${
                      riskTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Current risk: {riskValues[riskTab]?.toFixed(3)}
              </p>
              <div className="flex flex-col items-center py-4">
                <GaugeChart
                  value={riskValues[riskTab] ?? 0.3}
                  label={`${riskTab} Fiat Risk`}
                  size="lg"
                />
              </div>
              {(() => {
                const insight = getRiskInsight(riskTab, riskValues[riskTab] ?? 0.3);
                return <InsightBox text={insight.text} type={insight.type} />;
              })()}
            </section>

            {/* Macro Indicators */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
                {[
                  { key: "unemployment", label: "실업률" },
                  { key: "inflation", label: "인플레이션" },
                  { key: "rgdp", label: "RGDP" },
                  { key: "fedfunds", label: "기준금리" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setMacroTab(tab.key)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                      macroTab === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {macroData
                  ? `Latest: ${macroData.data[macroData.data.length - 1]?.value}${macroData.unit} (${macroData.data[macroData.data.length - 1]?.date})`
                  : "Loading..."}
              </p>
              {macroLoading ? (
                <ChartSkeleton />
              ) : (
                <>
                  <LightweightChartWrapper
                    data={macroChartData}
                    type="line"
                    color={
                      macroTab === "unemployment"
                        ? "#ef4444"
                        : macroTab === "inflation"
                          ? "#f97316"
                          : macroTab === "fedfunds"
                            ? "#8b5cf6"
                            : "#10b981"
                    }
                    height={200}
                    showGrid
                  />
                  {macroData?.data?.length && (() => {
                    const latest = parseFloat(macroData.data[macroData.data.length - 1]?.value ?? "0");
                    const insight = getMacroInsight(macroTab, latest);
                    return <InsightBox text={insight.text} type={insight.type} />;
                  })()}
                </>
              )}
            </section>
          </div>
        </div>

        {/* ──── Right Sidebar ─────────────────────────────────── */}
        <aside className="space-y-6">
          {/* Latest Video */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Latest Video</h3>
            <Link href={latestVideo?.link || "/content/video-summaries"} className="block group" target={latestVideo?.link ? "_blank" : undefined}>
              <div className="relative aspect-video rounded-lg bg-slate-800 overflow-hidden">
                <Image
                  src={latestVideo?.thumbnail || "https://img.youtube.com/vi/eAzoXY1GfIo/mqdefault.jpg"}
                  alt={latestVideo?.title || "Latest video thumbnail"}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                {latestVideo?.title || "Loading..."}
              </p>
              <p className="text-xs text-muted-foreground">{latestVideo?.author || "JangBK"}</p>
            </Link>
          </section>

          {/* Macro Calendar */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">매크로 캘린더</h3>
              <Link
                href="/macro/calendar"
                className="text-xs text-primary hover:underline"
              >
                더보기
              </Link>
            </div>
            <div className="space-y-3">
              {calendarEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground animate-pulse">로딩 중...</div>
              ) : (
                calendarEvents.map((event, idx) => (
                  <div
                    key={`${event.name}-${idx}`}
                    className="border-b border-border/50 pb-2 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            event.importance === "high"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                          }`}
                        />
                        <span className="text-sm font-medium">{event.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {event.date}
                      </span>
                    </div>
                    <div className="mt-1 ml-3 text-xs text-muted-foreground">
                      이전: {event.prev}
                      {event.forecast && event.forecast !== "-" && ` · 예상: ${event.forecast}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Fear & Greed */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Fear & Greed Index</h3>
            <div className="flex flex-col items-center">
              <GaugeChart value={fearGreedNormalized} label={fearGreedLabel} size="sm" />
              {fearGreed && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Score: {fearGreed.value}/100
                </p>
              )}
            </div>
          </section>

          {/* Quick Links */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Quick Links</h3>
            <div className="space-y-1">
              {[
                { label: "Event Calendar", href: "/crypto/events" },
                { label: "Bot Performance", href: "/tools/bot-performance" },
                { label: "Backtest", href: "/tools/backtest" },
                { label: "Video Summaries", href: "/content/video-summaries" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
