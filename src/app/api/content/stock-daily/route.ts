import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SheetRow {
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Google Sheets Published CSV → JSON parsing
// ---------------------------------------------------------------------------
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID || "";

const TAB_NAMES = [
  "상한가", "하한가", "급등락", "크로스", "경제일정",
  "US_급등락", "US_크로스", "US_경제일정",
];

function buildCsvUrl(sheetId: string, sheetName: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCsv(csv: string): SheetRow[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: SheetRow = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
let cache: { data: Record<string, SheetRow[]>; timestamp: number } | null =
  null;
const CACHE_TTL = 60 * 1000; // 60 seconds

// ---------------------------------------------------------------------------
// Sample data (when Google Sheets is not configured)
// ---------------------------------------------------------------------------
function getSampleData(): Record<string, SheetRow[]> {
  const today = new Date().toISOString().split("T")[0];
  return {
    상한가: [
      {
        날짜: today,
        종목코드: "005930",
        종목명: "삼성전자",
        시장: "KOSPI",
        종가: "72000",
        "등락률(%)": "29.7",
        거래량: "15234567",
        사유: "반도체 슈퍼사이클 기대감 + 외국인 대규모 매수",
      },
      {
        날짜: today,
        종목코드: "000660",
        종목명: "SK하이닉스",
        시장: "KOSPI",
        종가: "185000",
        "등락률(%)": "29.8",
        거래량: "8765432",
        사유: "HBM 수주 확대 + AI 서버 수요 급증",
      },
    ],
    하한가: [
      {
        날짜: today,
        종목코드: "123456",
        종목명: "테스트종목",
        시장: "KOSDAQ",
        종가: "5000",
        "등락률(%)": "-29.9",
        거래량: "2345678",
        사유: "실적 쇼크 + 대규모 유상증자 발표",
      },
    ],
    급등락: [
      {
        날짜: today,
        종목코드: "035720",
        종목명: "카카오",
        시장: "KOSPI",
        종가: "45000",
        "등락률(%)": "8.5",
        방향: "급등",
        거래량: "12345678",
        사유: "AI 서비스 매출 급증 호재",
      },
      {
        날짜: today,
        종목코드: "035420",
        종목명: "NAVER",
        시장: "KOSPI",
        종가: "210000",
        "등락률(%)": "-6.2",
        방향: "급락",
        거래량: "5678901",
        사유: "해외 사업 실적 부진 우려",
      },
      {
        날짜: today,
        종목코드: "373220",
        종목명: "LG에너지솔루션",
        시장: "KOSPI",
        종가: "380000",
        "등락률(%)": "7.1",
        방향: "급등",
        거래량: "3456789",
        사유: "미국 전기차 보조금 확대 수혜 기대",
      },
    ],
    크로스: [
      {
        날짜: today,
        종목코드: "005380",
        종목명: "현대차",
        시장: "KOSPI",
        유형: "골든크로스",
        단기MA: "235000",
        장기MA: "228000",
        종가: "240000",
      },
      {
        날짜: today,
        종목코드: "006400",
        종목명: "삼성SDI",
        시장: "KOSPI",
        유형: "데드크로스",
        단기MA: "410000",
        장기MA: "425000",
        종가: "405000",
      },
    ],
    경제일정: [
      {
        날짜: today,
        이벤트명: "한국은행 기준금리 결정",
        중요도: "상",
        예상영향: "기준금리 동결 전망. 부동산 시장 안정화 기조 유지",
        출처URL: "https://www.bok.or.kr",
      },
      {
        날짜: today,
        이벤트명: "미국 CPI 발표",
        중요도: "상",
        예상영향: "인플레이션 둔화 지속 시 금리 인하 기대감 상승",
        출처URL: "https://www.bls.gov",
      },
      {
        날짜: today,
        이벤트명: "중국 PMI 발표",
        중요도: "중",
        예상영향: "제조업 경기 회복 여부에 따라 수출주 영향",
        출처URL: "https://www.stats.gov.cn",
      },
    ],
    US_급등락: [
      {
        날짜: today,
        Ticker: "NVDA",
        종목명: "NVIDIA Corp",
        시장: "NASDAQ",
        종가: "875.50",
        "등락률(%)": "8.23",
        방향: "급등",
        거래량: "98765432",
        사유: "AI GPU demand surge + new Blackwell chip orders",
      },
      {
        날짜: today,
        Ticker: "TSLA",
        종목명: "Tesla Inc",
        시장: "NASDAQ",
        종가: "245.30",
        "등락률(%)": "-5.67",
        방향: "급락",
        거래량: "87654321",
        사유: "EV sales decline in Europe + margin pressure",
      },
      {
        날짜: today,
        Ticker: "AAPL",
        종목명: "Apple Inc",
        시장: "NASDAQ",
        종가: "198.75",
        "등락률(%)": "4.12",
        방향: "급등",
        거래량: "65432100",
        사유: "Vision Pro 2 announcement + strong iPhone sales",
      },
      {
        날짜: today,
        Ticker: "JPM",
        종목명: "JPMorgan Chase",
        시장: "NYSE",
        종가: "215.80",
        "등락률(%)": "3.45",
        방향: "급등",
        거래량: "21098765",
        사유: "Strong Q4 earnings beat + dividend increase",
      },
    ],
    US_크로스: [
      {
        날짜: today,
        Ticker: "NVDA",
        종목명: "NVIDIA Corp",
        시장: "NASDAQ",
        유형: "골든크로스",
        단기MA: "850.00",
        장기MA: "820.50",
        종가: "875.50",
      },
      {
        날짜: today,
        Ticker: "TSLA",
        종목명: "Tesla Inc",
        시장: "NASDAQ",
        유형: "데드크로스",
        단기MA: "252.30",
        장기MA: "248.10",
        종가: "245.30",
      },
      {
        날짜: today,
        Ticker: "AMD",
        종목명: "Advanced Micro Devices",
        시장: "NASDAQ",
        유형: "골든크로스",
        단기MA: "170.20",
        장기MA: "165.80",
        종가: "178.90",
      },
    ],
    US_경제일정: [
      {
        날짜: today,
        이벤트명: "FOMC Minutes Release",
        중요도: "상",
        예상영향: "Rate cut timing hints. Dovish tone → tech stock rally expected",
        출처URL: "https://www.federalreserve.gov",
      },
      {
        날짜: today,
        이벤트명: "US PCE Price Index",
        중요도: "상",
        예상영향: "Fed's preferred inflation gauge. Higher than expected → rate hike fears",
        출처URL: "https://www.bea.gov",
      },
      {
        날짜: today,
        이벤트명: "Initial Jobless Claims",
        중요도: "중",
        예상영향: "Weekly labor market health check. Rising claims → recession fears",
        출처URL: "https://www.dol.gov",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tab header validation (Google Sheets gviz returns first sheet data for
// non-existent tabs instead of an error — we detect this via required columns)
// ---------------------------------------------------------------------------
const REQUIRED_COLUMNS: Record<string, string> = {
  상한가: "종목코드",
  하한가: "종목코드",
  급등락: "종목코드",
  크로스: "종목코드",
  경제일정: "이벤트명",
  US_급등락: "Ticker",
  US_크로스: "Ticker",
  US_경제일정: "이벤트명",
};

// ---------------------------------------------------------------------------
// Fetch all tabs
// ---------------------------------------------------------------------------
async function fetchAllTabs(): Promise<Record<string, SheetRow[]>> {
  if (!SHEETS_ID) {
    return getSampleData();
  }

  const sampleData = getSampleData();
  const result: Record<string, SheetRow[]> = {};

  const fetches = TAB_NAMES.map(async (tabName) => {
    try {
      const url = buildCsvUrl(SHEETS_ID, tabName);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        console.error(`Failed to fetch tab ${tabName}: HTTP ${res.status}`);
        return { tabName, rows: [] };
      }
      const csv = await res.text();
      const rows = parseCsv(csv);

      // Validate: gviz silently returns first sheet for missing tabs
      const requiredCol = REQUIRED_COLUMNS[tabName];
      if (requiredCol && rows.length > 0 && !(requiredCol in rows[0])) {
        console.warn(`Tab "${tabName}" missing required column "${requiredCol}" — using sample data`);
        return { tabName, rows: sampleData[tabName] || [] };
      }

      return { tabName, rows };
    } catch (e) {
      console.error(
        `Error fetching tab ${tabName}:`,
        e instanceof Error ? e.message : e
      );
      return { tabName, rows: sampleData[tabName] || [] };
    }
  });

  const results = await Promise.all(fetches);
  for (const { tabName, rows } of results) {
    result[tabName] = rows;
  }

  return result;
}

// ---------------------------------------------------------------------------
// GET Handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        data: cache.data,
        cachedAt: cache.timestamp,
        fresh: false,
        source: SHEETS_ID ? "google-sheets" : "sample",
      });
    }

    const data = await fetchAllTabs();
    const now = Date.now();
    cache = { data, timestamp: now };

    return NextResponse.json({
      data,
      cachedAt: now,
      fresh: true,
      source: SHEETS_ID ? "google-sheets" : "sample",
    });
  } catch (error) {
    console.error("Stock daily API error:", error);

    if (cache) {
      return NextResponse.json({
        data: cache.data,
        cachedAt: cache.timestamp,
        fresh: false,
        source: "cache",
      });
    }

    return NextResponse.json({
      data: getSampleData(),
      cachedAt: Date.now(),
      fresh: false,
      source: "sample",
    });
  }
}
