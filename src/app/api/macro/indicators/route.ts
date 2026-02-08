import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/macro/indicators?indicator=unemployment|inflation|rgdp|fedfunds
// Fetches from FRED API if FRED_API_KEY is set, otherwise returns realistic
// sample data spanning ~5 years of monthly observations.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// FRED series mapping
// ---------------------------------------------------------------------------
const FRED_SERIES: Record<
  string,
  { seriesId: string; label: string; unit: string; frequency: string }
> = {
  unemployment: {
    seriesId: "UNRATE",
    label: "Unemployment Rate",
    unit: "%",
    frequency: "monthly",
  },
  inflation: {
    seriesId: "CPIAUCSL",
    label: "CPI (All Urban Consumers)",
    unit: "index",
    frequency: "monthly",
  },
  rgdp: {
    seriesId: "A191RL1Q225SBEA",
    label: "Real GDP Growth (Annualized)",
    unit: "%",
    frequency: "quarterly",
  },
  fedfunds: {
    seriesId: "FEDFUNDS",
    label: "Federal Funds Effective Rate",
    unit: "%",
    frequency: "monthly",
  },
  // Additional FRED series for chart pages
  t10y2y: {
    seriesId: "T10Y2Y",
    label: "10-Year minus 2-Year Treasury Spread",
    unit: "%",
    frequency: "daily",
  },
  t10y: {
    seriesId: "DGS10",
    label: "10-Year Treasury Yield",
    unit: "%",
    frequency: "daily",
  },
  breakeven: {
    seriesId: "T5YIE",
    label: "5-Year Breakeven Inflation Rate",
    unit: "%",
    frequency: "daily",
  },
  m2: {
    seriesId: "M2SL",
    label: "M2 Money Supply",
    unit: "B$",
    frequency: "monthly",
  },
  fedbalance: {
    seriesId: "WALCL",
    label: "Fed Total Assets (Balance Sheet)",
    unit: "M$",
    frequency: "weekly",
  },
  initialclaims: {
    seriesId: "ICSA",
    label: "Initial Jobless Claims",
    unit: "",
    frequency: "weekly",
  },
  nonfarm: {
    seriesId: "PAYEMS",
    label: "Total Nonfarm Payrolls",
    unit: "K",
    frequency: "monthly",
  },
  pce: {
    seriesId: "PCEPI",
    label: "PCE Price Index",
    unit: "index",
    frequency: "monthly",
  },
  dxy: {
    seriesId: "DTWEXBGS",
    label: "Trade Weighted US Dollar Index",
    unit: "index",
    frequency: "daily",
  },
  vix: {
    seriesId: "VIXCLS",
    label: "CBOE Volatility Index (VIX)",
    unit: "",
    frequency: "daily",
  },
  sp500: {
    seriesId: "SP500",
    label: "S&P 500 Index",
    unit: "",
    frequency: "daily",
  },
  nasdaq: {
    seriesId: "NASDAQCOM",
    label: "NASDAQ Composite Index",
    unit: "",
    frequency: "daily",
  },
  goldprice: {
    seriesId: "GOLDAMGBD228NLBM",
    label: "Gold Fixing Price (London)",
    unit: "$/oz",
    frequency: "daily",
  },
  silverprice: {
    seriesId: "SLVPRUSD",
    label: "Silver Fixing Price (London)",
    unit: "$/oz",
    frequency: "daily",
  },
  oilprice: {
    seriesId: "DCOILWTICO",
    label: "Crude Oil Prices: WTI",
    unit: "$/barrel",
    frequency: "daily",
  },
  cape: {
    seriesId: "MEHOINUSA672N",
    label: "Real Median Household Income",
    unit: "$",
    frequency: "annual",
  },
};

// ---------------------------------------------------------------------------
// Fetch from FRED
// ---------------------------------------------------------------------------
async function fetchFromFred(
  apiKey: string,
  seriesId: string,
): Promise<Array<{ date: string; value: string }> | null> {
  try {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const startDate = fiveYearsAgo.toISOString().split("T")[0];

    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&observation_start=${startDate}` +
      `&sort_order=asc`;

    const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) return null;

    const json = await res.json();
    return (json.observations ?? [])
      .filter((o: { value: string }) => o.value !== ".")
      .map((o: { date: string; value: string }) => ({
        date: o.date,
        value: o.value,
      }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sample data generators
// ---------------------------------------------------------------------------

function monthlyDates(years: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  const start = new Date(now.getFullYear() - years, now.getMonth(), 1);
  const cursor = new Date(start);
  while (cursor <= now) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return dates;
}

function quarterlyDates(years: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  const startYear = now.getFullYear() - years;
  for (let y = startYear; y <= now.getFullYear(); y++) {
    for (const m of [0, 3, 6, 9]) {
      const d = new Date(y, m, 1);
      if (d <= now) {
        dates.push(d.toISOString().split("T")[0]);
      }
    }
  }
  return dates;
}

function generateUnemployment(): Array<{ date: string; value: string }> {
  const dates = monthlyDates(5);
  // Narrative: ~3.5% in 2021, dipping to ~3.4% mid-2023, rising to ~4.2% by late 2025
  return dates.map((date, i) => {
    const t = i / dates.length;
    // U-shape: starts moderate, dips, then rises
    const base = 3.9;
    const dip = -0.5 * Math.sin(Math.PI * t * 1.2);
    const rise = 0.8 * Math.max(0, t - 0.6);
    const noise = Math.sin(i * 2.7) * 0.12;
    const value = Math.max(3.4, Math.min(4.5, base + dip + rise + noise));
    return { date, value: value.toFixed(1) };
  });
}

function generateInflation(): Array<{ date: string; value: string }> {
  const dates = monthlyDates(5);
  // Narrative: CPI index from ~270 in early 2021, surging through 2022 (YoY ~9%),
  // then moderating. We return YoY % change for usability.
  return dates.map((date, i) => {
    const t = i / dates.length;
    // Peak around t=0.3 (mid-2022), then decline
    const peak = 9.1 * Math.exp(-((t - 0.3) ** 2) / 0.02);
    const baseline = 2.5;
    const moderate = 1.5 * Math.exp(-((t - 0.5) ** 2) / 0.08);
    const noise = Math.sin(i * 1.9) * 0.15;
    const value = Math.max(2.0, Math.min(9.1, baseline + peak + moderate + noise));
    return { date, value: value.toFixed(1) };
  });
}

function generateRGDP(): Array<{ date: string; value: string }> {
  const dates = quarterlyDates(5);
  // Narrative: strong rebound in 2021 (5-6%), normalizing to 2-3%, occasional negative
  return dates.map((date, i) => {
    const t = i / dates.length;
    // High early, settling down
    const rebound = 5.0 * Math.exp(-3 * t);
    const baseline = 2.2;
    const cycle = 1.5 * Math.sin(2 * Math.PI * t * 2.5 + 0.5);
    const noise = Math.sin(i * 3.3) * 0.4;
    let value = baseline + rebound + cycle + noise;
    value = Math.max(-1.0, Math.min(6.0, value));
    return { date, value: value.toFixed(1) };
  });
}

function generateFedFunds(): Array<{ date: string; value: string }> {
  const dates = monthlyDates(5);
  // Narrative: ~0.08% in early 2021, hiking cycle from Mar 2022, peak ~5.33% mid-2023,
  // holding, then slight cuts in late 2024-2025
  return dates.map((date, i) => {
    const t = i / dates.length;
    let value: number;

    if (t < 0.2) {
      // Near-zero (early 2021 - early 2022)
      value = 0.08 + Math.sin(i * 0.5) * 0.02;
    } else if (t < 0.55) {
      // Hiking cycle (2022 - mid 2023)
      const hikeProg = (t - 0.2) / 0.35;
      value = 0.25 + hikeProg * 5.08;
    } else if (t < 0.82) {
      // Holding at peak (mid 2023 - late 2024)
      value = 5.33 + Math.sin(i * 0.8) * 0.04;
    } else {
      // Gradual cuts (late 2024 - 2025+)
      const cutProg = (t - 0.82) / 0.18;
      value = 5.33 - cutProg * 1.0;
    }

    value = Math.max(0.05, Math.min(5.5, value));
    return { date, value: value.toFixed(2) };
  });
}

// Generic sample generator for series without dedicated generators
function generateGenericSample(
  indicator: string,
  config: { frequency: string; unit: string },
): Array<{ date: string; value: string }> {
  const DEFAULTS: Record<string, { base: number; volatility: number }> = {
    t10y2y: { base: 0.5, volatility: 0.8 },
    t10y: { base: 4.0, volatility: 0.5 },
    breakeven: { base: 2.3, volatility: 0.3 },
    m2: { base: 21000, volatility: 300 },
    fedbalance: { base: 7500000, volatility: 200000 },
    initialclaims: { base: 220000, volatility: 15000 },
    nonfarm: { base: 157000, volatility: 500 },
    pce: { base: 125, volatility: 1.5 },
    dxy: { base: 103, volatility: 3 },
    vix: { base: 18, volatility: 5 },
    sp500: { base: 5200, volatility: 200 },
    nasdaq: { base: 16500, volatility: 600 },
    goldprice: { base: 2300, volatility: 80 },
    silverprice: { base: 28, volatility: 3 },
    oilprice: { base: 75, volatility: 8 },
    cape: { base: 75000, volatility: 2000 },
  };

  const preset = DEFAULTS[indicator] || { base: 100, volatility: 10 };
  const isDaily = config.frequency === "daily" || config.frequency === "weekly";
  const dates = isDaily ? dailyDates(3) : monthlyDates(5);

  let value = preset.base;
  return dates.map((date, i) => {
    const noise = Math.sin(i * 0.07 + indicator.length) * preset.volatility * 0.5 +
      Math.sin(i * 0.03 + indicator.length * 2) * preset.volatility * 0.3;
    value = preset.base + noise;
    return { date, value: value.toFixed(2) };
  });
}

function dailyDates(years: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  const start = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
  const cursor = new Date(start);
  while (cursor <= now) {
    // Skip weekends for financial data
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().split("T")[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

const SAMPLE_GENERATORS: Record<
  string,
  () => Array<{ date: string; value: string }>
> = {
  unemployment: generateUnemployment,
  inflation: generateInflation,
  rgdp: generateRGDP,
  fedfunds: generateFedFunds,
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const indicator = searchParams.get("indicator") ?? "unemployment";

  const config = FRED_SERIES[indicator];
  if (!config) {
    return NextResponse.json(
      {
        error: `Invalid indicator "${indicator}". Valid: unemployment, inflation, rgdp, fedfunds`,
      },
      { status: 400 },
    );
  }

  // Attempt FRED API
  const fredKey = process.env.FRED_API_KEY;
  if (fredKey) {
    const liveData = await fetchFromFred(fredKey, config.seriesId);
    if (liveData && liveData.length > 0) {
      return NextResponse.json(
        {
          source: "fred",
          indicator,
          label: config.label,
          unit: config.unit,
          frequency: config.frequency,
          seriesId: config.seriesId,
          data: liveData,
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=7200",
          },
        },
      );
    }
  }

  // Fallback: sample data
  const generator = SAMPLE_GENERATORS[indicator];
  const sampleData = generator ? generator() : generateGenericSample(indicator, config);

  return NextResponse.json(
    {
      source: "sample",
      indicator,
      label: config.label,
      unit: config.unit,
      frequency: config.frequency,
      seriesId: config.seriesId,
      data: sampleData,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    },
  );
}
