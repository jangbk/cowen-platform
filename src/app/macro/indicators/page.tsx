"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Globe, TrendingUp, TrendingDown, Minus, Loader2, Info,
  BarChart3, Shield, Lightbulb, AlertTriangle, Activity,
} from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MacroIndicator {
  name: string;
  value: number;
  displayValue: string;
  prev: number;
  displayPrev: string;
  trend: "up" | "down" | "flat";
  trendDirection: "positive" | "negative" | "neutral"; // up=good or up=bad?
  risk: number; // 0-1
  status: "healthy" | "caution" | "warning" | "danger";
  category: "growth" | "inflation" | "labor" | "rates" | "market";
  description: string;
  source: string;
  freshness: "daily" | "weekly" | "monthly" | "quarterly";
}

interface RecessionRisk {
  risk: number;
  components: { label: string; value: number; color: string }[];
  details: Record<string, string | number | null>;
  source: string;
}

const statusColor = {
  healthy: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  caution: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" },
  warning: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/30" },
  danger: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
};

const freshnessLabel: Record<string, string> = {
  daily: "일간",
  weekly: "주간",
  monthly: "월간",
  quarterly: "분기",
};

// ---------------------------------------------------------------------------
// Helpers: extract latest/previous from FRED-style data
// ---------------------------------------------------------------------------
function getLatestTwo(data: { date: string; value: string }[]): { latest: number; prev: number } | null {
  if (!data || data.length < 2) return null;
  const latest = parseFloat(data[data.length - 1].value);
  const prev = parseFloat(data[data.length - 2].value);
  if (isNaN(latest) || isNaN(prev)) return null;
  return { latest, prev };
}

function getYoYChange(data: { date: string; value: string }[]): { current: number; yoy: number } | null {
  if (!data || data.length < 13) return null;
  const current = parseFloat(data[data.length - 1].value);
  const yearAgo = parseFloat(data[data.length - 13].value);
  if (isNaN(current) || isNaN(yearAgo) || yearAgo === 0) return null;
  return { current, yoy: ((current - yearAgo) / yearAgo) * 100 };
}

// ---------------------------------------------------------------------------
// Dynamic Analysis Generator
// ---------------------------------------------------------------------------
function generateMacroAnalysis(
  indicators: MacroIndicator[],
  recession: RecessionRisk | null,
) {
  const find = (name: string) => indicators.find((i) => i.name === name);
  const unemp = find("실업률 (Unemployment)");
  const cpi = find("소비자물가 YoY (CPI)");
  const gdp = find("GDP 성장률 (QoQ)");
  const fedRate = find("기준금리 (Fed Funds)");
  const t10y = find("10년 국채금리");
  const vix = find("VIX 변동성 지수");
  const claims = find("신규 실업수당 청구");
  const sp500 = find("S&P 500");

  const recessionRisk = recession?.risk ?? 0.15;

  // --- Sentiment ---
  let level: "expansion" | "slowdown" | "contraction" | "recovery";
  if (recessionRisk <= 0.15) level = "expansion";
  else if (recessionRisk <= 0.35) level = "slowdown";
  else if (recessionRisk <= 0.6) level = "recovery";
  else level = "contraction";

  const sentimentMap = {
    expansion: { emoji: "🟢", title: "경기 확장 국면 — 성장 지속, 과열 주의", color: "green" },
    slowdown: { emoji: "🟡", title: "경기 둔화 조짐 — 연착륙 vs 경착륙 관건", color: "yellow" },
    recovery: { emoji: "🟠", title: "경기 회복 초기 — 불확실성 높음", color: "orange" },
    contraction: { emoji: "🔴", title: "경기 침체 경고 — 방어적 포지션 필요", color: "red" },
  };
  const sentiment = sentimentMap[level];

  // --- Paragraphs ---
  const parts: string[] = [];

  // Recession Risk
  parts.push(`경기침체 확률 지수: ${(recessionRisk * 100).toFixed(1)}%. ${
    recessionRisk <= 0.15 ? "현재 경기침체 가능성은 매우 낮으며, 주요 거시 지표가 건강한 상태를 유지하고 있습니다." :
    recessionRisk <= 0.35 ? "일부 지표에서 둔화 신호가 감지되고 있으나, 아직 경기침체로 확진할 수준은 아닙니다." :
    recessionRisk <= 0.6 ? "복수의 경기 선행지표가 악화되고 있으며, 향후 6~12개월 내 경기침체 진입 가능성이 존재합니다." :
    "주요 경기 지표가 경기침체 구간에 진입했습니다. 방어적 자산 배분이 시급합니다."
  }`);

  // Growth + Labor
  if (gdp && unemp) {
    const gdpV = gdp.value;
    const unempV = unemp.value;
    if (gdpV > 2.0 && unempV < 4.5) {
      parts.push(`GDP 성장률 ${gdp.displayValue}과 실업률 ${unemp.displayValue}은 견조한 경제 펀더멘털을 시사합니다. ${claims ? `주간 실업수당 청구 ${claims.displayValue}로 노동시장은 ${claims.value < 230000 ? "여전히 타이트합니다." : "다소 완화 조짐을 보이고 있습니다."}` : ""}`);
    } else if (gdpV < 1.0 || unempV > 5.0) {
      parts.push(`GDP 성장률 ${gdp.displayValue}, 실업률 ${unemp.displayValue}로 경기 하방 리스크가 확대되고 있습니다. ${unemp.trend === "up" ? "실업률의 상승 추세는 소비 위축으로 이어질 수 있습니다." : ""}`);
    } else {
      parts.push(`GDP 성장률 ${gdp.displayValue}, 실업률 ${unemp.displayValue}로 경제는 완만한 성장을 유지하고 있습니다.`);
    }
  }

  // Inflation + Rates
  if (cpi && fedRate) {
    const cpiV = cpi.value;
    const rateV = fedRate.value;
    if (cpiV > 3.0 && rateV > 4.0) {
      parts.push(`물가상승률 ${cpi.displayValue}로 인플레이션이 연준 목표(2%)를 상회하고 있으며, 기준금리 ${fedRate.displayValue}로 긴축 기조가 유지 중입니다. ${cpi.trend === "down" ? "물가가 하락 추세를 보이고 있어 금리 인하 기대감이 형성되고 있습니다." : "물가 상승 압력이 지속되어 금리 인하 시기가 불투명합니다."}`);
    } else if (cpiV <= 2.5) {
      parts.push(`물가상승률 ${cpi.displayValue}로 인플레이션이 목표 수준에 근접했습니다. ${rateV > 3.0 ? `기준금리 ${fedRate.displayValue}로 실질금리가 높은 상태이며, 금리 인하 여력이 존재합니다.` : "금리 정책의 정상화가 진행 중입니다."}`);
    } else {
      parts.push(`물가상승률 ${cpi.displayValue}, 기준금리 ${fedRate.displayValue}. 연준은 인플레이션 데이터에 따라 금리 정책을 조정할 것으로 예상됩니다.`);
    }
  }

  // Market
  if (t10y && vix) {
    parts.push(`10년 국채금리 ${t10y.displayValue}${t10y.trend === "down" ? "(하락 추세)" : t10y.trend === "up" ? "(상승 추세)" : ""}, VIX ${vix.displayValue}${vix.value > 25 ? "(높은 변동성 — 시장 불안)" : vix.value < 15 ? "(낮은 변동성 — 과도한 안일)" : "(정상 범위)"}. ${sp500 ? `S&P 500 ${sp500.displayValue}(${sp500.trend === "up" ? "상승세" : "하락세"}).` : ""}`);
  }

  // --- Investment Guide ---
  const guide: { title: string; content: string; color: string }[] = [];

  if (recessionRisk <= 0.2) {
    guide.push({
      title: "주식 & 위험자산",
      content: `경기 확장 구간으로 위험자산에 우호적입니다. ${vix && vix.value < 18 ? "VIX가 낮아 시장 안도감이 높으나, 갑작스러운 변동성 급등에 대비하세요." : ""} 주식 비중을 유지하되, ${cpi && cpi.value > 3 ? "인플레이션 헤지를 위해 원자재/TIPS 비중을 고려하세요." : "성장주와 기술주에 기회가 있습니다."}`,
      color: "green",
    });
    guide.push({
      title: "채권 & 안전자산",
      content: `${fedRate && fedRate.trend === "down" ? "금리 인하 사이클에서 채권 가격 상승이 기대됩니다. 장기채 비중을 늘리는 것을 고려하세요." : t10y ? `10년 금리 ${t10y.displayValue}로 ${parseFloat(t10y.displayValue) > 4 ? "채권 수익률이 매력적입니다. 분할 매수 구간." : "채권은 포트폴리오 안정화 목적으로 유지하세요."}` : "채권 배분을 포트폴리오의 20~30%로 유지하세요."}`,
      color: "blue",
    });
    guide.push({
      title: "암호화폐 시사점",
      content: `거시경제 환경이 위험자산에 우호적입니다. ${fedRate && fedRate.trend === "down" ? "유동성 증가 기대감으로 크립토에 긍정적." : "그러나 높은 금리는 유동성을 제한하므로 선별적 접근이 필요합니다."} 매크로 침체 없이 유동성이 풀리는 구간은 역사적으로 크립토 강세장과 일치합니다.`,
      color: "green",
    });
  } else if (recessionRisk <= 0.4) {
    guide.push({
      title: "주식 & 위험자산",
      content: `경기 둔화 조짐으로 방어주(헬스케어, 유틸리티, 필수소비재) 비중을 확대하세요. ${vix && vix.value > 25 ? "VIX가 높아 단기 변동성이 예상됩니다. " : ""}성장주보다 가치주와 배당주가 유리한 구간입니다.`,
      color: "yellow",
    });
    guide.push({
      title: "채권 & 안전자산",
      content: `경기침체 우려 시 안전자산 수요가 증가합니다. 국채와 금 비중을 30~40%로 확대하세요. ${t10y && parseFloat(t10y.displayValue) > 4 ? "현재 금리 수준에서 장기채 매수는 침체 시 큰 자본이익을 제공할 수 있습니다." : ""}`,
      color: "blue",
    });
    guide.push({
      title: "암호화폐 시사점",
      content: `거시 불확실성이 높은 구간으로 크립토 포지션을 보수적으로 운영하세요. 경기침체가 현실화되면 위험자산 전반의 매도 압력이 크립토에도 영향을 미칩니다. ${fedRate && fedRate.trend === "down" ? "다만 금리 인하가 시작되면 유동성 기대감으로 반등 가능." : ""}`,
      color: "yellow",
    });
  } else {
    guide.push({
      title: "주식 & 위험자산",
      content: `경기침체 리스크가 높습니다. 주식 비중을 최소화하고 현금 비중을 40% 이상 확보하세요. ${sp500 ? `S&P 500이 추가 하락할 경우를 대비해 헤지 전략(풋옵션, 인버스 ETF)을 고려하세요.` : "방어적 섹터 외에는 관망을 권장합니다."}`,
      color: "red",
    });
    guide.push({
      title: "채권 & 안전자산",
      content: "국채, 금, 달러 등 안전자산 비중을 50% 이상으로 확대하세요. 침체 초기에는 국채 금리가 급락(가격 급등)하므로 장기채가 유리합니다. 회사채는 부도 리스크로 피하세요.",
      color: "blue",
    });
    guide.push({
      title: "암호화폐 시사점",
      content: "거시 경기침체 시 크립토는 리스크 자산으로서 큰 하락을 경험합니다 (2022년 사례). 현금 비중을 극대화하고, 하락 시 DCA 매수를 위한 자금을 확보하세요. 침체 바닥에서의 매수가 다음 사이클의 시작점이 됩니다.",
      color: "red",
    });
  }

  // --- Implications ---
  const implications: string[] = [];

  if (recession) {
    const comps = recession.components;
    const worst = comps.reduce((a, b) => (b.value > a.value ? b : a), comps[0]);
    const best = comps.reduce((a, b) => (b.value < a.value ? b : a), comps[0]);
    implications.push(`경기침체 구성 지표 중 '${worst.label}'이(가) 가장 높은 리스크(${(worst.value * 100).toFixed(0)}%)를, '${best.label}'이(가) 가장 낮은 리스크(${(best.value * 100).toFixed(0)}%)를 나타내고 있습니다.`);
  }

  if (cpi && fedRate) {
    const realRate = fedRate.value - cpi.value;
    implications.push(`실질금리(기준금리 - CPI): ${realRate >= 0 ? "+" : ""}${realRate.toFixed(1)}%p. ${realRate > 1.5 ? "높은 실질금리는 경기 억제 효과가 있으며, 금리 인하 압력을 높입니다." : realRate > 0 ? "양(+)의 실질금리로 긴축적 환경이지만 극단적 수준은 아닙니다." : "음(-)의 실질금리로 실질적 완화 상태이며, 자산 가격에 우호적입니다."}`);
  }

  if (unemp) {
    implications.push(`실업률 ${unemp.displayValue}(${unemp.trend === "up" ? "상승 추세 ↑" : unemp.trend === "down" ? "하락 추세 ↓" : "횡보"}). ${unemp.value < 4.0 ? "완전고용에 가까운 수준으로 임금 상승 → 인플레이션 재가속 리스크가 있습니다." : unemp.value > 5.0 ? "노동시장 악화가 소비 위축으로 이어질 수 있습니다." : "노동시장은 건전한 수준을 유지하고 있습니다."}`);
  }

  if (vix) {
    if (vix.value > 30) {
      implications.push(`VIX ${vix.displayValue}로 시장 공포가 극대화된 상태입니다. 과거 VIX 30+ 구간은 중기적으로 매수 기회와 일치했습니다.`);
    } else if (vix.value < 13) {
      implications.push(`VIX ${vix.displayValue}로 시장 안일감이 극대화되어 있습니다. 과도한 낙관은 블랙스완 이벤트에 취약합니다.`);
    }
  }

  if (gdp) {
    if (gdp.value < 0) {
      implications.push(`GDP 성장률이 마이너스(${gdp.displayValue})로 전환되었습니다. 2분기 연속 마이너스 성장은 기술적 경기침체의 정의입니다.`);
    } else if (gdp.value > 3.0) {
      implications.push(`GDP ${gdp.displayValue}로 강한 성장세입니다. 다만 과열 경제는 연준의 추가 긴축을 유발할 수 있습니다.`);
    }
  }

  if (t10y && fedRate) {
    const t10yV = parseFloat(t10y.displayValue);
    const fedV = fedRate.value;
    if (t10yV < fedV) {
      implications.push(`장단기 금리 역전(10Y ${t10y.displayValue} < 기준금리 ${fedRate.displayValue}): 역수익률 곡선은 역사적으로 경기침체를 6~18개월 선행했습니다.`);
    }
  }

  return { sentiment, parts, guide, implications, recessionRisk };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MacroIndicatorsPage() {
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [recession, setRecession] = useState<RecessionRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const results: MacroIndicator[] = [];

      // Fetch all macro data in parallel
      const [unempRes, cpiRes, gdpRes, fedRes, t10yRes, vixRes, claimsRes, sp500Res, recessionRes] =
        await Promise.allSettled([
          fetch("/api/macro/indicators?indicator=unemployment").then((r) => r.json()),
          fetch("/api/macro/indicators?indicator=inflation").then((r) => r.json()),
          fetch("/api/macro/indicators?indicator=rgdp").then((r) => r.json()),
          fetch("/api/macro/indicators?indicator=fedfunds").then((r) => r.json()),
          fetch("/api/macro/indicators?indicator=t10y").then((r) => r.json()),
          fetch("/api/macro/indicators?indicator=vix").then((r) => r.json()),
          fetch("/api/macro/indicators?indicator=initialclaims").then((r) => r.json()),
          fetch("/api/macro/indicators?indicator=sp500").then((r) => r.json()),
          fetch("/api/macro/recession-risk").then((r) => r.json()),
        ]);

      // Recession Risk
      if (recessionRes.status === "fulfilled") {
        setRecession(recessionRes.value);
      }

      // --- Unemployment ---
      if (unempRes.status === "fulfilled") {
        const d = getLatestTwo(unempRes.value.data);
        if (d) {
          const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
          const risk = Math.max(0, Math.min(1, (d.latest - 3.0) / 4.0));
          results.push({
            name: "실업률 (Unemployment)", value: d.latest, displayValue: `${d.latest.toFixed(1)}%`,
            prev: d.prev, displayPrev: `${d.prev.toFixed(1)}%`, trend,
            trendDirection: trend === "up" ? "negative" : "positive",
            risk, status: d.latest < 4.0 ? "healthy" : d.latest < 5.0 ? "caution" : d.latest < 6.5 ? "warning" : "danger",
            category: "labor", description: "미국 비농업 실업률. 4% 미만 = 완전고용, 6%+ = 경기침체 수준.",
            source: unempRes.value.source === "fred" ? "FRED" : "Sample", freshness: "monthly",
          });
        }
      }

      // --- CPI YoY ---
      if (cpiRes.status === "fulfilled") {
        const yoy = getYoYChange(cpiRes.value.data);
        if (yoy) {
          const d = getLatestTwo(cpiRes.value.data);
          const prevYoY = cpiRes.value.data.length >= 14
            ? ((parseFloat(cpiRes.value.data[cpiRes.value.data.length - 2].value) - parseFloat(cpiRes.value.data[cpiRes.value.data.length - 14].value)) / parseFloat(cpiRes.value.data[cpiRes.value.data.length - 14].value)) * 100
            : yoy.yoy;
          const trend = yoy.yoy > prevYoY ? "up" : yoy.yoy < prevYoY ? "down" : "flat";
          const risk = Math.max(0, Math.min(1, (yoy.yoy - 1.0) / 6.0));
          results.push({
            name: "소비자물가 YoY (CPI)", value: yoy.yoy, displayValue: `${yoy.yoy.toFixed(1)}%`,
            prev: prevYoY, displayPrev: `${prevYoY.toFixed(1)}%`, trend,
            trendDirection: trend === "down" ? "positive" : "negative",
            risk, status: yoy.yoy < 2.5 ? "healthy" : yoy.yoy < 3.5 ? "caution" : yoy.yoy < 5.0 ? "warning" : "danger",
            category: "inflation", description: "소비자물가지수 전년비 변화율. 연준 목표 2%. 3%+ = 인플레이션 우려.",
            source: cpiRes.value.source === "fred" ? "FRED" : "Sample", freshness: "monthly",
          });
        } else {
          // Fallback: use raw values if YoY can't be calculated
          const d2 = getLatestTwo(cpiRes.value.data);
          if (d2) {
            results.push({
              name: "소비자물가 YoY (CPI)", value: d2.latest, displayValue: `${d2.latest.toFixed(1)}%`,
              prev: d2.prev, displayPrev: `${d2.prev.toFixed(1)}%`,
              trend: d2.latest > d2.prev ? "up" : "down",
              trendDirection: d2.latest < d2.prev ? "positive" : "negative",
              risk: Math.max(0, Math.min(1, (d2.latest - 1.0) / 6.0)),
              status: "caution", category: "inflation",
              description: "소비자물가지수 전년비 변화율.", source: "Sample", freshness: "monthly",
            });
          }
        }
      }

      // --- GDP Growth ---
      if (gdpRes.status === "fulfilled") {
        const d = getLatestTwo(gdpRes.value.data);
        if (d) {
          const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
          const risk = Math.max(0, Math.min(1, 1 - (d.latest + 2) / 6));
          results.push({
            name: "GDP 성장률 (QoQ)", value: d.latest, displayValue: `${d.latest.toFixed(1)}%`,
            prev: d.prev, displayPrev: `${d.prev.toFixed(1)}%`, trend,
            trendDirection: trend === "up" ? "positive" : "negative",
            risk, status: d.latest > 2.0 ? "healthy" : d.latest > 0 ? "caution" : d.latest > -1 ? "warning" : "danger",
            category: "growth", description: "실질 GDP 분기별 연환산 성장률. 2%+ = 건강한 성장, 마이너스 = 침체 우려.",
            source: gdpRes.value.source === "fred" ? "FRED" : "Sample", freshness: "quarterly",
          });
        }
      }

      // --- Fed Funds Rate ---
      if (fedRes.status === "fulfilled") {
        const d = getLatestTwo(fedRes.value.data);
        if (d) {
          const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
          const risk = Math.max(0, Math.min(1, d.latest / 6.0));
          results.push({
            name: "기준금리 (Fed Funds)", value: d.latest, displayValue: `${d.latest.toFixed(2)}%`,
            prev: d.prev, displayPrev: `${d.prev.toFixed(2)}%`, trend,
            trendDirection: trend === "down" ? "positive" : "negative",
            risk, status: d.latest < 2.0 ? "healthy" : d.latest < 4.0 ? "caution" : d.latest < 5.0 ? "warning" : "danger",
            category: "rates", description: "연방기금금리. 높을수록 긴축적 환경. 금리 인하 시 유동성 증가.",
            source: fedRes.value.source === "fred" ? "FRED" : "Sample", freshness: "monthly",
          });
        }
      }

      // --- 10Y Treasury ---
      if (t10yRes.status === "fulfilled") {
        const d = getLatestTwo(t10yRes.value.data);
        if (d) {
          const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
          results.push({
            name: "10년 국채금리", value: d.latest, displayValue: `${d.latest.toFixed(2)}%`,
            prev: d.prev, displayPrev: `${d.prev.toFixed(2)}%`, trend,
            trendDirection: "neutral",
            risk: Math.max(0, Math.min(1, (d.latest - 2.0) / 3.0)),
            status: d.latest < 3.0 ? "healthy" : d.latest < 4.0 ? "caution" : d.latest < 4.5 ? "warning" : "danger",
            category: "rates", description: "미국 10년 만기 국채 수익률. 장기 금리 지표이자 모기지·대출 금리의 기준.",
            source: t10yRes.value.source === "fred" ? "FRED" : "Sample", freshness: "daily",
          });
        }
      }

      // --- VIX ---
      if (vixRes.status === "fulfilled") {
        const d = getLatestTwo(vixRes.value.data);
        if (d) {
          const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
          results.push({
            name: "VIX 변동성 지수", value: d.latest, displayValue: d.latest.toFixed(1),
            prev: d.prev, displayPrev: d.prev.toFixed(1), trend,
            trendDirection: trend === "down" ? "positive" : "negative",
            risk: Math.max(0, Math.min(1, (d.latest - 10) / 30)),
            status: d.latest < 15 ? "healthy" : d.latest < 20 ? "caution" : d.latest < 30 ? "warning" : "danger",
            category: "market", description: "CBOE 변동성 지수. 20+ = 시장 불안, 30+ = 공포, 12- = 과도한 안일.",
            source: vixRes.value.source === "fred" ? "FRED" : "Sample", freshness: "daily",
          });
        }
      }

      // --- Initial Claims ---
      if (claimsRes.status === "fulfilled") {
        const d = getLatestTwo(claimsRes.value.data);
        if (d) {
          const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
          results.push({
            name: "신규 실업수당 청구", value: d.latest, displayValue: `${(d.latest / 1000).toFixed(0)}K`,
            prev: d.prev, displayPrev: `${(d.prev / 1000).toFixed(0)}K`, trend,
            trendDirection: trend === "down" ? "positive" : "negative",
            risk: Math.max(0, Math.min(1, (d.latest - 200000) / 200000)),
            status: d.latest < 220000 ? "healthy" : d.latest < 280000 ? "caution" : d.latest < 350000 ? "warning" : "danger",
            category: "labor", description: "주간 신규 실업수당 청구 건수. 노동시장 선행지표. 30만+ = 경기 악화 신호.",
            source: claimsRes.value.source === "fred" ? "FRED" : "Sample", freshness: "weekly",
          });
        }
      }

      // --- S&P 500 ---
      if (sp500Res.status === "fulfilled") {
        const d = getLatestTwo(sp500Res.value.data);
        if (d) {
          const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
          const change = ((d.latest - d.prev) / d.prev) * 100;
          results.push({
            name: "S&P 500", value: d.latest, displayValue: `${d.latest.toFixed(0)}`,
            prev: d.prev, displayPrev: `${d.prev.toFixed(0)} (${change >= 0 ? "+" : ""}${change.toFixed(1)}%)`,
            trend, trendDirection: trend === "up" ? "positive" : "negative",
            risk: Math.max(0, Math.min(1, 0.5 - change / 10)),
            status: change > 1 ? "healthy" : change > -1 ? "caution" : change > -3 ? "warning" : "danger",
            category: "market", description: "S&P 500 지수. 미국 대형주 500개 기업의 종합 지수.",
            source: sp500Res.value.source === "fred" ? "FRED" : "Sample", freshness: "daily",
          });
        }
      }

      setIndicators(results);
      setLoading(false);
    }

    fetchAll();
  }, []);

  const analysis = useMemo(
    () => generateMacroAnalysis(indicators, recession),
    [indicators, recession]
  );

  const avgRisk = indicators.length > 0
    ? indicators.reduce((sum, i) => sum + i.risk, 0) / indicators.length
    : 0.5;

  const healthy = indicators.filter((i) => i.status === "healthy").length;
  const caution = indicators.filter((i) => i.status === "caution").length;
  const warning = indicators.filter((i) => i.status === "warning" || i.status === "danger").length;

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">거시경제 지표를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Macro Indicators</h1>
        </div>
        <p className="text-muted-foreground">
          글로벌 거시경제 지표 — 경기 사이클 분석 및 투자 전략 가이드
        </p>
      </div>

      {/* Gauges: Recession Risk + Category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">경기침체 확률</h2>
          <GaugeChart
            value={recession?.risk ?? avgRisk}
            label="Recession Risk"
            size="lg"
            subMetrics={recession?.components.map((c) => ({
              label: c.label, value: c.value, color: c.color,
            })) ?? []}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {recession?.source === "fred" ? "FRED 실시간 데이터" : "샘플 데이터"} 기반
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">경제 건전성</h3>
          <GaugeChart value={1 - avgRisk} label="Economic Health" size="sm" />
          <p className="mt-2 text-xs text-muted-foreground">{indicators.length}개 지표</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <Activity className="h-5 w-5 text-muted-foreground mb-1" />
          <div className="flex gap-4 mt-2">
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">{healthy}</p>
              <p className="text-[10px] text-muted-foreground">건전</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-500">{caution}</p>
              <p className="text-[10px] text-muted-foreground">주의</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">{warning}</p>
              <p className="text-[10px] text-muted-foreground">경고</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Market Sentiment & Investment Guide ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 시장 분위기 */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">거시경제 분위기 분석</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className={`rounded-lg p-4 ${
              analysis.sentiment.color === "green" ? "bg-green-500/5 border border-green-500/20" :
              analysis.sentiment.color === "red" ? "bg-red-500/5 border border-red-500/20" :
              analysis.sentiment.color === "orange" ? "bg-orange-500/5 border border-orange-500/20" :
              "bg-yellow-500/5 border border-yellow-500/20"
            }`}>
              <p className={`text-sm font-bold mb-1 ${
                analysis.sentiment.color === "green" ? "text-green-600" :
                analysis.sentiment.color === "red" ? "text-red-600" :
                analysis.sentiment.color === "orange" ? "text-orange-600" :
                "text-yellow-600"
              }`}>
                {analysis.sentiment.emoji} {analysis.sentiment.title}
              </p>
              <p className="text-xs text-muted-foreground">
                경기침체 확률 {(analysis.recessionRisk * 100).toFixed(1)}% | 건전 {healthy} · 주의 {caution} · 경고 {warning}
              </p>
            </div>
            {analysis.parts.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
            ))}
          </div>
        </div>

        {/* 투자 가이드 */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <Shield className="h-4 w-4 text-yellow-500" />
            <h2 className="text-sm font-semibold">투자 가이드</h2>
          </div>
          <div className="p-5 space-y-3">
            {analysis.guide.map((g, i) => {
              const bc = g.color === "green" ? "border-green-500/30" : g.color === "red" ? "border-red-500/30" : g.color === "blue" ? "border-blue-500/30" : "border-yellow-500/30";
              const bg = g.color === "green" ? "bg-green-500/5" : g.color === "red" ? "bg-red-500/5" : g.color === "blue" ? "bg-blue-500/5" : "bg-yellow-500/5";
              const tc = g.color === "green" ? "text-green-600" : g.color === "red" ? "text-red-600" : g.color === "blue" ? "text-blue-600" : "text-yellow-600";
              return (
                <div key={i} className={`rounded-lg border ${bc} ${bg} p-3`}>
                  <p className={`text-xs font-bold mb-1 ${tc}`}>{g.title}</p>
                  <p className="text-xs leading-relaxed text-foreground/80">{g.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 시사점 */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold">핵심 시사점</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">지표 데이터 기반 자동 분석 · 투자 조언이 아닙니다</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.implications.map((imp, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">{imp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicator Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">거시경제 지표 상세</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">지표</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">현재값</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">이전</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">추세</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">리스크</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">상태</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">주기</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">소스</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind) => {
                const sc = statusColor[ind.status];
                return (
                  <tr key={ind.name} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{ind.name}</span>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setShowInfo(showInfo === ind.name ? null : ind.name)}
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </div>
                      {showInfo === ind.name && (
                        <p className="text-[11px] text-muted-foreground mt-1">{ind.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{ind.displayValue}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">{ind.displayPrev}</td>
                    <td className="px-4 py-2 text-center">
                      {ind.trend === "up" ? (
                        <TrendingUp className={`inline h-4 w-4 ${ind.trendDirection === "positive" ? "text-green-500" : ind.trendDirection === "negative" ? "text-red-500" : "text-yellow-500"}`} />
                      ) : ind.trend === "down" ? (
                        <TrendingDown className={`inline h-4 w-4 ${ind.trendDirection === "positive" ? "text-green-500" : ind.trendDirection === "negative" ? "text-red-500" : "text-yellow-500"}`} />
                      ) : (
                        <Minus className="inline h-4 w-4 text-yellow-500" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="h-2 w-12 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${ind.risk * 100}%`,
                              background: ind.risk < 0.33 ? "#10b981" : ind.risk < 0.66 ? "#eab308" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">{(ind.risk * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                        {ind.status === "healthy" ? "건전" : ind.status === "caution" ? "주의" : ind.status === "warning" ? "경고" : "위험"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-[10px] text-muted-foreground">{freshnessLabel[ind.freshness]}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{ind.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
