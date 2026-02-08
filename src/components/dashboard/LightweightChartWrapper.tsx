"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import {
  createChart,
  LineSeries,
  AreaSeries,
  ColorType,
  PriceScaleMode,
} from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  DeepPartial,
  ChartOptions,
  SingleValueData,
  Time,
  CreatePriceLineOptions,
} from "lightweight-charts";

/**
 * Remove duplicate time entries (keep last value for each date)
 * and ensure data is sorted ascending. Lightweight Charts crashes on duplicates.
 */
function deduplicateAndSort(
  data: Array<{ time: string; value: number }>,
): Array<{ time: string; value: number }> {
  const map = new Map<string, { time: string; value: number }>();
  for (const d of data) {
    map.set(d.time, d); // last value wins
  }
  return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time));
}

export interface ChartPriceLine {
  price: number;
  color: string;
  title?: string;
  lineWidth?: number;
  lineStyle?: number; // 0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed
}

export interface OverlaySeries {
  data: Array<{ time: string; value: number }>;
  color: string;
  lineWidth?: number;
}

interface LightweightChartWrapperProps {
  data: Array<{ time: string; value: number }>;
  type?: "line" | "area";
  color?: string;
  height?: number;
  showGrid?: boolean;
  logarithmic?: boolean;
  className?: string;
  priceLines?: ChartPriceLine[];
  overlays?: OverlaySeries[];
}

/**
 * A wrapper component for TradingView's Lightweight Charts library.
 *
 * Supports line and area chart types, overlay series, automatic dark-mode
 * detection, logarithmic price scale, optional grid lines, and proper
 * cleanup on unmount.
 */
export default function LightweightChartWrapper({
  data,
  type = "line",
  color = "#2962FF",
  height = 300,
  showGrid = false,
  logarithmic = false,
  className,
  priceLines,
  overlays,
}: LightweightChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line" | "Area"> | null>(null);
  const overlaySeriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  // Deduplicate and sort data to prevent Lightweight Charts crash
  const cleanData = useMemo(() => deduplicateAndSort(data), [data]);

  /** Detect dark mode from the root <html> element's class list. */
  const isDarkMode = useCallback((): boolean => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  }, []);

  /** Build chart options that respect the current theme and props. */
  const buildOptions = useCallback((): DeepPartial<ChartOptions> => {
    const dark = isDarkMode();

    const background = dark
      ? { type: ColorType.Solid as const, color: "transparent" }
      : { type: ColorType.Solid as const, color: "transparent" };

    const textColor = dark
      ? "rgba(255, 255, 255, 0.6)"
      : "rgba(0, 0, 0, 0.6)";

    const gridColor = dark
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(0, 0, 0, 0.06)";

    return {
      layout: {
        background,
        textColor,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      },
      grid: {
        vertLines: {
          visible: showGrid,
          color: gridColor,
        },
        horzLines: {
          visible: showGrid,
          color: gridColor,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        mode: logarithmic
          ? PriceScaleMode.Logarithmic
          : PriceScaleMode.Normal,
      },
      timeScale: {
        borderVisible: false,
      },
      crosshair: {
        horzLine: {
          visible: true,
          labelVisible: true,
        },
        vertLine: {
          visible: true,
          labelVisible: true,
        },
      },
      autoSize: true,
    };
  }, [isDarkMode, showGrid, logarithmic]);

  // -----------------------------------------------------------------------
  // Create chart on mount, tear down on unmount.
  // -----------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      ...buildOptions(),
      width: container.clientWidth,
      height,
    });
    chartRef.current = chart;

    // Add series based on type.
    if (type === "area") {
      const series = chart.addSeries(AreaSeries, {
        lineColor: color,
        topColor: hexToRgba(color, 0.4),
        bottomColor: hexToRgba(color, 0),
        lineWidth: 2,
      });
      series.setData(cleanData as SingleValueData<Time>[]);
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
      });
      series.setData(cleanData as SingleValueData<Time>[]);
      seriesRef.current = series;
    }

    // Add horizontal price lines (colored band boundaries)
    if (priceLines && priceLines.length > 0 && seriesRef.current) {
      for (const pl of priceLines) {
        seriesRef.current.createPriceLine({
          price: pl.price,
          color: pl.color,
          lineWidth: (pl.lineWidth ?? 1) as CreatePriceLineOptions["lineWidth"],
          lineStyle: pl.lineStyle ?? 2, // dashed
          title: pl.title ?? "",
          axisLabelVisible: !!pl.title,
        } as CreatePriceLineOptions);
      }
    }

    chart.timeScale().fitContent();

    // Observe container resize as a fallback for autoSize.
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w } = entry.contentRect;
        if (w > 0) {
          chart.applyOptions({ width: w });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      overlaySeriesRefs.current = [];
    };
    // We intentionally only run this on mount/unmount. Data and option
    // changes are handled in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Update data + overlay series when they change.
  // -----------------------------------------------------------------------
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    // Update main series
    series.setData(cleanData as SingleValueData<Time>[]);

    // Remove old overlay series
    for (const os of overlaySeriesRefs.current) {
      try { chart.removeSeries(os); } catch { /* already removed */ }
    }
    overlaySeriesRefs.current = [];

    // Add new overlay series
    if (overlays && overlays.length > 0) {
      for (const overlay of overlays) {
        const od = deduplicateAndSort(overlay.data);
        if (od.length === 0) continue;
        const s = chart.addSeries(LineSeries, {
          color: overlay.color,
          lineWidth: (overlay.lineWidth ?? 1) as 1 | 2 | 3 | 4,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        s.setData(od as SingleValueData<Time>[]);
        overlaySeriesRefs.current.push(s);
      }
    }

    chart.timeScale().fitContent();
  }, [cleanData, overlays]);

  // -----------------------------------------------------------------------
  // Update chart options when relevant props change.
  // -----------------------------------------------------------------------
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions(buildOptions());
  }, [buildOptions]);

  // -----------------------------------------------------------------------
  // Update series options when color or type change.
  // -----------------------------------------------------------------------
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    if (type === "area") {
      series.applyOptions({
        lineColor: color,
        topColor: hexToRgba(color, 0.4),
        bottomColor: hexToRgba(color, 0),
      } as Record<string, unknown>);
    } else {
      series.applyOptions({ color } as Record<string, unknown>);
    }
  }, [color, type]);

  // -----------------------------------------------------------------------
  // Listen for theme changes (e.g. next-themes toggling the `dark` class).
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new MutationObserver(() => {
      const chart = chartRef.current;
      if (!chart) return;
      chart.applyOptions(buildOptions());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [buildOptions]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: `${height}px` }}
    />
  );
}

/**
 * Convert a hex colour string to an rgba() string with the given alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
