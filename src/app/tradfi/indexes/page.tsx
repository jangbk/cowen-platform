import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

const INDEXES = [
  { name: "S&P 500", ticker: "SPX", price: 6142.8, change: 0.82, changeAbs: 50.1, ytd: 4.2, high52w: 6198, low52w: 4682, pe: 24.8 },
  { name: "Dow Jones", ticker: "DJI", price: 44842.3, change: 0.64, changeAbs: 285.2, ytd: 3.8, high52w: 45073, low52w: 35682, pe: 22.1 },
  { name: "Nasdaq 100", ticker: "NDX", price: 21842.5, change: 1.12, changeAbs: 242.8, ytd: 5.1, high52w: 22104, low52w: 16302, pe: 32.4 },
  { name: "Russell 2000", ticker: "RUT", price: 2284.6, change: -0.34, changeAbs: -7.8, ytd: 1.2, high52w: 2442, low52w: 1682, pe: 28.2 },
  { name: "FTSE 100", ticker: "UKX", price: 8412.4, change: 0.28, changeAbs: 23.5, ytd: 2.8, high52w: 8524, low52w: 7282, pe: 14.2 },
  { name: "DAX", ticker: "DAX", price: 21284.6, change: 0.92, changeAbs: 194.2, ytd: 6.4, high52w: 21482, low52w: 16842, pe: 16.8 },
  { name: "Nikkei 225", ticker: "NKY", price: 39842.1, change: -0.18, changeAbs: -71.8, ytd: 2.1, high52w: 42485, low52w: 32842, pe: 21.4 },
  { name: "Shanghai Composite", ticker: "SHCOMP", price: 3342.8, change: 0.42, changeAbs: 14.0, ytd: 1.8, high52w: 3682, low52w: 2842, pe: 13.6 },
  { name: "Hang Seng", ticker: "HSI", price: 21482.4, change: 1.24, changeAbs: 263.4, ytd: 8.2, high52w: 22842, low52w: 15482, pe: 10.8 },
  { name: "KOSPI", ticker: "KOSPI", price: 2584.2, change: -0.52, changeAbs: -13.5, ytd: -1.4, high52w: 2842, low52w: 2284, pe: 12.4 },
];

export default function IndexesPage() {
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDEXES.slice(0, 4).map((idx) => (
          <div key={idx.ticker} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{idx.name}</p>
            <p className="text-xl font-bold mt-1">{idx.price.toLocaleString()}</p>
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
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">YTD %</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W High</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W Low</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">P/E</th>
            </tr>
          </thead>
          <tbody>
            {INDEXES.map((idx) => (
              <tr key={idx.ticker} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{idx.name}</td>
                <td className="px-4 py-3 text-primary font-mono">{idx.ticker}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{idx.price.toLocaleString()}</td>
                <td className={`px-4 py-3 text-right font-mono ${idx.changeAbs >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {idx.changeAbs >= 0 ? "+" : ""}{idx.changeAbs.toFixed(1)}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${idx.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}%
                </td>
                <td className={`px-4 py-3 text-right font-mono ${idx.ytd >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {idx.ytd >= 0 ? "+" : ""}{idx.ytd.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{idx.high52w.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{idx.low52w.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{idx.pe.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
