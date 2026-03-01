"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertTriangle, Info, ChevronDown, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns";

// ---------------------------------------------------------------------------
// Indicator Guide Data
// ---------------------------------------------------------------------------
interface IndicatorGuide {
  why: string;
  bullish: string;
  bearish: string;
  cryptoImpact: string;
  investTip: string;
}

const INDICATOR_GUIDES: Record<string, IndicatorGuide> = {
  "US Non-Farm Payrolls": {
    why: "미국 비농업 부문 고용 변화를 측정하는 가장 중요한 고용 지표입니다. 경제 건전성과 소비 여력을 직접적으로 반영하며, 연준(Fed)의 금리 결정에 핵심적 영향을 미칩니다.",
    bullish: "예상보다 낮은 수치 → 연준 금리 인하 기대 상승 → 위험자산(주식/크립토) 강세, 달러 약세",
    bearish: "예상보다 높은 수치 → 연준 금리 인상/유지 기대 → 위험자산 약세, 달러 강세, 채권 금리 상승",
    cryptoImpact: "고용 약화 → 유동성 확대 기대 → BTC/ETH 상승 압력. 고용 강세 → 긴축 유지 → 크립토 하락 압력. NFP 발표 직후 15분간 높은 변동성 주의.",
    investTip: "발표 직전 포지션 축소 권장. 예상치와 실제치 차이(서프라이즈)의 방향과 크기가 핵심. 이전 달 수정치(Revised)도 반드시 확인하세요.",
  },
  "US Unemployment Rate": {
    why: "미국 전체 노동인구 대비 실업자 비율입니다. 연준의 이중 목표(물가 안정 + 최대 고용) 중 하나로, 금리 정책의 핵심 근거가 됩니다.",
    bullish: "예상보다 높은 실업률 → 경기 둔화 시그널 → 연준 완화적 정책 기대 → 위험자산 단기 상승 가능",
    bearish: "예상보다 낮은 실업률 → 과열 노동시장 → 임금 인플레이션 우려 → 긴축 지속 → 위험자산 약세",
    cryptoImpact: "실업률 상승은 단기적으로 크립토에 긍정적(유동성 기대)이나, 심각한 경기침체 시 위험회피로 매도 압력 증가. 골디락스(적정 수준) 유지가 가장 이상적.",
    investTip: "실업률 단독보다 NFP와 함께 해석해야 합니다. U-6(광의실업률)과 경제활동참가율도 함께 체크하세요.",
  },
  "US ISM Non-Manufacturing PMI": {
    why: "미국 서비스업 부문의 경기 확장/수축을 측정합니다. 미국 GDP의 약 80%가 서비스업이므로, 전체 경제 방향을 가장 잘 반영하는 선행지표 중 하나입니다.",
    bullish: "50 이상이면 확장, 예상 상회 시 → 경기 회복 신호 → 기업 실적 기대 상승 → 주식 강세",
    bearish: "50 이하이면 수축, 예상 하회 시 → 경기 둔화 시그널 → 위험 회피 → 안전자산 선호",
    cryptoImpact: "서비스업 PMI 확장은 리스크온 환경 → 크립토 강세. 50 이하 진입 시 경기침체 공포로 크립토 급락 가능. 고용 하위지수와 가격지수 항목 주목.",
    investTip: "하위 구성요소(New Orders, Employment, Prices)를 세분화하여 해석하면 더 정확한 방향 판단이 가능합니다.",
  },
  "China CPI YoY": {
    why: "중국 소비자물가지수 전년대비 변화율입니다. 세계 2위 경제대국의 소비 수요와 디플레이션/인플레이션 추세를 보여주는 핵심 지표입니다.",
    bullish: "CPI 상승(디플레 탈출) → 중국 경기 회복 시그널 → 원자재/이머징 자산 강세 → 글로벌 리스크온",
    bearish: "CPI 하락/디플레이션 지속 → 중국 내수 부진 → 글로벌 성장 둔화 우려 → 원자재/이머징 약세",
    cryptoImpact: "중국 경기 회복은 글로벌 유동성 증가 → BTC 간접적 상승 요인. 디플레이션 심화 시 위안화 약세 → 중국 자본 유출 → 과거 BTC 수요 증가 사례 존재.",
    investTip: "PPI(생산자물가)와 함께 해석하세요. CPI↑ + PPI↑ 동반 상승은 진정한 수요 회복, CPI↓ + PPI↓는 디플레이션 위험 신호.",
  },
  "US Wholesale Inventories": {
    why: "미국 도매업 재고 변화를 측정합니다. 기업의 재고 적체 또는 감소를 통해 향후 생산 활동과 GDP 기여도를 예측하는 데 사용됩니다.",
    bullish: "재고 감소 → 수요 대비 공급 부족 → 향후 생산 증가 기대 → 경제 성장 긍정적",
    bearish: "재고 급증 → 수요 부진/과잉 생산 → 향후 생산 감축 가능 → 경제 둔화 시그널",
    cryptoImpact: "직접적 영향은 제한적이나, GDP 추정치 변경에 영향을 미쳐 간접적으로 시장 심리에 반영됩니다.",
    investTip: "Low Impact 지표지만 GDP 확정치 예측에 유용합니다. 재고/매출 비율(I/S ratio) 추세를 함께 보세요.",
  },
  "UK GDP QoQ": {
    why: "영국 국내총생산 분기 대비 성장률입니다. 영국 경제의 전반적 건강 상태를 측정하며, 영란은행(BoE) 금리 결정의 핵심 근거입니다.",
    bullish: "예상 상회 → 영국 경기 회복 → 파운드 강세 → 유럽 경제 회복 기대 → 글로벌 리스크온",
    bearish: "예상 하회/마이너스 → 경기침체 우려 → 파운드 약세 → BoE 금리 인하 기대 → 글로벌 불확실성",
    cryptoImpact: "직접적 영향은 제한적이나, 글로벌 경기침체 우려 확산 시 위험자산 전반에 매도 압력. 영국 발 금융 불안은 2022년 LDI 위기처럼 크립토에도 전이 가능.",
    investTip: "분기 GDP보다 월간 GDP 추세를 함께 봐야 정확합니다. 서비스업/제조업 구성 비중 변화에 주목하세요.",
  },
  "US CPI YoY": {
    why: "미국 소비자물가지수 전년대비 변화율로, 인플레이션의 가장 대표적인 지표입니다. 연준의 금리 결정에 가장 직접적인 영향을 미치며, 모든 자산시장을 움직이는 핵심 지표입니다.",
    bullish: "예상보다 낮은 CPI → 인플레이션 둔화 → 연준 금리 인하 기대 → 주식/크립토/채권 동반 상승, 달러 약세",
    bearish: "예상보다 높은 CPI → 인플레이션 재가속 → 금리 인상 또는 장기 유지 → 모든 위험자산 급락, 달러 급등",
    cryptoImpact: "CPI는 크립토 시장에 가장 큰 영향을 미치는 매크로 지표. CPI 하락 → BTC 수천 달러 상승 사례 다수. CPI 상승 서프라이즈 → BTC 즉시 5~10% 급락 가능. 발표 직후 1시간 내 방향 결정.",
    investTip: "헤드라인 CPI보다 Core CPI(식품·에너지 제외)가 연준 정책에 더 중요합니다. 전월비(MoM) 추세가 연율화하면 향후 방향을 예측하기 쉽습니다. CPI 발표일은 포지션 관리 필수.",
  },
  "US Core CPI MoM": {
    why: "변동성이 큰 식품과 에너지를 제외한 근원 소비자물가의 월간 변화율입니다. 연준이 가장 주목하는 인플레이션 지표로, 기저 인플레이션 추세를 정확히 파악할 수 있습니다.",
    bullish: "0.2% 이하 → 연율 약 2.4% 수준 → 연준 목표(2%)에 근접 → 금리 인하 가속 기대 → 강한 리스크온",
    bearish: "0.3% 이상 → 연율 3.6%+ → 인플레이션 고착화 우려 → 금리 장기 고수준 유지 → 리스크오프",
    cryptoImpact: "Core CPI MoM이 0.1% 차이로도 시장이 크게 반응합니다. 0.2% vs 0.3%의 차이가 BTC $3,000~5,000 움직임을 만들 수 있음. 연율환산(annualized) 계산이 핵심.",
    investTip: "MoM 수치를 x12로 연율화하여 추세를 확인하세요. 3개월 평균 Core CPI MoM이 가장 신뢰도 높은 추세 지표. Shelter(주거비) 항목이 현재 가장 큰 변수.",
  },
  "US PPI YoY": {
    why: "생산자물가지수 전년대비 변화율로, 기업이 받는 가격 변화를 측정합니다. CPI의 선행지표 역할을 하며, 기업 마진과 향후 소비자물가 방향을 예측하는 데 사용됩니다.",
    bullish: "PPI 하락 → 기업 투입비용 감소 → 마진 개선 + 향후 CPI 하락 기대 → 주식/크립토 강세",
    bearish: "PPI 상승 → 비용 상승 → 기업이 가격 전가 → 향후 CPI 상승 가능 → 긴축 장기화 우려",
    cryptoImpact: "CPI보다 직접적 영향은 적으나, CPI 전일 발표 시 선행 시그널로 작용. PPI 하락 추세 지속은 중기적 크립토 강세 환경 조성.",
    investTip: "PPI → CPI 파이프라인을 이해하세요. PPI 하락이 3~6개월 후 CPI 하락으로 이어지는 경향. Core PPI(식품·에너지·무역 제외)가 가장 순수한 추세를 보여줍니다.",
  },
  "US Initial Jobless Claims": {
    why: "매주 발표되는 신규 실업수당 청구건수로, 노동시장의 실시간 건강 상태를 보여주는 고빈도 지표입니다. 경기 전환점을 가장 빠르게 포착할 수 있습니다.",
    bullish: "청구건수 감소 → 노동시장 안정 → 소비 지속 기대 → 경기 연착륙 시나리오 강화",
    bearish: "청구건수 급증(30만+ 지속) → 대량 해고 시작 → 경기침체 시그널 → 위험 회피 확대",
    cryptoImpact: "주간 지표이므로 개별 발표의 크립토 영향은 제한적. 다만 4주 이동평균이 추세적으로 상승하면 경기침체 공포로 크립토 하락 압력 증가.",
    investTip: "단일 주 데이터보다 4주 이동평균 추세가 중요합니다. 계절 조정 요인(연말, 허리케인 등)에 의한 일시적 급등을 구분해야 합니다.",
  },
  "US Retail Sales MoM": {
    why: "미국 소매 판매 월간 변화율로, GDP의 약 70%를 차지하는 소비 지출의 핵심 지표입니다. 미국 경제의 엔진인 소비자 지출 강도를 직접 측정합니다.",
    bullish: "예상 상회 → 소비 강세 → 경기 확장 지속 → 기업 매출 증가 기대 → 주식 강세",
    bearish: "예상 하회/마이너스 → 소비 위축 → 경기 둔화 우려 → 기업 실적 하향 → 위험자산 약세",
    cryptoImpact: "소비 강세는 양날의 검: 경제 강세 → 리스크온이지만, 소비 과열 → 인플레이션 → 긴축 지속 우려. 연준 정책 방향과 연결하여 해석 필요.",
    investTip: "자동차 제외(ex-Auto) 수치가 더 순수한 소비 추세를 보여줍니다. Control Group(자동차, 가솔린, 건축자재, 식품서비스 제외)이 GDP 추정에 직접 사용됩니다.",
  },
  "US Industrial Production MoM": {
    why: "미국 제조업, 광업, 유틸리티 부문의 월간 생산량 변화를 측정합니다. 경기 사이클의 전환점을 포착하는 데 유용하며, 설비가동률과 함께 발표됩니다.",
    bullish: "생산 증가 → 수요 회복 → 제조업 사이클 반등 → 산업재/원자재 강세",
    bearish: "생산 감소 → 수요 부진 → 제조업 침체 지속 → 경기 하방 압력",
    cryptoImpact: "직접적 크립토 영향은 제한적이나, 설비가동률이 80%를 넘으면 인플레이션 압력으로 해석되어 간접적으로 긴축 기대 강화.",
    investTip: "설비가동률(Capacity Utilization)과 함께 해석하세요. 가동률 80% 이상은 인플레이션 압력, 75% 이하는 경기 부진 시그널.",
  },
};

// Fallback static events (used when API is unavailable)
const FALLBACK_EVENTS = [
  { date: "2026-02-07", time: "08:30", event: "US Non-Farm Payrolls", actual: "216K", forecast: "185K", previous: "256K", impact: "high", country: "US" },
  { date: "2026-02-07", time: "08:30", event: "US Unemployment Rate", actual: "3.9%", forecast: "4.0%", previous: "3.8%", impact: "high", country: "US" },
  { date: "2026-02-07", time: "10:00", event: "US ISM Non-Manufacturing PMI", actual: "", forecast: "53.5", previous: "54.1", impact: "medium", country: "US" },
  { date: "2026-02-10", time: "02:00", event: "China CPI YoY", actual: "", forecast: "0.8%", previous: "0.7%", impact: "medium", country: "CN" },
  { date: "2026-02-10", time: "10:00", event: "US Wholesale Inventories", actual: "", forecast: "0.2%", previous: "0.2%", impact: "low", country: "US" },
  { date: "2026-02-11", time: "05:00", event: "UK GDP QoQ", actual: "", forecast: "0.2%", previous: "0.1%", impact: "high", country: "UK" },
  { date: "2026-02-12", time: "08:30", event: "US CPI YoY", actual: "", forecast: "3.0%", previous: "3.1%", impact: "high", country: "US" },
  { date: "2026-02-12", time: "08:30", event: "US Core CPI MoM", actual: "", forecast: "0.2%", previous: "0.3%", impact: "high", country: "US" },
  { date: "2026-02-13", time: "08:30", event: "US PPI YoY", actual: "", forecast: "1.8%", previous: "1.9%", impact: "medium", country: "US" },
  { date: "2026-02-13", time: "08:30", event: "US Initial Jobless Claims", actual: "", forecast: "220K", previous: "218K", impact: "medium", country: "US" },
  { date: "2026-02-14", time: "08:30", event: "US Retail Sales MoM", actual: "", forecast: "0.3%", previous: "-0.1%", impact: "high", country: "US" },
  { date: "2026-02-14", time: "09:15", event: "US Industrial Production MoM", actual: "", forecast: "0.2%", previous: "0.1%", impact: "medium", country: "US" },
];

// Map ForexFactory event names to our indicator guide keys
const EVENT_NAME_MAP: Record<string, string> = {
  "Non-Farm Employment Change": "US Non-Farm Payrolls",
  "Nonfarm Payrolls": "US Non-Farm Payrolls",
  "Unemployment Rate": "US Unemployment Rate",
  "ISM Non-Manufacturing PMI": "US ISM Non-Manufacturing PMI",
  "ISM Services PMI": "US ISM Non-Manufacturing PMI",
  "CPI y/y": "US CPI YoY",
  "CPI m/m": "US CPI YoY",
  "Core CPI m/m": "US Core CPI MoM",
  "PPI y/y": "US PPI YoY",
  "PPI m/m": "US PPI YoY",
  "Unemployment Claims": "US Initial Jobless Claims",
  "Retail Sales m/m": "US Retail Sales MoM",
  "Core Retail Sales m/m": "US Retail Sales MoM",
  "Industrial Production m/m": "US Industrial Production MoM",
  "FOMC Statement": "FOMC 의사록",
  "Federal Funds Rate": "FOMC 의사록",
};

// Analyze actual vs forecast
function analyzeResult(event: CalendarEvent): { label: string; color: string } | null {
  if (!event.actual) return null;
  const parseNum = (s: string) => parseFloat(s.replace(/[%K]/g, ""));
  const actual = parseNum(event.actual);
  const forecast = parseNum(event.forecast);
  if (isNaN(actual) || isNaN(forecast)) return null;

  const diff = actual - forecast;
  const threshold = Math.abs(forecast) * 0.02;

  if (Math.abs(diff) <= threshold) return { label: "예상 부합", color: "text-muted-foreground" };
  if (diff > 0) return { label: "예상 상회", color: "text-green-500" };
  return { label: "예상 하회", color: "text-red-500" };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarEvent {
  date: string;
  time: string;
  event: string;
  actual: string;
  forecast: string;
  previous: string;
  impact: string;
  country: string;
}

export default function MacroCalendarPage() {
  const [impactFilter, setImpactFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>(FALLBACK_EVENTS);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [isLoading, setIsLoading] = useState(true);

  // Week range based on weekOffset
  const weekStart = useMemo(() => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), [weekOffset]);
  const weekLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const res = await fetch("/api/macro/calendar");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();

        if (json.events && json.events.length > 0) {
          const mapped: CalendarEvent[] = json.events.map((e: { name: string; date: string; time?: string; prev: string; forecast: string; importance: string; country: string }) => {
            const mappedName = EVENT_NAME_MAP[e.name] || e.name;
            return {
              date: e.date,
              time: e.time || "00:00",
              event: mappedName,
              actual: "",
              forecast: e.forecast || "-",
              previous: e.prev || "-",
              impact: e.importance,
              country: e.country,
            };
          });

          setEvents(mapped);
          setDataSource(json.source === "forexfactory" ? "ForexFactory (실시간)" : "sample");
        } else {
          setDataSource("fallback");
        }
      } catch {
        setDataSource("fallback");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCalendar();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (impactFilter !== "all" && e.impact !== impactFilter) return false;
    if (countryFilter !== "all" && e.country !== countryFilter) return false;
    // Filter by week range
    const eventDate = new Date(e.date + "T00:00:00");
    if (eventDate < weekStart || eventDate > weekEnd) return false;
    return true;
  });

  const groupedEvents: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach((event) => {
    if (!groupedEvents[event.date]) groupedEvents[event.date] = [];
    groupedEvents[event.date].push(event);
  });

  const toggleExpand = (key: string) => {
    setExpandedEvent(expandedEvent === key ? null : key);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Economic Calendar</h1>
        </div>
        <p className="text-muted-foreground">
          주요 거시경제 지표 발표 일정 — 예측치, 실제치, 시장 영향도, 투자 가이드 제공
        </p>
        <div className="flex items-center gap-2 mt-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" /> 데이터 로딩 중...
            </span>
          ) : dataSource.includes("ForexFactory") ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> {dataSource}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> 정적 데이터 (ForexFactory 연결 대기)
            </span>
          )}
        </div>
      </div>

      {/* Usage Guide */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            경제 캘린더 사용법 및 해석 가이드
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </button>
        {showGuide && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Actual / Forecast / Previous 읽는 법</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Forecast(예측치)</strong>: 시장 컨센서스. 이미 현재 가격에 반영되어 있습니다.</li>
                <li><strong>Actual(실제치)</strong>: 실제 발표 값. <strong>예측치 대비 서프라이즈(차이)</strong>가 시장을 움직이는 핵심입니다.</li>
                <li><strong>Previous(이전치)</strong>: 직전 발표 값. 이전치 수정(Revised)도 시장에 영향을 줍니다.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">서프라이즈 해석 원칙</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-md border border-green-500/20 bg-green-500/5 p-2.5">
                  <p className="text-xs font-bold text-green-500 mb-1">Actual &gt; Forecast (상회)</p>
                  <p className="text-[10px]">경제가 예상보다 강함. 성장 지표는 긍정적, 인플레이션 지표는 부정적(긴축 우려)으로 해석.</p>
                </div>
                <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2.5">
                  <p className="text-xs font-bold text-red-500 mb-1">Actual &lt; Forecast (하회)</p>
                  <p className="text-[10px]">경제가 예상보다 약함. 성장 지표는 부정적, 인플레이션 지표는 긍정적(완화 기대)으로 해석.</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Impact 등급</h4>
              <div className="flex gap-4 text-xs mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">{[1,2,3].map(n => <span key={n} className="h-2 w-2 rounded-full bg-red-500" />)}</span>
                  <strong>High</strong>: 시장 큰 변동 예상
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">{[1,2].map(n => <span key={n} className="h-2 w-2 rounded-full bg-yellow-500" />)}<span className="h-2 w-2 rounded-full bg-muted" /></span>
                  <strong>Medium</strong>: 중간 영향
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5"><span className="h-2 w-2 rounded-full bg-green-500" />{[1,2].map(n => <span key={n} className="h-2 w-2 rounded-full bg-muted" />)}</span>
                  <strong>Low</strong>: 제한적 영향
                </span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">각 이벤트 행을 클릭하면?</h4>
              <p>해당 지표의 <strong>중요한 이유, 시장 영향(강세/약세), 크립토 영향, 투자 팁</strong>을 확인할 수 있습니다.</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium min-w-[180px] text-center">{weekLabel}</span>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
        </div>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
            이번 주
          </button>
        )}
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {["all", "high", "medium", "low"].map((level) => (
            <button
              key={level}
              onClick={() => setImpactFilter(level)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                impactFilter === level ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {level === "all" ? "All Impact" : level}
            </button>
          ))}
        </div>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="all">All Countries</option>
          <option value="US">United States</option>
          <option value="EU">Eurozone</option>
          <option value="UK">United Kingdom</option>
          <option value="CN">China</option>
          <option value="JP">Japan</option>
        </select>
      </div>

      {/* Calendar Events */}
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, events]) => {
          const d = new Date(date + "T00:00:00");
          const dayName = WEEKDAYS[d.getDay()];
          const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const today = new Date().toISOString().split("T")[0];
          const isToday = date === today;

          return (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                  {dayName}, {dateStr}
                  {isToday && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Today</span>}
                </h3>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-16">Time</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground w-12"></th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Event</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground w-16">Impact</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Actual</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Forecast</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Previous</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event, idx) => {
                      const eventKey = `${date}-${idx}`;
                      const isExpanded = expandedEvent === eventKey;
                      const guide = INDICATOR_GUIDES[event.event];
                      const result = analyzeResult(event);

                      return (
                        <>
                          <tr
                            key={eventKey}
                            onClick={() => guide && toggleExpand(eventKey)}
                            className={`border-b border-border last:border-0 transition-colors ${
                              guide ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/30"
                            } ${isExpanded ? "bg-muted/20" : ""}`}
                          >
                            <td className="px-4 py-2.5 text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {event.time}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex h-5 w-7 items-center justify-center rounded bg-muted text-[10px] font-bold">
                                {event.country}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{event.event}</span>
                                {guide && (
                                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                )}
                                {result && (
                                  <span className={`text-[10px] font-medium ${result.color}`}>
                                    {result.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex justify-center gap-0.5">
                                {[1, 2, 3].map((n) => (
                                  <div
                                    key={n}
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      n <= (event.impact === "high" ? 3 : event.impact === "medium" ? 2 : 1)
                                        ? event.impact === "high" ? "bg-red-500" : event.impact === "medium" ? "bg-yellow-500" : "bg-green-500"
                                        : "bg-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono font-semibold ${event.actual ? "text-foreground" : "text-muted-foreground"}`}>
                              {event.actual || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{event.forecast}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{event.previous}</td>
                          </tr>
                          {isExpanded && guide && (
                            <tr key={`${eventKey}-detail`} className="border-b border-border last:border-0">
                              <td colSpan={7} className="px-4 py-4 bg-muted/10">
                                <div className="space-y-3 max-w-4xl">
                                  {/* Why Important */}
                                  <div className="flex gap-3">
                                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-semibold text-foreground mb-0.5">이 지표가 중요한 이유</p>
                                      <p className="text-xs text-muted-foreground">{guide.why}</p>
                                    </div>
                                  </div>

                                  {/* Bullish / Bearish */}
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                        <p className="text-xs font-bold text-green-500">강세 시나리오</p>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">{guide.bullish}</p>
                                    </div>
                                    <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                                        <p className="text-xs font-bold text-red-500">약세 시나리오</p>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">{guide.bearish}</p>
                                    </div>
                                  </div>

                                  {/* Crypto Impact */}
                                  <div className="rounded-md border border-orange-500/20 bg-orange-500/5 p-3">
                                    <p className="text-xs font-bold text-orange-500 mb-1">크립토 시장 영향</p>
                                    <p className="text-[11px] text-muted-foreground">{guide.cryptoImpact}</p>
                                  </div>

                                  {/* Investment Tip */}
                                  <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                                    <p className="text-xs font-bold text-blue-500 mb-1">투자 가이드</p>
                                    <p className="text-[11px] text-muted-foreground">{guide.investTip}</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimers */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li>
            현재 경제 일정은 <strong>수동 업데이트 데이터</strong>입니다. 실제 발표 시간 및 수치는 공식 출처(BLS, Fed, ECB 등)에서 확인하세요.
          </li>
          <li>
            시장 반응은 단일 지표가 아닌 <strong>복합적 맥락</strong>(다른 지표, 연준 발언, 지정학적 이벤트)에 의해 결정됩니다.
          </li>
          <li>
            <strong>지표 발표 직후 높은 변동성</strong>이 발생합니다. 레버리지 포지션은 발표 전 축소를 권장합니다.
          </li>
          <li>
            본 가이드는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이 아닙니다. 투자 결정은 본인 책임입니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
