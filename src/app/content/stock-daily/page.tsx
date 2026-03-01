"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  GitBranch,
  Calendar,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SheetRow {
  [key: string]: string;
}

interface StockDailyData {
  data: Record<string, SheetRow[]>;
  cachedAt: number;
  source: string;
}

type MarketRegion = "KR" | "US";

type KrTabKey = "상한가" | "하한가" | "급등락" | "크로스" | "경제일정";
type UsTabKey = "US_급등락" | "US_크로스" | "US_경제일정";
type TabKey = KrTabKey | UsTabKey;

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const KR_TABS: TabDef[] = [
  { key: "상한가", label: "상한가", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "하한가", label: "하한가", icon: <TrendingDown className="h-4 w-4" /> },
  { key: "급등락", label: "급등락 (5%+)", icon: <ArrowUpDown className="h-4 w-4" /> },
  { key: "크로스", label: "크로스", icon: <GitBranch className="h-4 w-4" /> },
  { key: "경제일정", label: "경제일정", icon: <Calendar className="h-4 w-4" /> },
];

const US_TABS: TabDef[] = [
  { key: "US_급등락", label: "급등락 (3%+)", icon: <ArrowUpDown className="h-4 w-4" /> },
  { key: "US_크로스", label: "크로스", icon: <GitBranch className="h-4 w-4" /> },
  { key: "US_경제일정", label: "경제일정", icon: <Calendar className="h-4 w-4" /> },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(epochMs: number): string {
  if (!epochMs) return "";
  const diff = Date.now() - epochMs;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function formatNumber(n: string | number): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return String(n);
  return num.toLocaleString("ko-KR");
}

function formatUsdPrice(n: string | number): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return String(n);
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function naverFinanceUrl(code: string): string {
  return `https://finance.naver.com/item/main.naver?code=${code}`;
}

function yahooFinanceUrl(ticker: string): string {
  return `https://finance.yahoo.com/quote/${ticker}`;
}

function getChangeColor(pct: string): string {
  const val = parseFloat(pct);
  if (isNaN(val)) return "";
  if (val > 0) return "text-red-500";
  if (val < 0) return "text-blue-500";
  return "";
}

function getImportanceColor(level: string): string {
  switch (level) {
    case "상":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "중":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    case "하":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getMarketBadge(market: string): string {
  switch (market) {
    case "KOSPI":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "KOSDAQ":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "NYSE":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "NASDAQ":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** KR 주식 테이블 (상한가/하한가/급등락) */
function StockTable({
  rows,
  market,
  search,
}: {
  rows: SheetRow[];
  market: string;
  search: string;
}) {
  const filtered = useMemo(() => {
    let list = [...rows];
    if (market !== "전체") {
      list = list.filter((r) => r["시장"] === market);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r["종목명"] || "").toLowerCase().includes(q) ||
          (r["종목코드"] || "").includes(q) ||
          (r["사유"] || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, market, search]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>해당 조건의 데이터가 없습니다.</p>
      </div>
    );
  }

  const hasDirection = filtered.some((r) => r["방향"]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-3 py-3 font-medium">날짜</th>
            <th className="px-3 py-3 font-medium">종목명</th>
            <th className="px-3 py-3 font-medium">시장</th>
            <th className="px-3 py-3 font-medium text-right">종가</th>
            <th className="px-3 py-3 font-medium text-right">등락률</th>
            {hasDirection && (
              <th className="px-3 py-3 font-medium text-center">방향</th>
            )}
            <th className="px-3 py-3 font-medium text-right">거래량</th>
            <th className="px-3 py-3 font-medium">사유</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr
              key={`${row["종목코드"]}-${row["날짜"]}-${i}`}
              className="border-b border-border/50 hover:bg-muted/50 transition-colors"
            >
              <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                {row["날짜"]}
              </td>
              <td className="px-3 py-3 font-medium">
                <a
                  href={naverFinanceUrl(row["종목코드"])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                >
                  {row["종목명"]}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              </td>
              <td className="px-3 py-3">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${getMarketBadge(row["시장"])}`}
                >
                  {row["시장"]}
                </span>
              </td>
              <td className="px-3 py-3 text-right font-mono">
                {formatNumber(row["종가"])}
              </td>
              <td
                className={`px-3 py-3 text-right font-mono font-semibold ${getChangeColor(row["등락률(%)"])}`}
              >
                {parseFloat(row["등락률(%)"]) > 0 ? "+" : ""}
                {row["등락률(%)"]}%
              </td>
              {hasDirection && (
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      row["방향"] === "급등"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {row["방향"]}
                  </span>
                </td>
              )}
              <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                {formatNumber(row["거래량"])}
              </td>
              <td className="px-3 py-3 text-muted-foreground max-w-[300px] truncate">
                {row["사유"]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** US 주식 테이블 (급등락) — Ticker + Yahoo Finance 링크 */
function UsStockTable({
  rows,
  market,
  search,
}: {
  rows: SheetRow[];
  market: string;
  search: string;
}) {
  const filtered = useMemo(() => {
    let list = [...rows];
    if (market !== "전체") {
      list = list.filter((r) => r["시장"] === market);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r["종목명"] || "").toLowerCase().includes(q) ||
          (r["Ticker"] || "").toLowerCase().includes(q) ||
          (r["사유"] || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, market, search]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>해당 조건의 데이터가 없습니다.</p>
      </div>
    );
  }

  const hasDirection = filtered.some((r) => r["방향"]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-3 py-3 font-medium">날짜</th>
            <th className="px-3 py-3 font-medium">Ticker</th>
            <th className="px-3 py-3 font-medium">종목명</th>
            <th className="px-3 py-3 font-medium">시장</th>
            <th className="px-3 py-3 font-medium text-right">종가 ($)</th>
            <th className="px-3 py-3 font-medium text-right">등락률</th>
            {hasDirection && (
              <th className="px-3 py-3 font-medium text-center">방향</th>
            )}
            <th className="px-3 py-3 font-medium text-right">거래량</th>
            <th className="px-3 py-3 font-medium">사유</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr
              key={`${row["Ticker"]}-${row["날짜"]}-${i}`}
              className="border-b border-border/50 hover:bg-muted/50 transition-colors"
            >
              <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                {row["날짜"]}
              </td>
              <td className="px-3 py-3 font-semibold">
                <a
                  href={yahooFinanceUrl(row["Ticker"])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary transition-colors font-mono"
                >
                  {row["Ticker"]}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              </td>
              <td className="px-3 py-3 font-medium">{row["종목명"]}</td>
              <td className="px-3 py-3">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${getMarketBadge(row["시장"])}`}
                >
                  {row["시장"]}
                </span>
              </td>
              <td className="px-3 py-3 text-right font-mono">
                ${formatUsdPrice(row["종가"])}
              </td>
              <td
                className={`px-3 py-3 text-right font-mono font-semibold ${getChangeColor(row["등락률(%)"])}`}
              >
                {parseFloat(row["등락률(%)"]) > 0 ? "+" : ""}
                {row["등락률(%)"]}%
              </td>
              {hasDirection && (
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      row["방향"] === "급등"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {row["방향"]}
                  </span>
                </td>
              )}
              <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                {formatNumber(row["거래량"])}
              </td>
              <td className="px-3 py-3 text-muted-foreground max-w-[300px] truncate">
                {row["사유"]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** KR 크로스 테이블 */
function CrossTable({
  rows,
  market,
  search,
}: {
  rows: SheetRow[];
  market: string;
  search: string;
}) {
  const filtered = useMemo(() => {
    let list = [...rows];
    if (market !== "전체") {
      list = list.filter((r) => r["시장"] === market);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r["종목명"] || "").toLowerCase().includes(q) ||
          (r["종목코드"] || "").includes(q)
      );
    }
    return list;
  }, [rows, market, search]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>크로스 시그널이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-3 py-3 font-medium">날짜</th>
            <th className="px-3 py-3 font-medium">종목명</th>
            <th className="px-3 py-3 font-medium">시장</th>
            <th className="px-3 py-3 font-medium text-center">유형</th>
            <th className="px-3 py-3 font-medium text-right">단기MA</th>
            <th className="px-3 py-3 font-medium text-right">장기MA</th>
            <th className="px-3 py-3 font-medium text-right">종가</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => {
            const isGolden = (row["유형"] || "").includes("골든");
            return (
              <tr
                key={`${row["종목코드"]}-${row["날짜"]}-${i}`}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  {row["날짜"]}
                </td>
                <td className="px-3 py-3 font-medium">
                  <a
                    href={naverFinanceUrl(row["종목코드"])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    {row["종목명"]}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${getMarketBadge(row["시장"])}`}
                  >
                    {row["시장"]}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isGolden
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isGolden ? "골든크로스" : "데드크로스"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatNumber(row["단기MA"])}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatNumber(row["장기MA"])}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold">
                  {formatNumber(row["종가"])}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** US 크로스 테이블 — Ticker + Yahoo Finance 링크 */
function UsCrossTable({
  rows,
  market,
  search,
}: {
  rows: SheetRow[];
  market: string;
  search: string;
}) {
  const filtered = useMemo(() => {
    let list = [...rows];
    if (market !== "전체") {
      list = list.filter((r) => r["시장"] === market);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r["종목명"] || "").toLowerCase().includes(q) ||
          (r["Ticker"] || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, market, search]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>크로스 시그널이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-3 py-3 font-medium">날짜</th>
            <th className="px-3 py-3 font-medium">Ticker</th>
            <th className="px-3 py-3 font-medium">종목명</th>
            <th className="px-3 py-3 font-medium">시장</th>
            <th className="px-3 py-3 font-medium text-center">유형</th>
            <th className="px-3 py-3 font-medium text-right">단기MA</th>
            <th className="px-3 py-3 font-medium text-right">장기MA</th>
            <th className="px-3 py-3 font-medium text-right">종가 ($)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => {
            const isGolden = (row["유형"] || "").includes("골든");
            return (
              <tr
                key={`${row["Ticker"]}-${row["날짜"]}-${i}`}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                  {row["날짜"]}
                </td>
                <td className="px-3 py-3 font-semibold">
                  <a
                    href={yahooFinanceUrl(row["Ticker"])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors font-mono"
                  >
                    {row["Ticker"]}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </td>
                <td className="px-3 py-3 font-medium">{row["종목명"]}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${getMarketBadge(row["시장"])}`}
                  >
                    {row["시장"]}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isGolden
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isGolden ? "골든크로스" : "데드크로스"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  ${formatUsdPrice(row["단기MA"])}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  ${formatUsdPrice(row["장기MA"])}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold">
                  ${formatUsdPrice(row["종가"])}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 경제일정 (KR/US 공용) */
function EconomicCalendar({
  rows,
  search,
}: {
  rows: SheetRow[];
  search: string;
}) {
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r["이벤트명"] || "").toLowerCase().includes(q) ||
        (r["예상영향"] || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>경제일정 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((row, i) => (
        <div
          key={`${row["이벤트명"]}-${i}`}
          className={`rounded-lg border p-4 ${getImportanceColor(row["중요도"])}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium opacity-70">
              {row["날짜"]}
            </span>
            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-bold border">
              {row["중요도"] === "상"
                ? "HIGH"
                : row["중요도"] === "중"
                  ? "MID"
                  : "LOW"}
            </span>
          </div>
          <h3 className="font-semibold text-base mb-2">{row["이벤트명"]}</h3>
          <p className="text-sm opacity-80 leading-relaxed">
            {row["예상영향"]}
          </p>
          {row["출처URL"] && (
            <a
              href={row["출처URL"]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
            >
              출처 보기 <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function StockDailyPage() {
  const [data, setData] = useState<Record<string, SheetRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cachedAt, setCachedAt] = useState(0);
  const [source, setSource] = useState("");

  const [region, setRegion] = useState<MarketRegion>("KR");
  const [activeTab, setActiveTab] = useState<TabKey>("상한가");
  const [market, setMarket] = useState("전체");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Current tab list based on region
  const currentTabs = region === "KR" ? KR_TABS : US_TABS;

  // When region changes, reset to first tab of that region
  const handleRegionChange = useCallback((newRegion: MarketRegion) => {
    setRegion(newRegion);
    setActiveTab(newRegion === "KR" ? "상한가" : "US_급등락");
    setMarket("전체");
    setSearch("");
  }, []);

  const fetchData = useCallback(async (refresh: boolean) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const url = refresh
        ? "/api/content/stock-daily?refresh=true"
        : "/api/content/stock-daily";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StockDailyData = await res.json();
      setData(json.data || {});
      setCachedAt(json.cachedAt || 0);
      setSource(json.source || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Available dates from data
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    Object.values(data).forEach((rows) => {
      rows.forEach((r) => {
        if (r["날짜"]) dates.add(r["날짜"]);
      });
    });
    return Array.from(dates).sort().reverse();
  }, [data]);

  // Filter by date
  const filteredByDate = useMemo(() => {
    if (!selectedDate) return data;
    const result: Record<string, SheetRow[]> = {};
    Object.entries(data).forEach(([tab, rows]) => {
      result[tab] = rows.filter((r) => r["날짜"] === selectedDate);
    });
    return result;
  }, [data, selectedDate]);

  const currentRows = filteredByDate[activeTab] || [];

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentTabs.forEach((t) => {
      counts[t.key] = (filteredByDate[t.key] || []).length;
    });
    return counts;
  }, [filteredByDate, currentTabs]);

  // Market filter options based on region
  const marketOptions = region === "KR"
    ? ["전체", "KOSPI", "KOSDAQ"]
    : ["전체", "NYSE", "NASDAQ"];

  // Is current tab an economic calendar?
  const isCalendar = activeTab === "경제일정" || activeTab === "US_경제일정";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">주식 일간 분석</h1>
          </div>
          <p className="text-muted-foreground">
            {region === "KR"
              ? "KOSPI/KOSDAQ 상한가·하한가·급등락·MA크로스 자동 분석"
              : "NYSE/NASDAQ 급등락·MA크로스·경제일정 자동 분석"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {source === "sample" && (
            <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full px-2.5 py-1 font-medium">
              샘플 데이터
            </span>
          )}
          {cachedAt > 0 && !loading && (
            <span className="text-xs text-muted-foreground">
              {timeAgo(cachedAt)} 업데이트
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "불러오는 중..." : "새로고침"}
          </button>
        </div>
      </div>

      {/* Market Region Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => handleRegionChange("KR")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            region === "KR"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <span className="text-base">🇰🇷</span>
          한국주식
        </button>
        <button
          onClick={() => handleRegionChange("US")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            region === "US"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <span className="text-base">🇺🇸</span>
          미국주식
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-0">
        {currentTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tabCounts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              region === "KR"
                ? "종목명, 코드, 사유 검색..."
                : "Ticker, 종목명, 사유 검색..."
            }
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        {!isCalendar && (
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {marketOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "전체" ? "전체 시장" : opt}
              </option>
            ))}
          </select>
        )}
        {availableDates.length > 0 && (
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">전체 날짜</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin opacity-50" />
          <p>데이터를 불러오는 중...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-16 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50 text-red-500" />
          <p>데이터를 불러올 수 없습니다.</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && currentRows.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isCalendar ? (
            <div className="p-4">
              <EconomicCalendar rows={currentRows} search={search} />
            </div>
          ) : activeTab === "크로스" ? (
            <CrossTable rows={currentRows} market={market} search={search} />
          ) : activeTab === "US_크로스" ? (
            <UsCrossTable rows={currentRows} market={market} search={search} />
          ) : activeTab === "US_급등락" ? (
            <UsStockTable rows={currentRows} market={market} search={search} />
          ) : (
            <StockTable rows={currentRows} market={market} search={search} />
          )}
        </div>
      )}

      {!loading && !error && currentRows.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>해당 조건의 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
