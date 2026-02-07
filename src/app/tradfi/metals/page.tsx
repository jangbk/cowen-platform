import { Gem, TrendingUp, TrendingDown } from "lucide-react";

const METALS = [
  { name: "Gold", symbol: "XAU", price: 2842.4, change: 0.84, changeAbs: 23.6, unit: "oz", ytd: 8.2, high52w: 2882, low52w: 1984 },
  { name: "Silver", symbol: "XAG", price: 32.84, change: 1.42, changeAbs: 0.46, unit: "oz", ytd: 12.4, high52w: 34.82, low52w: 22.14 },
  { name: "Platinum", symbol: "XPT", price: 1042.8, change: -0.24, changeAbs: -2.5, unit: "oz", ytd: 4.2, high52w: 1082, low52w: 842 },
  { name: "Palladium", symbol: "XPD", price: 984.2, change: -1.12, changeAbs: -11.1, unit: "oz", ytd: -2.8, high52w: 1242, low52w: 842 },
  { name: "Copper", symbol: "HG", price: 4.42, change: 0.62, changeAbs: 0.027, unit: "lb", ytd: 6.8, high52w: 4.82, low52w: 3.62 },
  { name: "Aluminum", symbol: "ALI", price: 2684.2, change: 0.34, changeAbs: 9.1, unit: "MT", ytd: 3.4, high52w: 2842, low52w: 2184 },
  { name: "Nickel", symbol: "NI", price: 16842.4, change: -0.82, changeAbs: -139.2, unit: "MT", ytd: -4.2, high52w: 18482, low52w: 14282 },
  { name: "Zinc", symbol: "ZN", price: 2842.8, change: 0.18, changeAbs: 5.1, unit: "MT", ytd: 2.1, high52w: 3042, low52w: 2342 },
];

const RATIOS = [
  { name: "Gold/Silver Ratio", value: "86.5", change: "-0.6%", desc: "Historical avg: ~60" },
  { name: "Gold/BTC Ratio", value: "0.029", change: "-2.2%", desc: "1oz Gold in BTC" },
  { name: "Gold/S&P 500 Ratio", value: "0.463", change: "+0.02%", desc: "Gold relative to equities" },
  { name: "Gold/Oil Ratio", value: "38.2", change: "+1.1%", desc: "Barrels of oil per oz gold" },
];

export default function MetalsPage() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gem className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Precious & Industrial Metals</h1>
        </div>
        <p className="text-muted-foreground">
          Track spot prices, performance, and ratios for precious metals and key industrial commodities.
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METALS.slice(0, 4).map((metal) => (
          <div key={metal.symbol} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{metal.name}</span>
              <span className="text-xs font-mono text-muted-foreground">{metal.symbol}</span>
            </div>
            <p className="text-xl font-bold">${metal.price.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/{metal.unit}</span></p>
            <div className={`flex items-center gap-1 mt-1 text-sm ${metal.change >= 0 ? "text-green-500" : "text-red-500"}`}>
              {metal.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{metal.change >= 0 ? "+" : ""}{metal.change.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ratios */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Key Ratios</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RATIOS.map((ratio) => (
            <div key={ratio.name} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-medium">{ratio.name}</p>
              <p className="text-2xl font-bold mt-1">{ratio.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{ratio.change} &middot; {ratio.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">All Metals</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metal</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Symbol</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Change %</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">YTD %</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W High</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">52W Low</th>
              </tr>
            </thead>
            <tbody>
              {METALS.map((metal) => (
                <tr key={metal.symbol} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{metal.name}</td>
                  <td className="px-4 py-3 font-mono text-primary">{metal.symbol}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">${metal.price.toLocaleString()}/{metal.unit}</td>
                  <td className={`px-4 py-3 text-right font-mono ${metal.changeAbs >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {metal.changeAbs >= 0 ? "+" : ""}{metal.changeAbs}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${metal.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {metal.change >= 0 ? "+" : ""}{metal.change.toFixed(2)}%
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${metal.ytd >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {metal.ytd >= 0 ? "+" : ""}{metal.ytd.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">${metal.high52w.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">${metal.low52w.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
