"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changeAbs: number;
  high52w: number;
  low52w: number;
  pe: number;
}

const FALLBACK_INDEXES: IndexData[] = [
  { name: "S&P 500", symbol: "^GSPC", price: 6142.8, change: 0.82, changeAbs: 50.1, high52w: 6198, low52w: 4682, pe: 24.8 },
  { name: "Dow Jones", symbol: "^DJI", price: 44842.3, change: 0.64, changeAbs: 285.2, high52w: 45073, low52w: 35682, pe: 22.1 },
  { name: "Nasdaq 100", symbol: "^NDX", price: 21842.5, change: 1.12, changeAbs: 242.8, high52w: 22104, low52w: 16302, pe: 32.4 },
  { name: "Russell 2000", symbol: "^RUT", price: 2284.6, change: -0.34, changeAbs: -7.8, high52w: 2442, low52w: 1682, pe: 28.2 },
  { name: "FTSE 100", symbol: "^FTSE", price: 8412.4, change: 0.28, changeAbs: 23.5, high52w: 8524, low52w: 7282, pe: 14.2 },
  { name: "DAX", symbol: "^GDAXI", price: 21284.6, change: 0.92, changeAbs: 194.2, high52w: 21482, low52w: 16842, pe: 16.8 },
  { name: "Nikkei 225", symbol: "^N225", price: 39842.1, change: -0.18, changeAbs: -71.8, high52w: 42485, low52w: 32842, pe: 21.4 },
  { name: "Shanghai Composite", symbol: "000001.SS", price: 3342.8, change: 0.42, changeAbs: 14.0, high52w: 3682, low52w: 2842, pe: 13.6 },
  { name: "Hang Seng", symbol: "^HSI", price: 21482.4, change: 1.24, changeAbs: 263.4, high52w: 22842, low52w: 15482, pe: 10.8 },
  { name: "KOSPI", symbol: "^KS11", price: 2584.2, change: -0.52, changeAbs: -13.5, high52w: 2842, low52w: 2284, pe: 12.4 },
];

export default function IndexesPage() {
  const [indexes, setIndexes] = useState<IndexData[]>(FALLBACK_INDEXES);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchIndexes() {
      try {
        const res = await fetch("/api/tradfi/quotes?type=index");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const mapped: IndexData[] = json.data.map((d: { symbol: string; name: string; price: number; change: number; changeAbs: number; high52w: number; low52w: number; pe: number }) => ({
            symbol: d.symbol,
            name: d.name,
            price: d.price,
            change: d.change,
            changeAbs: d.changeAbs,
            high52w: d.high52w,
            low52w: d.low52w,
            pe: d.pe || 0,
          }));
          setIndexes(mapped);
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
    fetchIndexes();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Global Indexes</h1>
        </div>
        <p className="text-muted-foreground">
          Track major global stock market indices with real-time prices, performance, and valuation metrics.
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {indexes.slice(0, 4).map((idx) => (
          <div key={idx.symbol} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{idx.name}</p>
            <p className="text-xl font-bold mt-1">{idx.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
            <div className={`flex items-center gap-1 mt-1 text-sm ${idx.change >= 0 ? "text-green-500" : "text-red-500"}`}>
              {idx.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}%</span>
              <span className="text-xs">({idx.changeAbs >= 0 ? "+" : ""}{idx.changeAbs.toFixed(1)})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Index</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ticker</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change %</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W High</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W Low</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">P/E</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : indexes.map((idx) => (
              <tr key={idx.symbol} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{idx.name}</td>
                <td className="px-4 py-3 text-primary font-mono">{idx.symbol}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{idx.price.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                <td className={`px-4 py-3 text-right font-mono ${idx.changeAbs >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {idx.changeAbs >= 0 ? "+" : ""}{idx.changeAbs.toFixed(1)}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${idx.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{idx.high52w.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{idx.low52w.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{idx.pe > 0 ? idx.pe.toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
