"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, TrendingUp, TrendingDown } from "lucide-react";

const STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", price: 242.8, change: 1.24, marketCap: "3.72T", pe: 32.4, divYield: 0.44, volume: "62.4M" },
  { ticker: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: 438.2, change: 0.82, marketCap: "3.26T", pe: 36.8, divYield: 0.72, volume: "24.8M" },
  { ticker: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: 142.6, change: 2.84, marketCap: "3.48T", pe: 62.4, divYield: 0.02, volume: "312.4M" },
  { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Communication", price: 198.4, change: -0.42, marketCap: "2.44T", pe: 24.2, divYield: 0.48, volume: "28.2M" },
  { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer", price: 228.6, change: 1.62, marketCap: "2.38T", pe: 42.8, divYield: 0.0, volume: "48.2M" },
  { ticker: "META", name: "Meta Platforms", sector: "Communication", price: 624.8, change: -0.18, marketCap: "1.58T", pe: 28.4, divYield: 0.32, volume: "18.4M" },
  { ticker: "TSLA", name: "Tesla Inc.", sector: "Consumer", price: 384.2, change: 3.42, marketCap: "1.22T", pe: 82.4, divYield: 0.0, volume: "124.8M" },
  { ticker: "BRK.B", name: "Berkshire Hathaway", sector: "Financials", price: 478.4, change: 0.24, marketCap: "1.04T", pe: 12.8, divYield: 0.0, volume: "4.2M" },
  { ticker: "JPM", name: "JPMorgan Chase", sector: "Financials", price: 262.4, change: 0.62, marketCap: "742B", pe: 14.2, divYield: 1.82, volume: "12.4M" },
  { ticker: "V", name: "Visa Inc.", sector: "Financials", price: 324.8, change: 0.42, marketCap: "642B", pe: 32.8, divYield: 0.68, volume: "8.4M" },
  { ticker: "UNH", name: "UnitedHealth Group", sector: "Healthcare", price: 542.4, change: -1.24, marketCap: "498B", pe: 22.4, divYield: 1.42, volume: "4.8M" },
  { ticker: "XOM", name: "Exxon Mobil", sector: "Energy", price: 108.6, change: -0.82, marketCap: "462B", pe: 14.8, divYield: 3.24, volume: "16.8M" },
];

export default function StocksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");

  const filtered = STOCKS.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.ticker.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === "all" || s.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sectors = ["all", ...new Set(STOCKS.map((s) => s.sector))];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stocks</h1>
        <p className="text-muted-foreground mt-1">
          Browse and filter US equities by sector, market cap, valuation, and performance.
        </p>
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
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted">
          <SlidersHorizontal className="h-4 w-4" /> More Filters
        </button>
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
            {filtered.map((stock) => (
              <tr key={stock.ticker} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-mono font-bold text-primary">{stock.ticker}</td>
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
                <td className="px-4 py-3 text-right font-mono">${stock.marketCap}</td>
                <td className="px-4 py-3 text-right font-mono">{stock.pe.toFixed(1)}</td>
                <td className="px-4 py-3 text-right font-mono">{stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : "—"}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{stock.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
