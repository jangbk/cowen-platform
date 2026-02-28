"use client";

import { useState, useMemo, useEffect } from "react";
import { Building, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Wifi, WifiOff, Coins, Globe, Lock, Pickaxe } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CompanyHolding {
  rank: number;
  company: string;
  ticker: string;
  held: number;
  value: number;
  pctSupply: number;
  type: string;
  country: string;
}

interface ETFHolding {
  name: string;
  ticker: string;
  held: number;
  aum: number;
  flows30d: number;
}

interface SupplyBreakdown {
  label: string;
  amount: number;
  description: string;
  color: string;
  icon: "coins" | "lock" | "globe" | "pickaxe" | "building";
}

// ---------------------------------------------------------------------------
// BTC Data — 세부 보유 현황
// ---------------------------------------------------------------------------

// BTC Supply Breakdown
const BTC_MAX_SUPPLY = 21_000_000;
const BTC_MINED = 19_816_000; // 2025 Q4 추정
const BTC_REMAINING = BTC_MAX_SUPPLY - BTC_MINED;

const BTC_SUPPLY_BREAKDOWN: SupplyBreakdown[] = [
  { label: "사토시 나카모토 추정 보유", amount: 1_100_000, description: "2009-2010년 초기 채굴분. 한 번도 이동된 적 없음. Patoshi 패턴 분석 기반 추정치.", color: "#F7931A", icon: "coins" },
  { label: "분실/접근불가 추정", amount: 3_700_000, description: "분실된 개인키, 사망한 보유자, 초기 채굴 후 방치된 코인 등. Chainalysis 추정.", color: "#6B7280", icon: "lock" },
  { label: "국가 보유 합계", amount: 515_689, description: "각국 정부가 압수/구매/보유 중인 BTC 합산", color: "#10B981", icon: "globe" },
  { label: "기업/기관 보유 합계", amount: 986_627, description: "상장기업, 비상장기업, 채굴업체 보유 합산 (상위 13개사 기준, 2026.02)", color: "#3B82F6", icon: "building" },
  { label: "ETF 보유 합계", amount: 1_113_000, description: "미국 승인 현물 BTC ETF 총 보유량", color: "#8B5CF6", icon: "building" },
  { label: "미채굴 잔여량", amount: BTC_REMAINING, description: `2140년까지 채굴될 나머지. 현재 블록 보상: 3.125 BTC. 다음 반감기: 2028년 4월 예상.`, color: "#EAB308", icon: "pickaxe" },
];

// Country holdings
interface CountryHolding {
  rank: number;
  country: string;
  flag: string;
  held: number;
  method: string;
  notes: string;
}

const BTC_COUNTRIES: CountryHolding[] = [
  { rank: 1, country: "미국", flag: "🇺🇸", held: 207_189, method: "압수", notes: "Silk Road, Bitfinex 해킹 등에서 압수. 전략적 비트코인 비축 행정명령 서명 (2025.3)" },
  { rank: 2, country: "중국", flag: "🇨🇳", held: 194_000, method: "압수", notes: "PlusToken 폰지 사기 등에서 압수. 일부 매각 완료 추정" },
  { rank: 3, country: "영국", flag: "🇬🇧", held: 61_000, method: "압수", notes: "2021년 사상 최대 규모 암호화폐 압수 (CPS)" },
  { rank: 4, country: "우크라이나", flag: "🇺🇦", held: 46_351, method: "기부/압수", notes: "전쟁 기부 + 공무원 신고분" },
  { rank: 5, country: "부탄", flag: "🇧🇹", held: 13_011, method: "채굴", notes: "수력발전 기반 국가 채굴 프로그램 운영" },
  { rank: 6, country: "엘살바도르", flag: "🇸🇻", held: 6_138, method: "구매", notes: "2021년 법정화폐 채택. 매일 1 BTC 구매 정책" },
  { rank: 7, country: "핀란드", flag: "🇫🇮", held: 1_981, method: "압수", notes: "관세청 마약 거래 압수분. 일부 경매 매각" },
  { rank: 8, country: "독일", flag: "🇩🇪", held: 0, method: "압수→매각", notes: "2024년 7월 약 50,000 BTC 전량 매각 완료" },
];

const BTC_COMPANIES: CompanyHolding[] = [
  { rank: 1, company: "Strategy (MicroStrategy)", ticker: "MSTR", held: 717_722, value: 0, pctSupply: 3.418, type: "Public", country: "US" },
  { rank: 2, company: "Marathon Digital", ticker: "MARA", held: 53_822, value: 0, pctSupply: 0.256, type: "Mining", country: "US" },
  { rank: 3, company: "Twenty One Capital", ticker: "XXI", held: 43_514, value: 0, pctSupply: 0.207, type: "Public", country: "US" },
  { rank: 4, company: "Metaplanet", ticker: "3350", held: 35_102, value: 0, pctSupply: 0.167, type: "Public", country: "JP" },
  { rank: 5, company: "BSTR Holdings", ticker: "BSTR", held: 30_021, value: 0, pctSupply: 0.143, type: "Public", country: "US" },
  { rank: 6, company: "Riot Platforms", ticker: "RIOT", held: 19_287, value: 0, pctSupply: 0.092, type: "Mining", country: "US" },
  { rank: 7, company: "Galaxy Digital", ticker: "GLXY", held: 17_102, value: 0, pctSupply: 0.081, type: "Public", country: "CA" },
  { rank: 8, company: "Coinbase", ticker: "COIN", held: 14_548, value: 0, pctSupply: 0.069, type: "Exchange", country: "US" },
  { rank: 9, company: "CleanSpark", ticker: "CLSK", held: 13_099, value: 0, pctSupply: 0.062, type: "Mining", country: "US" },
  { rank: 10, company: "Trump Media", ticker: "DJT", held: 11_542, value: 0, pctSupply: 0.055, type: "Public", country: "US" },
  { rank: 11, company: "Tesla", ticker: "TSLA", held: 11_509, value: 0, pctSupply: 0.055, type: "Public", country: "US" },
  { rank: 12, company: "Hut 8 Corp", ticker: "HUT", held: 10_667, value: 0, pctSupply: 0.051, type: "Mining", country: "CA" },
  { rank: 13, company: "Block Inc", ticker: "XYZ", held: 8_692, value: 0, pctSupply: 0.041, type: "Public", country: "US" },
];

const BTC_ETFS_DEFAULT: ETFHolding[] = [
  { name: "iShares Bitcoin Trust", ticker: "IBIT", held: 575_000, aum: 56.6e9, flows30d: 2.4e9 },
  { name: "Grayscale Bitcoin Trust", ticker: "GBTC", held: 204_000, aum: 20.1e9, flows30d: -320e6 },
  { name: "Fidelity Wise Origin", ticker: "FBTC", held: 200_000, aum: 19.7e9, flows30d: 840e6 },
  { name: "ARK 21Shares", ticker: "ARKB", held: 48_000, aum: 4.73e9, flows30d: 210e6 },
  { name: "Bitwise Bitcoin ETF", ticker: "BITB", held: 42_000, aum: 4.14e9, flows30d: 180e6 },
  { name: "Grayscale BTC Mini", ticker: "BTC", held: 30_000, aum: 2.95e9, flows30d: 95e6 },
  { name: "VanEck Bitcoin ETF", ticker: "HODL", held: 14_000, aum: 1.38e9, flows30d: 45e6 },
];

// ---------------------------------------------------------------------------
// ETH Data
// ---------------------------------------------------------------------------
const ETH_COMPANIES: CompanyHolding[] = [
  { rank: 1, company: "Ethereum Foundation", ticker: "-", held: 271_394, value: 0, pctSupply: 0.226, type: "Foundation", country: "CH" },
  { rank: 2, company: "Consensys", ticker: "-", held: 45_000, value: 0, pctSupply: 0.037, type: "Private", country: "US" },
  { rank: 3, company: "Galaxy Digital", ticker: "GLXY", held: 32_000, value: 0, pctSupply: 0.027, type: "Public", country: "CA" },
  { rank: 4, company: "Meitu", ticker: "1357.HK", held: 940, value: 0, pctSupply: 0.001, type: "Public", country: "CN" },
];

const ETH_ETFS: ETFHolding[] = [
  { name: "iShares Ethereum Trust", ticker: "ETHA", held: 842_000, aum: 2.77e9, flows30d: 180e6 },
  { name: "Grayscale Ethereum Trust", ticker: "ETHE", held: 1_520_000, aum: 4.99e9, flows30d: -85e6 },
  { name: "Fidelity Ethereum Fund", ticker: "FETH", held: 285_000, aum: 936e6, flows30d: 62e6 },
  { name: "Bitwise Ethereum ETF", ticker: "ETHW", held: 95_000, aum: 312e6, flows30d: 28e6 },
];

// ---------------------------------------------------------------------------
// SOL Data
// ---------------------------------------------------------------------------
const SOL_HOLDINGS: CompanyHolding[] = [
  { rank: 1, company: "Solana Foundation", ticker: "-", held: 53_000_000, value: 0, pctSupply: 9.0, type: "Foundation", country: "CH" },
  { rank: 2, company: "Solana Labs", ticker: "-", held: 12_500_000, value: 0, pctSupply: 2.1, type: "Private", country: "US" },
  { rank: 3, company: "Alameda Research (locked)", ticker: "-", held: 7_500_000, value: 0, pctSupply: 1.3, type: "Locked", country: "-" },
  { rank: 4, company: "Jump Crypto", ticker: "-", held: 4_200_000, value: 0, pctSupply: 0.71, type: "VC", country: "US" },
];

// ---------------------------------------------------------------------------
// XRP Data
// ---------------------------------------------------------------------------
const XRP_HOLDINGS: CompanyHolding[] = [
  { rank: 1, company: "Ripple Labs (Escrow)", ticker: "-", held: 38_400_000_000, value: 0, pctSupply: 38.4, type: "Escrow", country: "US" },
  { rank: 2, company: "Ripple Labs (운영)", ticker: "-", held: 4_800_000_000, value: 0, pctSupply: 4.8, type: "Private", country: "US" },
  { rank: 3, company: "Chris Larsen (공동창업자)", ticker: "-", held: 5_190_000_000, value: 0, pctSupply: 5.19, type: "Individual", country: "US" },
  { rank: 4, company: "Jed McCaleb (판매완료)", ticker: "-", held: 0, value: 0, pctSupply: 0, type: "Individual", country: "US" },
  { rank: 5, company: "Binance (거래소)", ticker: "BNB", held: 3_200_000_000, value: 0, pctSupply: 3.2, type: "Exchange", country: "MT" },
  { rank: 6, company: "Uphold", ticker: "-", held: 1_500_000_000, value: 0, pctSupply: 1.5, type: "Exchange", country: "US" },
];

const XRP_SUPPLY_INFO = {
  maxSupply: 100_000_000_000,
  circulating: 57_500_000_000,
  escrow: 38_400_000_000,
  burned: 4_100_000_000,
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
type Tab = "bitcoin" | "ethereum" | "solana" | "xrp";

const DEFAULT_PRICES: Record<Tab, number> = { bitcoin: 98420, ethereum: 3285, solana: 198, xrp: 2.35 };
const SUPPLIES: Record<Tab, number> = { bitcoin: BTC_MINED, ethereum: 120_200_000, solana: 589_000_000, xrp: XRP_SUPPLY_INFO.circulating };
const SYMBOLS: Record<Tab, string> = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL", xrp: "XRP" };

function formatCurrency(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatAmount(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

// Simple SVG donut chart
function DonutChart({
  segments,
  size = 180,
  centerLabel,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const r = size / 2 - 10;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={seg.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="24"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${c} ${c})`}
              className="transition-all duration-500"
            />
          );
        })}
        <circle cx={c} cy={c} r={r - 18} className="fill-background" />
        <text x={c} y={c - 6} textAnchor="middle" className="fill-foreground text-lg font-bold" fontSize="14">
          {formatAmount(total)}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
          {centerLabel || "Total Held"}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            {seg.label} ({((seg.value / total) * 100).toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

// Icon component for supply breakdown
function BreakdownIcon({ icon }: { icon: SupplyBreakdown["icon"] }) {
  const cls = "h-4 w-4";
  switch (icon) {
    case "coins": return <Coins className={cls} />;
    case "lock": return <Lock className={cls} />;
    case "globe": return <Globe className={cls} />;
    case "pickaxe": return <Pickaxe className={cls} />;
    case "building": return <Building className={cls} />;
  }
}

export default function CryptoTreasuriesPage() {
  const [tab, setTab] = useState<Tab>("bitcoin");
  const [sortKey, setSortKey] = useState<"held" | "value">("held");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [livePrices, setLivePrices] = useState<Record<Tab, number>>(DEFAULT_PRICES);
  const [priceSource, setPriceSource] = useState<string>("loading");
  const [btcEtfs, setBtcEtfs] = useState<ETFHolding[]>(BTC_ETFS_DEFAULT);
  const [etfSource, setEtfSource] = useState<string>("");

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd",
          { next: { revalidate: 60 } } as RequestInit
        );
        if (!res.ok) throw new Error("CoinGecko error");
        const data = await res.json();
        setLivePrices({
          bitcoin: data.bitcoin?.usd || DEFAULT_PRICES.bitcoin,
          ethereum: data.ethereum?.usd || DEFAULT_PRICES.ethereum,
          solana: data.solana?.usd || DEFAULT_PRICES.solana,
          xrp: data.ripple?.usd || DEFAULT_PRICES.xrp,
        });
        setPriceSource("CoinGecko (실시간)");
      } catch {
        setPriceSource("기본값 (CoinGecko 연결 실패)");
      }
    }

    async function fetchBtcEtf() {
      try {
        const res = await fetch("/api/crypto/btc-etf");
        if (!res.ok) throw new Error("ETF API error");
        const data = await res.json();
        if (data.etfs && data.etfs.length > 0) {
          setBtcEtfs(data.etfs);
          setEtfSource(data.source || "API");
        }
      } catch {
        setEtfSource("기본값");
      }
    }

    fetchPrices();
    fetchBtcEtf();
  }, []);

  const companies = useMemo(() => {
    const data =
      tab === "bitcoin" ? BTC_COMPANIES :
      tab === "ethereum" ? ETH_COMPANIES :
      tab === "xrp" ? XRP_HOLDINGS :
      SOL_HOLDINGS;
    const p = livePrices[tab];
    const updated = data.map((c) => ({ ...c, value: c.held * p }));
    return [...updated].sort((a, b) => (sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
  }, [tab, sortKey, sortDir, livePrices]);

  const etfs = tab === "bitcoin" ? btcEtfs : tab === "ethereum" ? ETH_ETFS : [];

  const totalCompany = companies.reduce((s, c) => s + c.held, 0);
  const totalETF = etfs.reduce((s, e) => s + e.held, 0);
  const totalAll = totalCompany + totalETF;
  const price = livePrices[tab];
  const supply = SUPPLIES[tab];
  const sym = SYMBOLS[tab];

  const donutSegments = tab === "bitcoin"
    ? [
        { label: "사토시 추정", value: 1_100_000, color: "#F7931A" },
        { label: "분실 추정", value: 3_700_000, color: "#6B7280" },
        { label: "국가 보유", value: 515_689, color: "#10B981" },
        { label: "기업 보유", value: totalCompany, color: "#3B82F6" },
        { label: "ETF 보유", value: totalETF, color: "#8B5CF6" },
        { label: "미채굴", value: BTC_REMAINING, color: "#EAB308" },
        { label: "기타 유통", value: Math.max(0, BTC_MAX_SUPPLY - 1_100_000 - 3_700_000 - 515_689 - totalCompany - totalETF - BTC_REMAINING), color: "rgba(100,116,139,0.15)" },
      ]
    : tab === "xrp"
    ? [
        { label: "Escrow", value: XRP_SUPPLY_INFO.escrow, color: "#8B5CF6" },
        { label: "Ripple 운영", value: 4_800_000_000, color: "#3B82F6" },
        { label: "유통", value: XRP_SUPPLY_INFO.circulating - 4_800_000_000, color: "#10B981" },
        { label: "소각", value: XRP_SUPPLY_INFO.burned, color: "#EF4444" },
      ]
    : [
        ...(totalCompany > 0 ? [{ label: "기업 보유", value: totalCompany, color: "#3b82f6" }] : []),
        ...(totalETF > 0 ? [{ label: "ETF 보유", value: totalETF, color: "#8b5cf6" }] : []),
        { label: "기타/유통", value: Math.max(0, supply - totalAll), color: "rgba(100,116,139,0.2)" },
      ];

  const handleSort = (key: "held" | "value") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ column }: { column: "held" | "value" }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Crypto Treasuries</h1>
        </div>
        <p className="text-muted-foreground">기업, ETF, 재단, 국가의 암호화폐 보유 현황 추적</p>
        <div className="mt-1.5 flex items-center gap-3">
          {priceSource === "loading" ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" /> 가격 로딩 중...
            </span>
          ) : priceSource.includes("실시간") ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> {priceSource}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> {priceSource}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{sym}: ${price.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {([
          { key: "bitcoin" as const, label: "Bitcoin" },
          { key: "ethereum" as const, label: "Ethereum" },
          { key: "solana" as const, label: "Solana" },
          { key: "xrp" as const, label: "XRP" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── BTC Supply Breakdown (Bitcoin only) ─── */}
      {tab === "bitcoin" && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#F7931A]" />
            비트코인 공급량 분석
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Overview cards */}
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">최대 발행량</p>
              <p className="text-2xl font-bold mt-1">{BTC_MAX_SUPPLY.toLocaleString()} BTC</p>
              <p className="text-xs text-muted-foreground mt-1">하드코딩된 한도 — 변경 불가</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">채굴 완료</p>
              <p className="text-2xl font-bold mt-1">{BTC_MINED.toLocaleString()} BTC</p>
              <p className="text-xs text-muted-foreground mt-1">{((BTC_MINED / BTC_MAX_SUPPLY) * 100).toFixed(2)}% 채굴 완료</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">미채굴 잔여</p>
              <p className="text-2xl font-bold mt-1 text-yellow-500">{BTC_REMAINING.toLocaleString()} BTC</p>
              <p className="text-xs text-muted-foreground mt-1">블록 보상 3.125 BTC · 다음 반감기 2028.4</p>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">구분</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">수량 (BTC)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">가치</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">비율</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">비고</th>
                </tr>
              </thead>
              <tbody>
                {BTC_SUPPLY_BREAKDOWN.map((row) => (
                  <tr key={row.label} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span style={{ color: row.color }}><BreakdownIcon icon={row.icon} /></span>
                        {row.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{row.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(row.amount * price)}</td>
                    <td className="px-4 py-3 text-right font-mono">{((row.amount / BTC_MAX_SUPPLY) * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs">{row.description}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-3">실제 유통 가능 추정</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {(BTC_MINED - 1_100_000 - 3_700_000).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency((BTC_MINED - 1_100_000 - 3_700_000) * price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {(((BTC_MINED - 1_100_000 - 3_700_000) / BTC_MAX_SUPPLY) * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    채굴량 - 사토시 보유 - 분실 추정
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── BTC Country Holdings (Bitcoin only) ─── */}
      {tab === "bitcoin" && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-500" />
            국가별 비트코인 보유 현황
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">국가</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">BTC 보유량</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">가치</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">취득 방법</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">비고</th>
                </tr>
              </thead>
              <tbody>
                {BTC_COUNTRIES.map((row) => (
                  <tr key={row.country} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{row.rank}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className="mr-1.5">{row.flag}</span>{row.country}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{row.held.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.held > 0 ? formatCurrency(row.held * price) : "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        row.method === "구매" ? "bg-green-500/10 text-green-600" :
                        row.method === "채굴" ? "bg-blue-500/10 text-blue-600" :
                        row.method === "압수→매각" ? "bg-gray-500/10 text-gray-500" :
                        "bg-amber-500/10 text-amber-600"
                      }`}>{row.method}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-sm">{row.notes}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">합계</td>
                  <td className="px-4 py-3 text-right font-mono">{BTC_COUNTRIES.reduce((s, r) => s + r.held, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(BTC_COUNTRIES.reduce((s, r) => s + r.held, 0) * price)}</td>
                  <td className="px-4 py-3" colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── XRP Supply Info ─── */}
      {tab === "xrp" && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-[#23292F]" />
            XRP 공급 구조
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">최대 발행량</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(XRP_SUPPLY_INFO.maxSupply)} XRP</p>
              <p className="text-xs text-muted-foreground mt-1">사전 채굴 — 추가 발행 없음</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">유통량</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(XRP_SUPPLY_INFO.circulating)} XRP</p>
              <p className="text-xs text-muted-foreground mt-1">{((XRP_SUPPLY_INFO.circulating / XRP_SUPPLY_INFO.maxSupply) * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Escrow (락업)</p>
              <p className="text-2xl font-bold mt-1 text-purple-500">{formatAmount(XRP_SUPPLY_INFO.escrow)} XRP</p>
              <p className="text-xs text-muted-foreground mt-1">매월 10억 XRP 해제 → 미사용분 재잠금</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">영구 소각</p>
              <p className="text-2xl font-bold mt-1 text-red-500">{formatAmount(XRP_SUPPLY_INFO.burned)} XRP</p>
              <p className="text-xs text-muted-foreground mt-1">거래 수수료로 소각 (디플레이션)</p>
            </div>
          </div>
        </section>
      )}

      {/* Summary + Donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{tab === "xrp" ? "주요 보유자" : "기업/재단 보유"}</p>
              <p className="text-2xl font-bold mt-1">{formatAmount(totalCompany)} {sym}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(totalCompany * price)}</p>
            </div>
            {etfs.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">
                  ETF 보유
                  {tab === "bitcoin" && etfSource && (
                    <span className="ml-1 text-[10px] text-primary">({etfSource})</span>
                  )}
                </p>
                <p className="text-2xl font-bold mt-1">{formatAmount(totalETF)} {sym}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(totalETF * price)}</p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                {tab === "bitcoin" ? "최대 공급량 대비" : "유통량 대비"}
              </p>
              <p className="text-2xl font-bold mt-1">
                {((totalAll / (tab === "bitcoin" ? BTC_MAX_SUPPLY : supply)) * 100).toFixed(2)}%
              </p>
              <p className="text-sm text-muted-foreground">
                {tab === "bitcoin"
                  ? `${formatAmount(BTC_MAX_SUPPLY)} BTC (최대)`
                  : `~${formatAmount(supply)} ${sym} 유통`}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-center">
          <DonutChart
            segments={donutSegments}
            centerLabel={tab === "bitcoin" ? "21M BTC" : tab === "xrp" ? "100B XRP" : "Total Held"}
          />
        </div>
      </div>

      {/* Companies / Holdings Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {tab === "bitcoin" ? "기업 보유 현황" : tab === "xrp" ? "주요 XRP 보유자" : tab === "solana" ? "주요 보유 기관" : "기업 보유 현황"}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">기관</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">티커</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("held")}>
                  <span className="inline-flex items-center gap-1">{sym} 보유량 <SortIcon column="held" /></span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("value")}>
                  <span className="inline-flex items-center gap-1">가치 <SortIcon column="value" /></span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">공급량 %</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">유형</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">국가</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((row, i) => (
                <tr key={row.ticker + row.company} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{row.company}</td>
                  <td className="px-4 py-3">
                    {row.ticker !== "-" ? (
                      <span className="inline-flex items-center gap-1 text-primary">{row.ticker} <ExternalLink className="h-3 w-3" /></span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{row.held.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(row.value)}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.pctSupply.toFixed(3)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{row.type}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{row.country}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ETFs Table */}
      {etfs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">{sym} ETF 현황</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ETF 이름</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">티커</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">{sym} 보유</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">AUM</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">30일 순유입</th>
                </tr>
              </thead>
              <tbody>
                {etfs.map((row) => (
                  <tr key={row.ticker} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-primary">{row.ticker}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.held.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(row.aum)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${row.flows30d >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {row.flows30d >= 0 ? "+" : ""}{formatCurrency(Math.abs(row.flows30d))}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-3">합계</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right font-mono">{totalETF.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(etfs.reduce((s, e) => s + e.aum, 0))}</td>
                  <td className={`px-4 py-3 text-right font-mono ${etfs.reduce((s, e) => s + e.flows30d, 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {etfs.reduce((s, e) => s + e.flows30d, 0) >= 0 ? "+" : ""}
                    {formatCurrency(Math.abs(etfs.reduce((s, e) => s + e.flows30d, 0)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "solana" && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Solana에는 아직 승인된 현물 ETF가 없습니다. SEC 심사 중인 ETF 신청이 여러 건 있으며, 승인 시 이 섹션이 업데이트됩니다.
        </div>
      )}

      {tab === "xrp" && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          XRP에는 아직 승인된 미국 현물 ETF가 없습니다. 2025년 여러 자산운용사가 XRP ETF를 신청했으며, SEC 심사가 진행 중입니다.
          Ripple의 에스크로 시스템은 매월 1일에 10억 XRP를 해제하며, 미사용분은 에스크로로 재잠금됩니다.
        </div>
      )}
    </div>
  );
}
