"use client";

interface CurveData {
  data: number[];
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
  fillOpacity?: number;
}

interface EquityCurveChartProps {
  curves: CurveData[];
  baseline?: number;
  spacing?: number;
  height?: string;
}

export default function EquityCurveChart({
  curves,
  baseline,
  spacing = 15,
  height = "h-56",
}: EquityCurveChartProps) {
  const allValues = curves.flatMap((c) => c.data);
  if (allValues.length === 0) return null;

  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  const range = maxVal - minVal || 1;
  const maxLen = Math.max(...curves.map((c) => c.data.length));
  const width = maxLen * spacing;

  const toY = (val: number) => 200 - ((val - minVal) / range) * 180 - 10;

  return (
    <div className={`${height} relative`}>
      <svg
        viewBox={`0 0 ${width} 200`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 50, 100, 150, 200].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke="currentColor"
            strokeOpacity="0.1"
          />
        ))}

        {/* Curves */}
        {curves.map((curve, idx) => {
          const pts = curve.data
            .map((val, i) => `${i * spacing},${toY(val)}`)
            .join(" ");
          return (
            <g key={idx}>
              <polyline
                fill="none"
                stroke={curve.color}
                strokeWidth={curve.strokeWidth ?? 2}
                strokeDasharray={curve.dashed ? "3 3" : undefined}
                points={pts}
              />
              {(curve.fillOpacity ?? (idx === 0 ? 0.1 : 0)) > 0 && (
                <polygon
                  fill={curve.color}
                  fillOpacity={curve.fillOpacity ?? 0.1}
                  points={`0,200 ${pts} ${(curve.data.length - 1) * spacing},200`}
                />
              )}
            </g>
          );
        })}

        {/* Baseline */}
        {baseline !== undefined && (
          <line
            x1="0"
            y1={toY(baseline)}
            x2={width}
            y2={toY(baseline)}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        )}
      </svg>
    </div>
  );
}
