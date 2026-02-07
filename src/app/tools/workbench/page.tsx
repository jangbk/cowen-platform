"use client";

import { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, GripVertical, X, Maximize2, RefreshCw, Loader2 } from "lucide-react";
import SparklineChart from "@/components/ui/SparklineChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Widget {
  id: string;
  name: string;
  category: string;
  value: string;
  change: string;
  sparkline: number[];
}

const WIDGET_TEMPLATES = [
  { id: "btc-price", name: "BTC 가격", category: "Price" },
  { id: "eth-price", name: "ETH 가격", category: "Price" },
  { id: "sol-price", name: "SOL 가격", category: "Price" },
  { id: "fear-greed", name: "Fear & Greed", category: "Sentiment" },
  { id: "btc-dominance", name: "BTC 도미넌스", category: "Market" },
  { id: "total-mcap", name: "전체 시총", category: "Market" },
  { id: "eth-gas", name: "ETH Gas", category: "Network" },
  { id: "funding-rate", name: "Funding Rate", category: "Derivatives" },
  { id: "dxy", name: "US Dollar Index", category: "Macro" },
  { id: "gold-price", name: "금 가격", category: "Macro" },
];

function generateSparkline(seed: number, points = 24): number[] {
  const data: number[] = [];
  let val = 50 + (seed % 30);
  for (let i = 0; i < points; i++) {
    val += Math.sin(i * 0.3 + seed) * 3 + (((seed * (i + 1) * 7) % 100) / 50 - 1) * 2;
    data.push(Math.max(10, val));
  }
  return data;
}

function getWidgetData(id: string): Omit<Widget, "id" | "name" | "category"> {
  const seed = id.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const data: Record<string, { value: string; change: string }> = {
    "btc-price": { value: "$98,420", change: "+2.41%" },
    "eth-price": { value: "$3,285", change: "-0.38%" },
    "sol-price": { value: "$198.50", change: "+2.15%" },
    "fear-greed": { value: "71", change: "Greed" },
    "btc-dominance": { value: "56.8%", change: "+0.3%" },
    "total-mcap": { value: "$3.42T", change: "+1.8%" },
    "eth-gas": { value: "24 gwei", change: "Low" },
    "funding-rate": { value: "0.012%", change: "Neutral" },
    "dxy": { value: "104.2", change: "-0.15%" },
    "gold-price": { value: "$2,042", change: "+0.42%" },
  };
  const d = data[id] || { value: "N/A", change: "N/A" };
  return { ...d, sparkline: generateSparkline(Math.abs(seed)) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WorkbenchPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load saved widgets or defaults
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("workbench-widgets") : null;
    if (saved) {
      try {
        const ids: string[] = JSON.parse(saved);
        const loaded = ids
          .map((id) => {
            const template = WIDGET_TEMPLATES.find((t) => t.id === id);
            if (!template) return null;
            return { ...template, ...getWidgetData(id) };
          })
          .filter(Boolean) as Widget[];
        setWidgets(loaded);
        return;
      } catch { /* fall through */ }
    }

    // Defaults
    const defaults = ["btc-price", "eth-price", "fear-greed", "btc-dominance", "total-mcap", "funding-rate"];
    setWidgets(
      defaults.map((id) => {
        const t = WIDGET_TEMPLATES.find((x) => x.id === id)!;
        return { ...t, ...getWidgetData(id) };
      })
    );
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem("workbench-widgets", JSON.stringify(widgets.map((w) => w.id)));
    }
  }, [widgets]);

  const addWidget = (id: string) => {
    if (widgets.some((w) => w.id === id)) return;
    const template = WIDGET_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setWidgets([...widgets, { ...template, ...getWidgetData(id) }]);
    setShowAddPanel(false);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
  };

  const refresh = useCallback(() => {
    setRefreshing(true);
    setWidgets((prev) =>
      prev.map((w) => ({ ...w, ...getWidgetData(w.id) }))
    );
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const availableWidgets = WIDGET_TEMPLATES.filter(
    (t) => !widgets.some((w) => w.id === t.id)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Workbench</h1>
          </div>
          <p className="text-muted-foreground">
            커스텀 워크스페이스 - 위젯을 추가/제거하여 대시보드 구성
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> 위젯 추가
          </button>
        </div>
      </div>

      {/* Add Widget Panel */}
      {showAddPanel && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">사용 가능한 위젯</h3>
            <button onClick={() => setShowAddPanel(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {availableWidgets.length === 0 ? (
            <p className="text-xs text-muted-foreground">모든 위젯이 추가되었습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableWidgets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => addWidget(w.id)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/50 transition-colors"
                >
                  <span className="font-medium">{w.name}</span>
                  <span className="ml-1 text-xs text-muted-foreground">({w.category})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="group rounded-lg border border-border bg-card transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm font-medium">{widget.name}</span>
                <span className="text-[10px] text-muted-foreground">({widget.category})</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="rounded p-1 hover:bg-muted" title="확장">
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-red-500"
                  title="제거"
                  onClick={() => removeWidget(widget.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="h-16 mb-3">
                <SparklineChart data={widget.sparkline} height={64} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{widget.value}</span>
                <span
                  className={`text-sm font-medium rounded-full px-2.5 py-0.5 ${
                    widget.change.startsWith("+")
                      ? "bg-green-500/10 text-green-500"
                      : widget.change.startsWith("-")
                      ? "bg-red-500/10 text-red-500"
                      : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  {widget.change}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Add Widget Placeholder */}
        <button
          onClick={() => setShowAddPanel(true)}
          className="rounded-lg border-2 border-dashed border-border p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors min-h-[180px]"
        >
          <Plus className="h-8 w-8" />
          <span className="text-sm font-medium">위젯 추가</span>
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        위젯 구성은 브라우저에 자동 저장됩니다.
      </p>
    </div>
  );
}
