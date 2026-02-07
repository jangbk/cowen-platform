"use client";

import { useState, useMemo } from "react";
import { Building, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Data
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

const BTC_COMPANIES: CompanyHolding[] = [
  { rank: 1, company: "MicroStrategy", ticker: "MSTR", held: 439000, value: 43.2e9, pctSupply: 2.09, type: "Public", country: "US" },
  { rank: 2, company: "Marathon Digital", ticker: "MARA", held: 44893, value: 4.42e9, pctSupply: 0.214, type: "Mining", country: "US" },
  { rank: 3, company: "Riot Platforms", ticker: "RIOT", held: 17722, value: 1.74e9, pctSupply: 0.084, type: "Mining", country: "US" },
  { rank: 4, company: "Tesla", ticker: "TSLA", held: 9720, value: 957e6, pctSupply: 0.046, type: "Public", country: "US" },
  { rank: 5, company: "CleanSpark", ticker: "CLSK", held: 9952, value: 979e6, pctSupply: 0.047, type: "Mining", country: "US" },
  { rank: 6, company: "Coinbase", ticker: "COIN", held: 9480, value: 933e6, pctSupply: 0.045, type: "Exchange", country: "US" },
  { rank: 7, company: "Hut 8 Mining", ticker: "HUT", held: 9109, value: 896e6, pctSupply: 0.043, type: "Mining", country: "CA" },
  { rank: 8, company: "Galaxy Digital", ticker: "GLXY", held: 8100, value: 797e6, pctSupply: 0.039, type: "Public", country: "CA" },
  { rank: 9, company: "Block Inc", ticker: "SQ", held: 8027, value: 790e6, pctSupply: 0.038, type: "Public", country: "US" },
  { rank: 10, company: "Metaplanet", ticker: "3350", held: 1762, value: 173e6, pctSupply: 0.008, type: "Public", country: "JP" },
];

const BTC_ETFS: ETFHolding[] = [
  { name: "iShares Bitcoin Trust", ticker: "IBIT", held: 568000, aum: 55.9e9, flows30d: 2.4e9 },
  { name: "Fidelity Wise Origin", ticker: "FBTC", held: 198000, aum: 19.5e9, flows30d: 840e6 },
  { name: "Grayscale Bitcoin Trust", ticker: "GBTC", held: 210000, aum: 20.7e9, flows30d: -320e6 },
  { name: "ARK 21Shares", ticker: "ARKB", held: 48000, aum: 4.73e9, flows30d: 210e6 },
  { name: "Bitwise Bitcoin ETF", ticker: "BITB", held: 41000, aum: 4.04e9, flows30d: 180e6 },
];

const ETH_COMPANIES: CompanyHolding[] = [
  { rank: 1, company: "Ethereum Foundation", ticker: "-", held: 271394, value: 891e6, pctSupply: 0.226, type: "Foundation", country: "CH" },
  { rank: 2, company: "Consensys", ticker: "-", held: 45000, value: 147.8e6, pctSupply: 0.037, type: "Private", country: "US" },
  { rank: 3, company: "Galaxy Digital", ticker: "GLXY", held: 32000, value: 105.1e6, pctSupply: 0.027, type: "Public", country: "CA" },
  { rank: 4, company: "Meitu", ticker: "1357.HK", held: 940, value: 3.1e6, pctSupply: 0.001, type: "Public", country: "CN" },
];

const ETH_ETFS: ETFHolding[] = [
  { name: "iShares Ethereum Trust", ticker: "ETHA", held: 842000, aum: 2.77e9, flows30d: 180e6 },
  { name: "Fidelity Ethereum Fund", ticker: "FETH", held: 285000, aum: 936e6, flows30d: 62e6 },
  { name: "Grayscale Ethereum Trust", ticker: "ETHE", held: 1520000, aum: 4.99e9, flows30d: -85e6 },
  { name: "Bitwise Ethereum ETF", ticker: "ETHW", held: 95000, aum: 312e6, flows30d: 28e6 },
];

const SOL_HOLDINGS: CompanyHolding[] = [
  { rank: 1, company: "Solana Foundation", ticker: "-", held: 53000000, value: 10.5e9, pctSupply: 9.0, type: "Foundation", country: "CH" },
  { rank: 2, company: "Solana Labs", ticker: "-", held: 12500000, value: 2.48e9, pctSupply: 2.1, type: "Private", country: "US" },
  { rank: 3, company: "Alameda Research (locked)", ticker: "-", held: 7500000, value: 1.49e9, pctSupply: 1.3, type: "Locked", country: "-" },
  { rank: 4, company: "Jump Crypto", ticker: "-", held: 4200000, value: 832e6, pctSupply: 0.71, type: "VC", country: "US" },
];

type Tab = "bitcoin" | "ethereum" | "solana";

const PRICES: Record<Tab, number> = { bitcoin: 98420, ethereum: 3285, solana: 198 };
const SUPPLIES: Record<Tab, number> = { bitcoin: 19600000, ethereum: 120200000, solana: 589000000 };
const SYMBOLS: Record<Tab, string> = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL" };

function formatCurrency(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

// Simple SVG donut chart
function DonutChart({
  segments,
  size = 180,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
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
        <text
          x={c}
          y={c - 6}
          textAnchor="middle"
          className="fill-foreground text-lg font-bold"
          fontSize="16"
        >
          {total.toLocaleString()}
        </text>
        <text
          x={c}
          y={c + 12}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          Total Held
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            {seg.label} ({((seg.value / total) * 100).toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CryptoTreasuriesPage() {
  const [tab, setTab] = useState<Tab>("bitcoin");
  const [sortKey, setSortKey] = useState<"held" | "value">("held");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const companies = useMemo(() => {
    const data = tab === "bitcoin" ? BTC_COMPANIES : tab === "ethereum" ? ETH_COMPANIES : SOL_HOLDINGS;
    return [...data].sort((a, b) => (sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
  }, [tab, sortKey, sortDir]);

  const etfs = tab === "bitcoin" ? BTC_ETFS : tab === "ethereum" ? ETH_ETFS : [];

  const totalCompany = companies.reduce((s, c) => s + c.held, 0);
  const totalETF = etfs.reduce((s, e) => s + e.held, 0);
  const totalAll = totalCompany + totalETF;
  const price = PRICES[tab];
  const supply = SUPPLIES[tab];
  const sym = SYMBOLS[tab];

  const donutSegments = [
    ...(totalCompany > 0
      ? [{ label: "기업 보유", value: totalCompany, color: "#3b82f6" }]
      : []),
    ...(totalETF > 0
      ? [{ label: "ETF 보유", value: totalETF, color: "#8b5cf6" }]
      : []),
    {
      label: "기타/유통",
      value: Math.max(0, supply - totalAll),
      color: "rgba(100,116,139,0.2)",
    },
  ];

  const handleSort = (key: "held" | "value") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ column }: { column: "held" | "value" }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "desc" ? (
      <ArrowDown className="h-3 w-3 text-primary" />
    ) : (
      <ArrowUp className="h-3 w-3 text-primary" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Crypto Treasuries</h1>
        </div>
        <p className="text-muted-foreground">
          기업, ETF, 재단의 암호화폐 보유 현황 추적
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(
          [
            { key: "bitcoin", label: "Bitcoin" },
            { key: "ethereum", label: "Ethereum" },
            { key: "solana", label: "Solana" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary + Donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">기업/재단 보유</p>
              <p className="text-2xl font-bold mt-1">
                {totalCompany.toLocaleString()} {sym}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(totalCompany * price)}
              </p>
            </div>
            {etfs.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">ETF 보유</p>
                <p className="text-2xl font-bold mt-1">
                  {totalETF.toLocaleString()} {sym}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(totalETF * price)}
                </p>
              </div>
            )}
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">전체 공급량 대비</p>
              <p className="text-2xl font-bold mt-1">
                {((totalAll / supply) * 100).toFixed(2)}%
              </p>
              <p className="text-sm text-muted-foreground">
                ~{(supply / 1e6).toFixed(1)}M {sym} 유통
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-center">
          <DonutChart segments={donutSegments} />
        </div>
      </div>

      {/* Companies Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {tab === "solana" ? "주요 보유 기관" : "기업 보유 현황"}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  기관
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  티커
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("held")}
                >
                  <span className="inline-flex items-center gap-1">
                    {sym} 보유량 <SortIcon column="held" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("value")}
                >
                  <span className="inline-flex items-center gap-1">
                    가치 <SortIcon column="value" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  공급량 %
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  유형
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  국가
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((row, i) => (
                <tr
                  key={row.ticker + row.company}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{row.company}</td>
                  <td className="px-4 py-3">
                    {row.ticker !== "-" ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        {row.ticker}{" "}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row.held.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCurrency(row.value)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row.pctSupply.toFixed(3)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {row.type}
                    </span>
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
          <h2 className="text-lg font-semibold mb-4">
            {sym} ETF 현황
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    ETF 이름
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    티커
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    {sym} 보유
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    AUM
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    30일 순유입
                  </th>
                </tr>
              </thead>
              <tbody>
                {etfs.map((row) => (
                  <tr
                    key={row.ticker}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-primary">{row.ticker}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.held.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(row.aum)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        row.flows30d >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {row.flows30d >= 0 ? "+" : ""}
                      {formatCurrency(Math.abs(row.flows30d))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "solana" && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Solana에는 아직 승인된 현물 ETF가 없습니다. SEC 심사 중인 ETF 신청이
          여러 건 있으며, 승인 시 이 섹션이 업데이트됩니다.
        </div>
      )}
    </div>
  );
}
