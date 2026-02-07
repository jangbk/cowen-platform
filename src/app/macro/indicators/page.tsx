import { Activity, TrendingUp, TrendingDown, Minus, Globe } from "lucide-react";

const INDICATOR_GROUPS = [
  {
    category: "United States",
    flag: "US",
    indicators: [
      { name: "GDP Growth (QoQ)", value: "2.8%", prev: "3.1%", trend: "down", next: "Mar 27, 2026" },
      { name: "CPI YoY", value: "3.1%", prev: "3.3%", trend: "down", next: "Feb 12, 2026" },
      { name: "Core PCE YoY", value: "2.8%", prev: "2.9%", trend: "down", next: "Feb 28, 2026" },
      { name: "Unemployment Rate", value: "3.9%", prev: "3.8%", trend: "up", next: "Mar 7, 2026" },
      { name: "Fed Funds Rate", value: "4.50%", prev: "4.75%", trend: "down", next: "Mar 19, 2026" },
      { name: "10Y Treasury Yield", value: "4.21%", prev: "4.38%", trend: "down", next: "Live" },
      { name: "Manufacturing PMI", value: "52.4", prev: "51.8", trend: "up", next: "Mar 3, 2026" },
      { name: "Consumer Confidence", value: "108.7", prev: "106.2", trend: "up", next: "Feb 25, 2026" },
    ],
  },
  {
    category: "Europe",
    flag: "EU",
    indicators: [
      { name: "Eurozone GDP QoQ", value: "0.3%", prev: "0.2%", trend: "up", next: "Mar 14, 2026" },
      { name: "ECB Interest Rate", value: "3.75%", prev: "4.00%", trend: "down", next: "Mar 6, 2026" },
      { name: "Eurozone CPI YoY", value: "2.4%", prev: "2.6%", trend: "down", next: "Mar 3, 2026" },
      { name: "UK GDP QoQ", value: "0.1%", prev: "0.0%", trend: "up", next: "Feb 13, 2026" },
    ],
  },
  {
    category: "Asia-Pacific",
    flag: "APAC",
    indicators: [
      { name: "China GDP YoY", value: "5.0%", prev: "4.9%", trend: "up", next: "Apr 16, 2026" },
      { name: "Japan GDP QoQ", value: "0.3%", prev: "-0.1%", trend: "up", next: "Feb 17, 2026" },
      { name: "BOJ Interest Rate", value: "0.50%", prev: "0.25%", trend: "up", next: "Mar 14, 2026" },
      { name: "China CPI YoY", value: "0.7%", prev: "0.4%", trend: "up", next: "Mar 9, 2026" },
    ],
  },
];

export default function MacroIndicatorsPage() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Macro Indicators</h1>
        </div>
        <p className="text-muted-foreground">
          Key macroeconomic indicators from major global economies, updated with latest releases and upcoming dates.
        </p>
      </div>

      {INDICATOR_GROUPS.map((group) => (
        <section key={group.category}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="inline-flex h-6 w-8 items-center justify-center rounded bg-muted text-xs font-bold">
              {group.flag}
            </span>
            {group.category}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Indicator</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Latest</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Previous</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Trend</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Next Release</th>
                </tr>
              </thead>
              <tbody>
                {group.indicators.map((ind) => (
                  <tr key={ind.name} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{ind.name}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{ind.value}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{ind.prev}</td>
                    <td className="px-4 py-3 text-center">
                      {ind.trend === "up" ? (
                        <TrendingUp className="inline h-4 w-4 text-green-500" />
                      ) : ind.trend === "down" ? (
                        <TrendingDown className="inline h-4 w-4 text-red-500" />
                      ) : (
                        <Minus className="inline h-4 w-4 text-yellow-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{ind.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
