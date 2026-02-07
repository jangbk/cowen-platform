"use client";

import { useRef, useEffect, useCallback } from "react";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string; // defaults based on positive/negative trend
  className?: string;
}

/**
 * A minimal sparkline chart drawn on an HTML Canvas element.
 *
 * Automatically determines the line color based on the trend (green if the
 * last value is greater than or equal to the first, red otherwise) unless an
 * explicit `color` prop is provided.
 *
 * The area below the line is filled with a semi-transparent version of the
 * line color. No axes, labels, or grid lines are rendered.
 *
 * When `width` is not provided the canvas stretches to fill its container
 * width and redraws on resize via ResizeObserver.
 */
export default function SparklineChart({
  data,
  width,
  height = 32,
  color,
  className,
}: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedColor =
    color ??
    (data.length >= 2 && data[data.length - 1] >= data[0]
      ? "#10b981"
      : "#ef4444");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Device pixel ratio for crisp rendering on retina displays.
    const dpr = window.devicePixelRatio || 1;
    const drawWidth = width ?? containerRef.current?.clientWidth ?? 120;
    const drawHeight = height;

    canvas.width = drawWidth * dpr;
    canvas.height = drawHeight * dpr;
    canvas.style.width = `${drawWidth}px`;
    canvas.style.height = `${drawHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, drawWidth, drawHeight);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // avoid division by zero
    const padding = 2; // small vertical padding

    const effectiveHeight = drawHeight - padding * 2;
    const stepX = (drawWidth - 1) / (data.length - 1);

    // Compute points
    const points: Array<{ x: number; y: number }> = data.map((v, i) => ({
      x: i * stepX,
      y: padding + effectiveHeight - ((v - min) / range) * effectiveHeight,
    }));

    // Draw filled area under the line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    // Close the path along the bottom edge
    ctx.lineTo(points[points.length - 1].x, drawHeight);
    ctx.lineTo(points[0].x, drawHeight);
    ctx.closePath();

    ctx.fillStyle = hexToRgba(resolvedColor, 0.15);
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = resolvedColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }, [data, width, height, resolvedColor]);

  // Draw on mount and when dependencies change.
  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on container resize when no explicit width is set.
  useEffect(() => {
    if (width != null) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [width, draw]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: width != null ? `${width}px` : "100%",
        height: `${height}px`,
        lineHeight: 0,
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

/**
 * Convert a hex color string to an rgba() string with the given alpha.
 * Supports 3-character and 6-character hex codes (with or without #).
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
