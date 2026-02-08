import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/macro/recession-risk
// Calculates composite recession risk (0-1) from FRED data.
// Indicators used:
//   - SAHM Rule (SAHMREALTIME): real-time recession indicator
//   - Yield Curve spread (T10Y2Y): 10Y minus 2Y Treasury
//   - Unemployment Rate (UNRATE): level & trend
//   - Initial Jobless Claims (ICSA): labor market weakness
// Falls back to sample data if FRED_API_KEY is not set.
// ---------------------------------------------------------------------------

async function fetchFredLatest(
  apiKey: string,
  seriesId: string,
): Promise<number | null> {
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&sort_order=desc` +
      `&limit=5`;

    const res = await fetch(url, { next: { revalidate: 21600 } } as RequestInit);
    if (!res.ok) return null;

    const json = await res.json();
    const obs = json.observations?.find(
      (o: { value: string }) => o.value !== ".",
    );
    return obs ? parseFloat(obs.value) : null;
  } catch {
    return null;
  }
}

async function fetchFredTrend(
  apiKey: string,
  seriesId: string,
): Promise<{ current: number; previous: number; trend: number } | null> {
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&sort_order=desc` +
      `&limit=12`;

    const res = await fetch(url, { next: { revalidate: 21600 } } as RequestInit);
    if (!res.ok) return null;

    const json = await res.json();
    const values = (json.observations ?? [])
      .filter((o: { value: string }) => o.value !== ".")
      .map((o: { value: string }) => parseFloat(o.value));

    if (values.length < 2) return null;

    const current = values[0];
    const sixMonthAgo = values[Math.min(5, values.length - 1)];
    const trend = current - sixMonthAgo;

    return { current, previous: sixMonthAgo, trend };
  } catch {
    return null;
  }
}

export async function GET() {
  const fredKey = process.env.FRED_API_KEY;

  if (fredKey) {
    try {
      const [sahm, yieldCurve, unemployment, claims] = await Promise.all([
        fetchFredLatest(fredKey, "SAHMREALTIME"),
        fetchFredLatest(fredKey, "T10Y2Y"),
        fetchFredTrend(fredKey, "UNRATE"),
        fetchFredTrend(fredKey, "ICSA"),
      ]);

      // SAHM Rule risk: >= 0.5 triggers recession, normalize 0-1 range
      const sahmRisk =
        sahm !== null ? Math.max(0, Math.min(1, sahm / 1.0)) : null;

      // Yield Curve: negative = inverted = recessionary
      // -1.0 → risk 1.0, 0 → risk 0.5, +2.0 → risk 0
      const yieldRisk =
        yieldCurve !== null
          ? Math.max(0, Math.min(1, 0.5 - yieldCurve * 0.25))
          : null;

      // Unemployment: level risk + trend risk
      let employmentRisk: number | null = null;
      if (unemployment) {
        // Level: < 4% = low risk, > 6% = high risk
        const levelRisk = Math.max(
          0,
          Math.min(1, (unemployment.current - 3.5) / 3.5),
        );
        // Trend: rising = bad (positive trend means unemployment increasing)
        const trendRisk = Math.max(
          0,
          Math.min(1, unemployment.trend / 2.0),
        );
        employmentRisk = levelRisk * 0.6 + trendRisk * 0.4;
      }

      // Claims: > 300K = concerning, > 400K = recessionary
      let claimsRisk: number | null = null;
      if (claims) {
        claimsRisk = Math.max(
          0,
          Math.min(1, (claims.current - 200000) / 250000),
        );
      }

      // Composite with available indicators
      const components: { label: string; value: number; color: string }[] = [];
      const weights: number[] = [];
      const values: number[] = [];

      if (employmentRisk !== null) {
        components.push({
          label: "Employment",
          value: parseFloat(employmentRisk.toFixed(3)),
          color: "#3b82f6",
        });
        weights.push(0.3);
        values.push(employmentRisk);
      }

      if (yieldRisk !== null) {
        components.push({
          label: "Yield Curve",
          value: parseFloat(yieldRisk.toFixed(3)),
          color: "#ef4444",
        });
        weights.push(0.25);
        values.push(yieldRisk);
      }

      if (sahmRisk !== null) {
        components.push({
          label: "SAHM Rule",
          value: parseFloat(sahmRisk.toFixed(3)),
          color: "#f97316",
        });
        weights.push(0.25);
        values.push(sahmRisk);
      }

      if (claimsRisk !== null) {
        components.push({
          label: "Jobless Claims",
          value: parseFloat(claimsRisk.toFixed(3)),
          color: "#10b981",
        });
        weights.push(0.2);
        values.push(claimsRisk);
      }

      if (values.length > 0) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const composite =
          values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;

        return NextResponse.json(
          {
            source: "fred",
            risk: parseFloat(composite.toFixed(3)),
            components,
            details: {
              sahm: sahm?.toFixed(2) ?? null,
              yieldCurve: yieldCurve?.toFixed(2) ?? null,
              unemployment: unemployment?.current?.toFixed(1) ?? null,
              claims: claims?.current ?? null,
            },
          },
          {
            headers: {
              "Cache-Control":
                "public, s-maxage=21600, stale-while-revalidate=43200",
            },
          },
        );
      }
    } catch (error) {
      console.warn("[/api/macro/recession-risk] FRED fetch failed:", error);
    }
  }

  // Fallback sample data
  return NextResponse.json(
    {
      source: "sample",
      risk: 0.071,
      components: [
        { label: "Employment", value: 0.071, color: "#3b82f6" },
        { label: "Yield Curve", value: 0.12, color: "#ef4444" },
        { label: "SAHM Rule", value: 0.045, color: "#f97316" },
        { label: "Jobless Claims", value: 0.028, color: "#10b981" },
      ],
      details: {
        sahm: "0.05",
        yieldCurve: "0.15",
        unemployment: "4.1",
        claims: 215000,
      },
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=21600, stale-while-revalidate=43200",
      },
    },
  );
}
