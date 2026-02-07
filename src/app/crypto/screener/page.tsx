"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import SparklineChart from "@/components/ui/SparklineChart";

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d?: { price: number[] };
}

type SortKey =
  | "market_cap"
  | "current_price"
  | "price_change_percentage_24h"
  | "price_change_percentage_7d_in_currency"
  | "total_volume";

function formatCurrency(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

export default function CryptoScreenerPage() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/crypto/prices");
      const json = await res.json();
      if (json.data) setCoins(json.data);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let data = [...coins];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

    return data;
  }, [coins, searchQuery, sortKey, sortDir]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "desc" ? (
      <ArrowDown className="h-3 w-3 text-primary" />
    ) : (
      <ArrowUp className="h-3 w-3 text-primary" />
    );
  };

  const exportCSV = () => {
    const headers = ["Rank,Name,Symbol,Price,24h%,7d%,Market Cap,Volume"];
    const rows = filteredAndSorted.map((c, i) =>
      [
        i + 1,
        c.name,
        c.symbol.toUpperCase(),
        c.current_price,
        c.price_change_percentage_24h?.toFixed(2),
        c.price_change_percentage_7d_in_currency?.toFixed(2),
        c.market_cap,
        c.total_volume,
      ].join(",")
    );
    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crypto-screener.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crypto Screener</h1>
        <p className="text-muted-foreground mt-1">
          실시간 암호화폐 스크리너 - 시총, 가격, 거래량, 변동률 기준 필터링 및 정렬
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="이름 또는 심볼 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          새로고침
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted"
        >
          <Download className="h-4 w-4" /> CSV 내보내기
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredAndSorted.length}개 자산 표시 중
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">
                  이름
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("current_price")}
                >
                  <span className="inline-flex items-center gap-1">
                    가격 <SortIcon column="current_price" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("price_change_percentage_24h")}
                >
                  <span className="inline-flex items-center gap-1">
                    24h % <SortIcon column="price_change_percentage_24h" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("price_change_percentage_7d_in_currency")}
                >
                  <span className="inline-flex items-center gap-1">
                    7d % <SortIcon column="price_change_percentage_7d_in_currency" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("market_cap")}
                >
                  <span className="inline-flex items-center gap-1">
                    시가총액 <SortIcon column="market_cap" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("total_volume")}
                >
                  <span className="inline-flex items-center gap-1">
                    거래량(24h) <SortIcon column="total_volume" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-[120px]">
                  7일 차트
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((coin, index) => {
                const change24h = coin.price_change_percentage_24h ?? 0;
                const change7d =
                  coin.price_change_percentage_7d_in_currency ?? 0;

                return (
                  <tr
                    key={coin.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {coin.image ? (
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="h-6 w-6 rounded-full"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {coin.symbol.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm leading-tight">
                            {coin.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground uppercase">
                            {coin.symbol}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-sm">
                      {formatPrice(coin.current_price)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm ${
                        change24h >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {change24h >= 0 ? "+" : ""}
                      {change24h.toFixed(2)}%
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm ${
                        change7d >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {change7d >= 0 ? "+" : ""}
                      {change7d.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatCurrency(coin.market_cap)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatCurrency(coin.total_volume)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {coin.sparkline_in_7d?.price ? (
                        <SparklineChart
                          data={coin.sparkline_in_7d.price}
                          height={28}
                          className="ml-auto"
                        />
                      ) : (
                        <div className="h-7 w-full bg-muted/30 rounded" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
