"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Globe, TrendingUp, TrendingDown, Minus, Loader2,
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
// Risk Asset Friendliness Assessment (5-axis scoring)
// ---------------------------------------------------------------------------
interface RiskAxisScore {
  axis: string;
  score: number; // -2 (very negative) to +2 (very positive)
  label: string;
  evidence: string;
  color: string;
}

interface GuideItem {
  title: string;
  content: string;
  color: string;
  evidence: string[]; // specific data points backing this claim
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

  // =====================================================================
  // 5-Axis Risk Asset Friendliness Score
  // Each axis: -2 (very negative) to +2 (very positive) for risk assets
  // =====================================================================
  const riskAxes: RiskAxisScore[] = [];

  // 1. Liquidity / Monetary Policy
  if (fedRate) {
    const rateV = fedRate.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (rateV < 1.5) {
      score = 2; label = "매우 우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 초저금리로 풍부한 유동성. 위험자산 선호 극대화.`;
    } else if (rateV < 3.0) {
      score = 1; label = "우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 완화적 금리 수준. 유동성 환경 양호.`;
    } else if (rateV < 4.5) {
      score = 0; label = "중립";
      evidence = `기준금리 ${fedRate.displayValue}: 중립적 수준.${fedRate.trend === "down" ? " 인하 추세로 개선 기대." : fedRate.trend === "up" ? " 인상 추세로 긴축 우려." : ""}`;
    } else if (rateV < 5.5) {
      score = -1; label = "비우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 높은 금리로 유동성 제한. 차입 비용 증가가 위험자산 투자 매력을 감소시킴.${fedRate.trend === "down" ? " 다만 인하 추세가 향후 개선을 시사." : ""}`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 극도로 높은 금리. 유동성 급격히 위축. 위험자산에 강한 역풍.`;
    }
    riskAxes.push({ axis: "유동성/금리", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 2. Inflation
  if (cpi) {
    const cpiV = cpi.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (cpiV < 2.0) {
      score = 1; label = "우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 목표 이하 물가. 금리 인하 여력 확대 → 유동성 기대.`;
    } else if (cpiV < 2.8) {
      score = 2; label = "매우 우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 목표 근접한 안정적 물가. 금리 인하 가능성↑, 경기 과열 우려 없음. 위험자산에 최적 구간.`;
    } else if (cpiV < 3.5) {
      score = 0; label = "중립";
      evidence = `CPI YoY ${cpi.displayValue}: 다소 높은 물가. 연준 추가 긴축 가능성 잔존.${cpi.trend === "down" ? " 하락 추세가 긍정적." : ""}`;
    } else if (cpiV < 5.0) {
      score = -1; label = "비우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 높은 인플레이션으로 연준 긴축 기조 유지. 금리 인하 지연 → 유동성 축소.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 극심한 인플레이션. 연준의 공격적 긴축 불가피. 위험자산 대규모 매도 압력.`;
    }
    riskAxes.push({ axis: "인플레이션", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 3. Growth / Economy
  if (gdp) {
    const gdpV = gdp.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (gdpV > 3.0) {
      score = 1; label = "우호적";
      evidence = `GDP ${gdp.displayValue}: 강한 성장. 기업 실적 양호 기대.${gdpV > 4.5 ? " 다만 과열 우려로 긴축 압력 가능." : ""}`;
    } else if (gdpV > 1.5) {
      score = 2; label = "매우 우호적";
      evidence = `GDP ${gdp.displayValue}: 건실한 성장과 안정의 골디락스 구간. 기업 실적 성장 + 과열 부담 없음.`;
    } else if (gdpV > 0) {
      score = 0; label = "중립";
      evidence = `GDP ${gdp.displayValue}: 저성장 국면. 경기 방향성 불투명.${gdp.trend === "down" ? " 둔화 추세 주의." : ""}`;
    } else if (gdpV > -1.5) {
      score = -1; label = "비우호적";
      evidence = `GDP ${gdp.displayValue}: 마이너스 성장. 기업 실적 악화 → 위험자산 하방 압력. 2분기 연속 시 기술적 침체.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `GDP ${gdp.displayValue}: 심각한 경기 수축. 위험자산에서 안전자산으로 대규모 자금 이탈.`;
    }
    riskAxes.push({ axis: "경제 성장", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 4. Market Risk Appetite
  if (vix) {
    const vixV = vix.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (vixV < 13) {
      score = 1; label = "우호적 (과열 주의)";
      evidence = `VIX ${vix.displayValue}: 극도로 낮은 변동성. 시장 안도감 높으나 과잉 낙관 상태 — 돌발 이벤트에 취약.`;
    } else if (vixV < 18) {
      score = 2; label = "매우 우호적";
      evidence = `VIX ${vix.displayValue}: 낮은 변동성. 시장 리스크 선호 구간. 위험자산 투자심리 양호.`;
    } else if (vixV < 25) {
      score = 0; label = "중립";
      evidence = `VIX ${vix.displayValue}: 정상 범위 변동성. 특별한 공포/탐욕 없이 시장이 방향을 탐색 중.`;
    } else if (vixV < 35) {
      score = -1; label = "비우호적";
      evidence = `VIX ${vix.displayValue}: 높은 변동성. 시장 불안 심리 확대 → 위험자산 매도 압력. 단, VIX 30+ 구간은 역사적 매수 기회와 겹침.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `VIX ${vix.displayValue}: 극단적 공포. 패닉 매도 구간. 단기적으로 위험자산 급락 가능, 중기적으로 바닥 형성 신호.`;
    }
    riskAxes.push({ axis: "시장 변동성", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 5. Labor Market
  if (unemp) {
    const unempV = unemp.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (unempV < 3.8) {
      score = 2; label = "매우 우호적";
      evidence = `실업률 ${unemp.displayValue}: 완전고용. 소비 견조 → 기업 매출 지지. 다만 임금 상승 → 인플레 재가속 리스크.`;
    } else if (unempV < 4.5) {
      score = 1; label = "우호적";
      evidence = `실업률 ${unemp.displayValue}: 건전한 노동시장. 소비 여력 유지.${unemp.trend === "up" ? " 상승 추세 모니터링 필요." : ""}`;
    } else if (unempV < 5.5) {
      score = 0; label = "중립";
      evidence = `실업률 ${unemp.displayValue}: 다소 높은 수준.${unemp.trend === "up" ? " 상승 추세가 소비 위축으로 이어질 수 있음." : " 안정세."}`;
    } else if (unempV < 7.0) {
      score = -1; label = "비우호적";
      evidence = `실업률 ${unemp.displayValue}: 노동시장 악화. 소비 위축 → 기업 실적 하방 → 위험자산 하락 압력.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `실업률 ${unemp.displayValue}: 심각한 고용 위기. 경기침체 구간의 전형적 수준.`;
    }
    riskAxes.push({ axis: "노동시장", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // Calculate overall risk asset friendliness
  const totalScore = riskAxes.reduce((s, a) => s + a.score, 0);
  const maxPossible = riskAxes.length * 2;
  const riskFriendliness = maxPossible > 0 ? (totalScore + maxPossible) / (maxPossible * 2) : 0.5; // 0~1

  let riskAssetVerdict: { label: string; emoji: string; color: string; summary: string };
  if (riskFriendliness >= 0.75) {
    riskAssetVerdict = { label: "우호적", emoji: "🟢", color: "green",
      summary: "대부분의 거시 지표가 위험자산(주식·크립토)에 유리한 환경을 나타냅니다." };
  } else if (riskFriendliness >= 0.55) {
    riskAssetVerdict = { label: "조건부 우호적", emoji: "🟡", color: "yellow",
      summary: "일부 우호적 요인이 있으나, 비우호적 요인도 공존합니다. 선별적 접근 필요." };
  } else if (riskFriendliness >= 0.4) {
    riskAssetVerdict = { label: "중립/혼조", emoji: "🟠", color: "orange",
      summary: "우호적 요인과 비우호적 요인이 상충합니다. 방향성 판단이 어려운 구간." };
  } else {
    riskAssetVerdict = { label: "비우호적", emoji: "🔴", color: "red",
      summary: "다수의 지표가 위험자산에 역풍을 나타냅니다. 방어적 포지션 권장." };
  }

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

  // --- Investment Guide (data-driven with evidence) ---
  const guide: GuideItem[] = [];

  // Determine conditions more precisely
  const isLowRate = fedRate && fedRate.value < 3.0;
  const isHighRate = fedRate && fedRate.value >= 4.5;
  const isRateCutting = fedRate && fedRate.trend === "down";
  const isLowInflation = cpi && cpi.value < 2.8;
  const isHighInflation = cpi && cpi.value > 3.5;
  const isStrongGrowth = gdp && gdp.value > 2.0;
  const isWeakGrowth = gdp && gdp.value < 1.0;
  const isNegativeGrowth = gdp && gdp.value < 0;
  const isLowVix = vix && vix.value < 20;
  const isHighVix = vix && vix.value > 25;
  const isLowUnemp = unemp && unemp.value < 4.5;
  const realRate = (fedRate && cpi) ? fedRate.value - cpi.value : null;

  // Stock & Risk Asset Guide
  if (recessionRisk <= 0.2) {
    const evidence: string[] = [];
    if (isStrongGrowth) evidence.push(`GDP ${gdp!.displayValue} → 기업 실적 성장 지지`);
    if (isLowUnemp) evidence.push(`실업률 ${unemp!.displayValue} → 소비 견조`);
    if (isLowVix) evidence.push(`VIX ${vix!.displayValue} → 시장 안정`);
    if (sp500 && sp500.trend === "up") evidence.push(`S&P 500 상승세 → 모멘텀 유지`);
    if (isHighRate) evidence.push(`⚠ 기준금리 ${fedRate!.displayValue} → 높은 차입비용은 부담 요인`);
    if (isHighInflation) evidence.push(`⚠ CPI ${cpi!.displayValue} → 인플레이션 재가속 시 긴축 연장 리스크`);

    guide.push({
      title: "주식 & 위험자산",
      content: `경기 확장 구간으로 전반적으로 위험자산에 긍정적이나, ${isHighRate ? "높은 금리 환경은 밸류에이션 부담을 줍니다. 고성장 기술주보다 실적 기반 가치주/배당주의 상대적 매력이 높습니다." : isLowRate ? "저금리 환경에서 성장주와 기술주에 기회가 있습니다." : "금리 수준을 고려해 섹터별 선별 투자가 중요합니다."} ${vix && vix.value < 15 ? "VIX가 매우 낮아 과도한 안일감에 주의하세요 — 갑작스러운 변동성 급등 가능." : ""} ${cpi && cpi.value > 3 ? "인플레이션 헤지를 위해 원자재, 에너지, TIPS 비중을 고려하세요." : ""}`,
      color: "green", evidence,
    });
  } else if (recessionRisk <= 0.4) {
    const evidence: string[] = [];
    evidence.push(`경기침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 둔화 신호`);
    if (isWeakGrowth) evidence.push(`GDP ${gdp!.displayValue} → 성장 둔화`);
    if (unemp && unemp.trend === "up") evidence.push(`실업률 ${unemp.displayValue} 상승 추세 → 소비 위축 우려`);
    if (isHighVix) evidence.push(`VIX ${vix!.displayValue} → 시장 불안 확대`);
    if (isRateCutting) evidence.push(`금리 인하 추세 → 향후 유동성 개선 기대`);

    guide.push({
      title: "주식 & 위험자산",
      content: `경기 둔화 조짐으로 방어주(헬스케어, 유틸리티, 필수소비재) 비중을 확대하세요. ${isHighVix ? "VIX가 높아 단기 변동성이 예상됩니다. " : ""}성장주보다 가치주와 배당주가 유리한 구간입니다. 현금 비중을 20~30%로 높여 하락 시 매수 기회에 대비하세요.`,
      color: "yellow", evidence,
    });
  } else {
    const evidence: string[] = [];
    evidence.push(`경기침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 침체 경고`);
    if (isNegativeGrowth) evidence.push(`GDP ${gdp!.displayValue} → 마이너스 성장`);
    if (unemp && unemp.value > 5) evidence.push(`실업률 ${unemp.displayValue} → 노동시장 악화`);
    if (isHighVix) evidence.push(`VIX ${vix!.displayValue} → 극심한 변동성`);

    guide.push({
      title: "주식 & 위험자산",
      content: `경기침체 리스크가 높습니다. 주식 비중을 최소화하고 현금 비중을 40% 이상 확보하세요. ${sp500 ? "S&P 500 추가 하락 대비 헤지 전략(풋옵션, 인버스 ETF)을 고려하세요." : "방어적 섹터 외에는 관망을 권장합니다."} 역사적으로 S&P 500은 침체기에 평균 30~35% 하락했습니다.`,
      color: "red", evidence,
    });
  }

  // Bond & Safe Haven Guide
  {
    const evidence: string[] = [];
    if (t10y) evidence.push(`10년 국채금리 ${t10y.displayValue}${t10y.trend === "down" ? " (하락 추세)" : t10y.trend === "up" ? " (상승 추세)" : ""}`);
    if (realRate !== null) evidence.push(`실질금리 ${realRate >= 0 ? "+" : ""}${realRate.toFixed(1)}%p ${realRate > 1.5 ? "→ 채권 실질수익 매력적" : realRate > 0 ? "→ 양(+)의 실질수익" : "→ 실질 마이너스 수익"}`);
    if (isRateCutting) evidence.push("금리 인하 추세 → 채권 가격 상승 기대");
    if (recessionRisk > 0.3) evidence.push("침체 우려 → 안전자산 수요 증가");

    let bondContent: string;
    if (recessionRisk > 0.4) {
      bondContent = "국채, 금, 달러 등 안전자산 비중을 50% 이상으로 확대하세요. 침체 초기 국채 금리 급락(가격 급등)이 예상되어 장기채가 유리합니다. 투자등급 이하 회사채는 부도 리스크로 피하세요.";
    } else if (isRateCutting) {
      bondContent = `금리 인하 사이클에서 채권 가격 상승이 기대됩니다. 장기채(TLT) 비중을 늘리는 것을 고려하세요. ${t10y && parseFloat(t10y.displayValue) > 4 ? `현재 10년 금리 ${t10y.displayValue}로 높은 수준에서의 진입은 이중 수익(이자+자본이익) 가능.` : ""}`;
    } else if (t10y && parseFloat(t10y.displayValue) > 4.0) {
      bondContent = `10년 금리 ${t10y.displayValue}로 채권 수익률이 매력적입니다. 분할 매수로 채권 포지션을 구축하세요. 포트폴리오의 25~35%를 채권에 배분하는 것을 권장합니다.`;
    } else {
      bondContent = "채권은 포트폴리오 안정화 목적으로 20~30% 배분을 유지하세요. 금리 변동 방향에 따라 듀레이션을 조절하세요.";
    }
    guide.push({ title: "채권 & 안전자산", content: bondContent, color: "blue", evidence });
  }

  // Crypto Implication Guide (data-driven, nuanced)
  {
    const evidence: string[] = [];
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];

    // Analyze each factor for crypto specifically
    if (isRateCutting) { positiveFactors.push("금리 인하 추세"); evidence.push(`기준금리 ${fedRate!.displayValue} (${fedRate!.trend === "down" ? "↓ 인하 추세" : "횡보"}) → 유동성 증가 기대 → 크립토 긍정적`); }
    else if (isLowRate) { positiveFactors.push("저금리 환경"); evidence.push(`기준금리 ${fedRate!.displayValue} → 풍부한 유동성 → 크립토 강세 요인`); }
    else if (isHighRate) { negativeFactors.push("고금리 유동성 제약"); evidence.push(`기준금리 ${fedRate!.displayValue} → 유동성 제한. 국채 대비 크립토 기회비용 증가. 2022년 금리인상기 BTC -65% 하락 선례.`); }

    if (isLowInflation) { positiveFactors.push("안정적 물가"); evidence.push(`CPI ${cpi!.displayValue} → 금리 인하 여력 → 크립토 유동성 환경 개선`); }
    else if (isHighInflation) { negativeFactors.push("인플레이션 지속"); evidence.push(`CPI ${cpi!.displayValue} → 연준 긴축 연장 가능 → 유동성 축소 리스크`); }

    if (isStrongGrowth) { positiveFactors.push("건전한 경제 성장"); evidence.push(`GDP ${gdp!.displayValue} → Risk-on 심리 지지 → 크립토 포함 위험자산 선호`); }
    else if (isNegativeGrowth) { negativeFactors.push("경기 위축"); evidence.push(`GDP ${gdp!.displayValue} → 침체기 위험자산 전반 매도 → 크립토 동반 하락 (2022년 패턴)`); }

    if (isLowVix) { positiveFactors.push("낮은 변동성"); evidence.push(`VIX ${vix!.displayValue} → 시장 안정 → 위험자산 선호 환경`); }
    else if (isHighVix) { negativeFactors.push("높은 변동성"); evidence.push(`VIX ${vix!.displayValue} → 리스크-오프 심리 → 크립토 매도 압력. 다만 VIX 극단치는 역사적 매수 기회와 겹침.`); }

    if (realRate !== null) {
      if (realRate < 0) { positiveFactors.push("음(-)의 실질금리"); evidence.push(`실질금리 ${realRate.toFixed(1)}%p → 현금 보유 불리 → BTC 등 대체자산 매력↑ (2020~2021년 패턴)`); }
      else if (realRate > 2.0) { negativeFactors.push("높은 실질금리"); evidence.push(`실질금리 +${realRate.toFixed(1)}%p → 무위험수익률 매력 → 크립토 기회비용 큼`); }
    }

    if (recessionRisk > 0.35) { negativeFactors.push("높은 침체 확률"); evidence.push(`침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 역사적으로 침체기 크립토 대폭 하락 (2020.03 BTC -50%, 2022 BTC -65%)`); }
    if (recessionRisk <= 0.15 && isLowUnemp) { positiveFactors.push("경기 확장 + 완전고용"); evidence.push(`침체 확률 ${(recessionRisk * 100).toFixed(0)}%, 실업률 ${unemp!.displayValue} → 골디락스 환경. 2024~2025년 BTC 사이클과 유사.`); }

    // Yield curve inversion check
    if (t10y && fedRate) {
      const t10yV = parseFloat(t10y.displayValue);
      if (t10yV < fedRate.value) {
        negativeFactors.push("장단기 금리 역전");
        evidence.push(`10Y ${t10y.displayValue} < 기준금리 ${fedRate.displayValue} → 수익률 곡선 역전 = 6~18개월 내 침체 경고 → 크립토 하방 리스크 확대`);
      }
    }

    const posCount = positiveFactors.length;
    const negCount = negativeFactors.length;

    let cryptoColor: string;
    let cryptoContent: string;

    if (posCount >= negCount + 2) {
      cryptoColor = "green";
      cryptoContent = `거시경제 환경이 크립토에 우호적입니다. 긍정 요인(${positiveFactors.join(", ")})이 부정 요인을 크게 상회합니다. ${isRateCutting || isLowRate ? "유동성 확대 구간은 역사적으로 크립토 강세장(2020 Q4~2021, 2024~2025)과 일치합니다." : "다만 유동성 환경의 변화를 지속 모니터링하세요."} 포트폴리오 내 크립토 비중을 적극적으로 운영할 수 있는 구간이나, 거시 환경 변화에 대한 리밸런싱 기준을 미리 설정하세요.`;
    } else if (posCount > negCount) {
      cryptoColor = "yellow";
      cryptoContent = `거시 환경이 크립토에 조건부 우호적입니다. 긍정 요인(${positiveFactors.join(", ")})이 우세하나, ${negativeFactors.length > 0 ? `부정 요인(${negativeFactors.join(", ")})도 존재합니다.` : "불확실성이 잔존합니다."} ${isHighRate ? `특히 기준금리 ${fedRate!.displayValue}의 높은 수준은 크립토 시장의 상승 탄력을 제한합니다. 2018~2019년처럼 거시는 나쁘지 않으나 유동성 부족으로 크립토가 횡보한 사례를 참고하세요.` : ""} 선별적 접근과 분할 매수 전략을 권장합니다.`;
    } else if (posCount === negCount) {
      cryptoColor = "orange";
      cryptoContent = `거시 환경이 크립토에 혼조세입니다. 긍정 요인(${positiveFactors.join(", ")})과 부정 요인(${negativeFactors.join(", ")})이 팽팽히 맞서고 있습니다. 방향성 판단이 어려운 구간으로, 크립토 포지션을 축소하거나 현금 비중을 높여 관망하세요. 거시 데이터의 변화 방향(특히 금리·인플레 추세)이 향후 크립토 방향을 결정할 핵심 변수입니다.`;
    } else {
      cryptoColor = "red";
      cryptoContent = `거시 환경이 크립토에 비우호적입니다. 부정 요인(${negativeFactors.join(", ")})이 긍정 요인을 압도합니다. ${recessionRisk > 0.35 ? "경기침체 시 크립토는 리스크 자산으로서 큰 하락을 경험합니다 (2022년 BTC -65%, ETH -68%)." : ""} ${isHighRate && isHighInflation ? "고금리+고인플레 조합은 크립토에 가장 불리한 거시 환경입니다 (2022년 패턴)." : ""} 현금 비중을 극대화하고, 하락 시 DCA 매수를 위한 자금을 확보하세요. 매크로 바닥 확인 후 진입이 리스크 대비 수익이 높습니다.`;
    }

    guide.push({
      title: `암호화폐 시사점 (긍정 ${posCount} / 부정 ${negCount})`,
      content: cryptoContent,
      color: cryptoColor,
      evidence,
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
    const rr = fedRate.value - cpi.value;
    implications.push(`실질금리(기준금리 - CPI): ${rr >= 0 ? "+" : ""}${rr.toFixed(1)}%p. ${rr > 1.5 ? "높은 실질금리는 경기 억제 효과가 있으며, 금리 인하 압력을 높입니다." : rr > 0 ? "양(+)의 실질금리로 긴축적 환경이지만 극단적 수준은 아닙니다." : "음(-)의 실질금리로 실질적 완화 상태이며, 자산 가격에 우호적입니다."}`);
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

  return { sentiment, parts, guide, implications, recessionRisk, riskAxes, riskAssetVerdict, riskFriendliness };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MacroIndicatorsPage() {
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [recession, setRecession] = useState<RecessionRisk | null>(null);
  const [loading, setLoading] = useState(true);


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
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 mx-auto max-w-[1600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">거시경제 지표를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
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
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">경제 건전성</h3>
          <GaugeChart value={1 - avgRisk} label="Economic Health" size="sm" />
          <p className="mt-1 text-[10px] text-muted-foreground">{indicators.length}개 지표 평균</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">지표별 상태</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-green-500">건전 {healthy}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {indicators.filter(i => i.status === "healthy").map(i => (
                  <span key={i.name} className="text-[9px] bg-green-500/10 text-green-600 rounded px-1.5 py-0.5">{i.name.split(" (")[0]}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs font-semibold text-yellow-500">주의 {caution}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {indicators.filter(i => i.status === "caution").map(i => (
                  <span key={i.name} className="text-[9px] bg-yellow-500/10 text-yellow-600 rounded px-1.5 py-0.5">{i.name.split(" (")[0]}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-500">경고 {warning}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {indicators.filter(i => i.status === "warning" || i.status === "danger").map(i => (
                  <span key={i.name} className="text-[9px] bg-red-500/10 text-red-600 rounded px-1.5 py-0.5">
                    {i.name.split(" (")[0]} {i.status === "danger" ? "⚠" : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 지표별 건전성 차트 ─── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">경제 건전성 지표 ({indicators.length}개)</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">리스크 0% = 건전, 100% = 위험</span>
        </div>
        <div className="p-5">
          {/* Category groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Group by category */}
            {(["growth", "inflation", "labor", "rates", "market"] as const).map((cat) => {
              const catIndicators = indicators.filter((i) => i.category === cat);
              if (catIndicators.length === 0) return null;
              const catLabel = cat === "growth" ? "경제 성장" : cat === "inflation" ? "인플레이션" : cat === "labor" ? "노동시장" : cat === "rates" ? "금리/채권" : "시장 심리";
              const catEmoji = cat === "growth" ? "📈" : cat === "inflation" ? "💰" : cat === "labor" ? "👷" : cat === "rates" ? "🏦" : "📊";
              const catAvgRisk = catIndicators.reduce((s, i) => s + i.risk, 0) / catIndicators.length;
              return (
                <div key={cat} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{catEmoji}</span>
                      <span className="text-xs font-semibold">{catLabel}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      catAvgRisk < 0.33 ? "bg-green-500/10 text-green-600" :
                      catAvgRisk < 0.66 ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-red-500/10 text-red-600"
                    }`}>
                      {catAvgRisk < 0.33 ? "양호" : catAvgRisk < 0.66 ? "주의" : "위험"}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {catIndicators.map((ind) => {
                      const barColor = ind.risk < 0.33 ? "#10b981" : ind.risk < 0.66 ? "#eab308" : "#ef4444";
                      const bgBarColor = ind.risk < 0.33 ? "bg-green-500/8" : ind.risk < 0.66 ? "bg-yellow-500/8" : "bg-red-500/8";
                      return (
                        <div key={ind.name} className={`rounded-md p-2 ${bgBarColor}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium">{ind.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono font-semibold">{ind.displayValue}</span>
                              <span className={`inline-flex items-center gap-0.5 text-[9px] ${
                                ind.trendDirection === "positive" ? "text-green-500" :
                                ind.trendDirection === "negative" ? "text-red-500" :
                                "text-yellow-500"
                              }`}>
                                {ind.trend === "up" ? "▲" : ind.trend === "down" ? "▼" : "─"}
                              </span>
                            </div>
                          </div>
                          {/* Risk bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(2, ind.risk * 100)}%`, background: barColor }}
                              />
                            </div>
                            <span className="text-[10px] font-mono tabular-nums w-8 text-right" style={{ color: barColor }}>
                              {(ind.risk * 100).toFixed(0)}%
                            </span>
                          </div>
                          {/* Threshold markers */}
                          <div className="flex items-center justify-between mt-0.5 px-0.5">
                            <span className="text-[8px] text-muted-foreground/50">건전</span>
                            <span className="text-[8px] text-muted-foreground/50">|</span>
                            <span className="text-[8px] text-muted-foreground/50">주의</span>
                            <span className="text-[8px] text-muted-foreground/50">|</span>
                            <span className="text-[8px] text-muted-foreground/50">경고</span>
                          </div>
                          {/* Description */}
                          <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">{ind.description}</p>
                          {/* Status badge + previous */}
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${statusColor[ind.status].bg} ${statusColor[ind.status].text}`}>
                              {ind.status === "healthy" ? "● 건전" : ind.status === "caution" ? "● 주의" : ind.status === "warning" ? "▲ 경고" : "⚠ 위험"}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              이전: {ind.displayPrev} · {freshnessLabel[ind.freshness]} · {ind.source}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall risk bar */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">종합 리스크 수준</span>
              <span className={`text-xs font-bold ${
                avgRisk < 0.33 ? "text-green-500" : avgRisk < 0.66 ? "text-yellow-500" : "text-red-500"
              }`}>
                {(avgRisk * 100).toFixed(0)}% ({avgRisk < 0.25 ? "매우 건전" : avgRisk < 0.4 ? "건전" : avgRisk < 0.55 ? "보통" : avgRisk < 0.7 ? "주의 필요" : "위험"})
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #10b981 0%, #10b981 33%, #eab308 33%, #eab308 66%, #ef4444 66%, #ef4444 100%)", opacity: 0.15 }}>
            </div>
            <div className="relative h-3 -mt-3 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full border-2 border-white dark:border-gray-900"
                style={{
                  width: "6px",
                  left: `calc(${avgRisk * 100}% - 3px)`,
                  background: avgRisk < 0.33 ? "#10b981" : avgRisk < 0.66 ? "#eab308" : "#ef4444",
                  boxShadow: "0 0 6px rgba(0,0,0,0.3)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
              <span>0% 건전</span>
              <span>33%</span>
              <span>66%</span>
              <span>100% 위험</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Market Sentiment + 핵심 시사점 통합 ─── */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.parts.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
            ))}
          </div>

          {/* 핵심 시사점 (통합) */}
          {analysis.implications.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">핵심 시사점</span>
                <span className="ml-auto text-[10px] text-muted-foreground">지표 데이터 기반 자동 분석</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.implications.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">{imp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 위험자산 우호도 평가 (5-Axis) ─── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">위험자산 우호도 평가</h2>
          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
            analysis.riskAssetVerdict.color === "green" ? "bg-green-500/10 text-green-600" :
            analysis.riskAssetVerdict.color === "red" ? "bg-red-500/10 text-red-600" :
            analysis.riskAssetVerdict.color === "orange" ? "bg-orange-500/10 text-orange-600" :
            "bg-yellow-500/10 text-yellow-600"
          }`}>
            {analysis.riskAssetVerdict.emoji} {analysis.riskAssetVerdict.label} ({(analysis.riskFriendliness * 100).toFixed(0)}점)
          </span>
        </div>
        <div className="p-5">
          <p className="text-sm text-foreground/80 mb-4">{analysis.riskAssetVerdict.summary}</p>
          <div className="space-y-3">
            {analysis.riskAxes.map((axis, i) => (
              <div key={i} className="rounded-lg bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold">{axis.axis}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[-2, -1, 0, 1, 2].map((v) => (
                        <div
                          key={v}
                          className={`w-4 h-2.5 rounded-sm ${
                            axis.score > 0 && v > 0 && v <= axis.score ? "bg-green-500" :
                            axis.score < 0 && v < 0 && v >= axis.score ? "bg-red-500" :
                            axis.score === 0 && v === 0 ? "bg-yellow-500" :
                            "bg-muted-foreground/10"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      axis.score >= 1 ? "bg-green-500/10 text-green-600" :
                      axis.score <= -1 ? "bg-red-500/10 text-red-600" :
                      "bg-yellow-500/10 text-yellow-600"
                    }`}>
                      {axis.label}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{axis.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Investment Guide ─── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Shield className="h-4 w-4 text-yellow-500" />
          <h2 className="text-sm font-semibold">투자 가이드</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">거시 지표 기반 분석 · 투자 조언이 아닙니다</span>
        </div>
        <div className="p-5 space-y-4">
          {analysis.guide.map((g, i) => {
            const bc = g.color === "green" ? "border-green-500/30" : g.color === "red" ? "border-red-500/30" : g.color === "blue" ? "border-blue-500/30" : g.color === "orange" ? "border-orange-500/30" : "border-yellow-500/30";
            const bgc = g.color === "green" ? "bg-green-500/5" : g.color === "red" ? "bg-red-500/5" : g.color === "blue" ? "bg-blue-500/5" : g.color === "orange" ? "bg-orange-500/5" : "bg-yellow-500/5";
            const tc = g.color === "green" ? "text-green-600" : g.color === "red" ? "text-red-600" : g.color === "blue" ? "text-blue-600" : g.color === "orange" ? "text-orange-600" : "text-yellow-600";
            return (
              <div key={i} className={`rounded-lg border ${bc} ${bgc} p-4`}>
                <p className={`text-xs font-bold mb-2 ${tc}`}>{g.title}</p>
                <p className="text-xs leading-relaxed text-foreground/80 mb-3">{g.content}</p>
                {g.evidence.length > 0 && (
                  <div className="border-t border-border/50 pt-2 mt-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">판단 근거:</p>
                    <div className="space-y-1">
                      {g.evidence.map((ev, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <span className={`text-[9px] mt-0.5 ${ev.startsWith("⚠") ? "text-orange-500" : "text-muted-foreground"}`}>
                            {ev.startsWith("⚠") ? "⚠" : "•"}
                          </span>
                          <span className="text-[10px] text-muted-foreground leading-relaxed">
                            {ev.startsWith("⚠ ") ? ev.slice(2) : ev}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>



    </div>
  );
}
