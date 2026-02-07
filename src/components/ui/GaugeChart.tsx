"use client";

import { useMemo } from "react";

interface GaugeChartProps {
  value: number; // 0 to 1
  label: string;
  subMetrics?: Array<{ label: string; value: number; color: string }>;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-40",
  md: "w-56",
  lg: "w-72",
} as const;

/**
 * Semicircle gauge chart rendered with SVG.
 *
 * The arc sweeps from green (left, low risk) through yellow to red (right,
 * high risk). A needle animates to the position determined by `value`
 * (clamped 0-1). Sub-metrics are shown as colored dot labels below.
 */
export default function GaugeChart({
  value,
  label,
  subMetrics,
  size = "md",
}: GaugeChartProps) {
  const clamped = Math.max(0, Math.min(1, value));

  // The SVG viewBox is 200x120. The arc center is at (100, 100) with
  // radius 80. The arc spans from 180 degrees (left) to 0 degrees (right),
  // i.e. a full semicircle. The needle angle is interpolated linearly.
  const needleAngle = useMemo(() => {
    // 180 deg = value 0 (left, green), 0 deg = value 1 (right, red)
    const angleDeg = 180 - clamped * 180;
    const angleRad = (angleDeg * Math.PI) / 180;
    return { angleRad, angleDeg };
  }, [clamped]);

  const needleLength = 70;
  const cx = 100;
  const cy = 100;
  const needleX = cx + needleLength * Math.cos(needleAngle.angleRad);
  const needleY = cy - needleLength * Math.sin(needleAngle.angleRad);

  // Generate a unique gradient ID so multiple gauges on the same page don't
  // collide.
  const gradientId = useMemo(
    () => `gauge-grad-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  return (
    <div className={`flex flex-col items-center ${sizeMap[size]}`}>
      <div className="relative h-auto w-full">
        <svg
          viewBox="0 0 200 120"
          className="h-full w-full"
          aria-label={`${label}: ${value.toFixed(3)}`}
          role="img"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="25%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background track (subtle) */}
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Colored arc */}
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke="#1f2937"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="dark:stroke-white"
            style={{
              transition: "x2 0.6s cubic-bezier(0.4,0,0.2,1), y2 0.6s cubic-bezier(0.4,0,0.2,1)",
            }}
          />

          {/* Center dot */}
          <circle
            cx={cx}
            cy={cy}
            r="4"
            fill="#1f2937"
            className="dark:fill-white"
          />

          {/* Tick labels at 0 and 1 */}
          <text
            x="18"
            y="116"
            fontSize="9"
            fill="currentColor"
            opacity={0.4}
            textAnchor="middle"
          >
            0
          </text>
          <text
            x="182"
            y="116"
            fontSize="9"
            fill="currentColor"
            opacity={0.4}
            textAnchor="middle"
          >
            1
          </text>
        </svg>
      </div>

      {/* Value */}
      <span className="mt-1 text-2xl font-bold tabular-nums">
        {value.toFixed(3)}
      </span>

      {/* Label */}
      <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>

      {/* Sub-metrics */}
      {subMetrics && subMetrics.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {subMetrics.map((metric) => (
            <span key={metric.label} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}: {metric.value.toFixed(3)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
