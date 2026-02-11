"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  marketCap: number;
  pe: number;
  divYield: number;
  volume: number;
}

const FALLBACK_STOCKS: Stock[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 242.8, change: 1.24, marketCap: 3.72e12, pe: 32.4, divYield: 0.44, volume: 62400000 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: 438.2, change: 0.82, marketCap: 3.26e12, pe: 36.8, divYield: 0.72, volume: 24800000 },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: 142.6, change: 2.84, marketCap: 3.48e12, pe: 62.4, divYield: 0.02, volume: 312400000 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication", price: 198.4, change: -0.42, marketCap: 2.44e12, pe: 24.2, divYield: 0.48, volume: 28200000 },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer", price: 228.6, change: 1.62, marketCap: 2.38e12, pe: 42.8, divYield: 0, volume: 48200000 },
  { symbol: "META", name: "Meta Platforms", sector: "Communication", price: 624.8, change: -0.18, marketCap: 1.58e12, pe: 28.4, divYield: 0.32, volume: 18400000 },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer", price: 384.2, change: 3.42, marketCap: 1.22e12, pe: 82.4, divYield: 0, volume: 124800000 },
  { symbol: "BRK-B", name: "Berkshire Hathaway", sector: "Financials", price: 478.4, change: 0.24, marketCap: 1.04e12, pe: 12.8, divYield: 0, volume: 4200000 },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials", price: 262.4, change: 0.62, marketCap: 742e9, pe: 14.2, divYield: 1.82, volume: 12400000 },
  { symbol: "V", name: "Visa Inc.", sector: "Financials", price: 324.8, change: 0.42, marketCap: 642e9, pe: 32.8, divYield: 0.68, volume: 8400000 },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", price: 542.4, change: -1.24, marketCap: 498e9, pe: 22.4, divYield: 1.42, volume: 4800000 },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 108.6, change: -0.82, marketCap: 462e9, pe: 14.8, divYield: 3.24, volume: 16800000 },
];

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

export default function StocksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [stocks, setStocks] = useState<Stock[]>(FALLBACK_STOCKS);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStocks() {
      try {
        const res = await fetch("/api/tradfi/quotes?type=stock");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const mapped: Stock[] = json.data.map((d: { symbol: string; name: string; sector?: string; price: number; change: number; marketCap: number; pe: number; divYield: number; volume: number }) => ({
            symbol: d.symbol,
            name: d.name,
            sector: d.sector || "Other",
            price: d.price,
            change: d.change,
            marketCap: d.marketCap,
            pe: d.pe,
            divYield: d.divYield,
            volume: d.volume,
          }));
          setStocks(mapped);
          setDataSource(json.source === "yahoo" ? "Yahoo Finance (실시간)" : "sample");
        } else {
          setDataSource("fallback");
        }
      } catch {
        setDataSource("fallback");
      } finally {
        setIsLoading(false);
      }
    }
    fetchStocks();
  }, []);

  const filtered = stocks.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === "all" || s.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sectors = ["all", ...new Set(stocks.map((s) => s.sector))];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stocks</h1>
        <p className="text-muted-foreground mt-1">
          Browse and filter US equities by sector, market cap, valuation, and performance.
        </p>
        <div className="mt-1.5">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" /> 데이터 로딩 중...
            </span>
          ) : dataSource.includes("실시간") ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> {dataSource}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> 샘플 데이터 (Yahoo Finance 연결 대기)
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or ticker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {sectors.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All Sectors" : s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ticker</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sector</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change %</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Market Cap</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">P/E</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Div Yield</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Volume</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : filtered.map((stock) => (
              <tr key={stock.symbol} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono font-bold text-primary">{stock.symbol}</td>
                <td className="px-4 py-3 font-medium">{stock.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{stock.sector}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">${stock.price.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${stock.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  <span className="inline-flex items-center gap-1">
                    {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatMarketCap(stock.marketCap)}</td>
                <td className="px-4 py-3 text-right font-mono">{stock.pe > 0 ? stock.pe.toFixed(1) : "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : "—"}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatVolume(stock.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
