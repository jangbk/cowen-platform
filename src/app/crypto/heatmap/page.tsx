"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Grid3X3, Clock, Loader2, RefreshCw } from "lucide-react";
import * as d3 from "d3";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
  total_volume: number;
  sector: string;
}

type Timeframe = "1h" | "24h" | "7d" | "30d";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getChangeForTimeframe(coin: CoinData, tf: Timeframe): number {
  switch (tf) {
    case "1h":
      return coin.price_change_percentage_1h_in_currency ?? 0;
    case "24h":
      return coin.price_change_percentage_24h ?? 0;
    case "7d":
      return coin.price_change_percentage_7d_in_currency ?? 0;
    case "30d":
      return coin.price_change_percentage_30d_in_currency ?? 0;
  }
}

function getHeatColor(change: number): string {
  // Interpolate between red and green
  const clamped = Math.max(-15, Math.min(15, change));
  if (clamped >= 0) {
    const t = clamped / 15;
    const r = Math.round(20 + (16 - 20) * t);
    const g = Math.round(20 + (185 - 20) * t);
    const b = Math.round(20 + (129 - 20) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = Math.abs(clamped) / 15;
    const r = Math.round(20 + (239 - 20) * t);
    const g = Math.round(20 + (68 - 20) * t);
    const b = Math.round(20 + (68 - 20) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CryptoHeatmapPage() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [hoveredCoin, setHoveredCoin] = useState<CoinData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/heatmap");
      const json = await res.json();
      if (json.data) {
        setCoins(json.data);
        setLastUpdated(new Date());
      }
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(400, entry.contentRect.width * 0.55),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const sectors = useMemo(() => {
    const set = new Set(coins.map((c) => c.sector));
    return ["All", ...Array.from(set).sort()];
  }, [coins]);

  const filteredCoins = useMemo(() => {
    let data = coins;
    if (sectorFilter !== "All") {
      data = data.filter((c) => c.sector === sectorFilter);
    }
    return data.filter((c) => c.market_cap > 0);
  }, [coins, sectorFilter]);

  // D3 treemap layout
  interface TreeNode {
    name?: string;
    children?: TreeNode[];
    value?: number;
    coinData?: CoinData;
  }

  const treemapNodes = useMemo(() => {
    if (filteredCoins.length === 0) return [];

    const hierarchyData: TreeNode = {
      name: "root",
      children: filteredCoins.map((c) => ({
        coinData: c,
        value: c.market_cap,
      })),
    };

    const root = d3
      .hierarchy(hierarchyData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const treemap = d3
      .treemap<TreeNode>()
      .size([dimensions.width, dimensions.height])
      .padding(2)
      .round(true);

    treemap(root);

    return root.leaves().map((leaf) => {
      const l = leaf as d3.HierarchyRectangularNode<TreeNode>;
      return {
        x0: l.x0,
        y0: l.y0,
        x1: l.x1,
        y1: l.y1,
        data: l.data.coinData!,
      };
    });
  }, [filteredCoins, dimensions]);

  const handleMouseMove = (e: React.MouseEvent, coin: CoinData) => {
    setHoveredCoin(coin);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 10,
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Grid3X3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Crypto Heatmap</h1>
        </div>
        <p className="text-muted-foreground">
          시가총액 기준 크기, 가격 변동률 기준 색상의 시각적 시장 개요
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {(["1h", "24h", "7d", "30d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "전체 섹터" : s}
            </option>
          ))}
        </select>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {lastUpdated
              ? `업데이트: ${lastUpdated.toLocaleTimeString("ko-KR")}`
              : "로딩 중..."}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground mr-2">변동률:</span>
        {[
          { label: "<-10%", color: getHeatColor(-12) },
          { label: "-5%", color: getHeatColor(-5) },
          { label: "-1%", color: getHeatColor(-1) },
          { label: "0%", color: "rgb(20,20,20)" },
          { label: "+1%", color: getHeatColor(1) },
          { label: "+5%", color: getHeatColor(5) },
          { label: ">+10%", color: getHeatColor(12) },
        ].map((item) => (
          <span
            key={item.label}
            className="rounded px-2 py-0.5 text-white"
            style={{ backgroundColor: item.color }}
          >
            {item.label}
          </span>
        ))}
      </div>

      {/* Heatmap */}
      <div
        ref={containerRef}
        className="relative rounded-lg border border-border bg-card overflow-hidden"
        style={{ minHeight: 400 }}
      >
        {loading && coins.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: dimensions.height }}>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="block"
          >
            {treemapNodes.map((node) => {
              const w = node.x1 - node.x0;
              const h = node.y1 - node.y0;
              const change = getChangeForTimeframe(node.data, timeframe);
              const color = getHeatColor(change);
              const showSymbol = w > 30 && h > 20;
              const showChange = w > 50 && h > 35;
              const showName = w > 80 && h > 50;

              return (
                <g
                  key={node.data.id}
                  onMouseMove={(e) => handleMouseMove(e, node.data)}
                  onMouseLeave={() => setHoveredCoin(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={node.x0}
                    y={node.y0}
                    width={w}
                    height={h}
                    fill={color}
                    rx={3}
                    className="transition-opacity hover:opacity-80"
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth={0.5}
                  />
                  {showSymbol && (
                    <text
                      x={node.x0 + w / 2}
                      y={node.y0 + h / 2 - (showChange ? 8 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={Math.min(w / 5, h / 3, 16)}
                      fontWeight="bold"
                    >
                      {node.data.symbol.toUpperCase()}
                    </text>
                  )}
                  {showChange && (
                    <text
                      x={node.x0 + w / 2}
                      y={node.y0 + h / 2 + 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.85)"
                      fontSize={Math.min(w / 7, h / 4, 12)}
                    >
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(1)}%
                    </text>
                  )}
                  {showName && h > 65 && (
                    <text
                      x={node.x0 + w / 2}
                      y={node.y0 + h / 2 + 22}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.6)"
                      fontSize={Math.min(w / 9, 10)}
                    >
                      {formatMarketCap(node.data.market_cap)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Tooltip */}
        {hoveredCoin && (
          <div
            className="absolute pointer-events-none z-10 rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-lg"
            style={{
              left: Math.min(tooltipPos.x, dimensions.width - 200),
              top: tooltipPos.y,
            }}
          >
            <p className="font-semibold text-sm">
              {hoveredCoin.name}{" "}
              <span className="text-muted-foreground uppercase">
                {hoveredCoin.symbol}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              가격: {formatPrice(hoveredCoin.current_price)}
            </p>
            <p className="text-xs text-muted-foreground">
              시총: {formatMarketCap(hoveredCoin.market_cap)}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              {(["1h", "24h", "7d", "30d"] as const).map((tf) => {
                const val = getChangeForTimeframe(hoveredCoin, tf);
                return (
                  <span
                    key={tf}
                    className={val >= 0 ? "text-green-400" : "text-red-400"}
                  >
                    {tf}: {val >= 0 ? "+" : ""}
                    {val.toFixed(2)}%
                  </span>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              섹터: {hoveredCoin.sector}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "표시 코인 수",
            value: `${filteredCoins.length}개`,
          },
          {
            label: "전체 시총",
            value: formatMarketCap(
              filteredCoins.reduce((s, c) => s + c.market_cap, 0)
            ),
          },
          {
            label: "상승 코인",
            value: `${filteredCoins.filter((c) => getChangeForTimeframe(c, timeframe) > 0).length}개`,
            color: "text-green-500",
          },
          {
            label: "하락 코인",
            value: `${filteredCoins.filter((c) => getChangeForTimeframe(c, timeframe) < 0).length}개`,
            color: "text-red-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4 text-center"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-lg font-bold mt-1 ${"color" in stat && stat.color ? stat.color : ""}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
