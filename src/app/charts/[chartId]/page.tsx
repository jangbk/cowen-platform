"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Star,
  Share2,
  Maximize2,
  Loader2,
  Lightbulb,
  Info,
} from "lucide-react";
import { getChartById, CHART_CATALOG } from "@/data/chart-catalog";
import type { ChartPriceLine, OverlaySeries } from "@/components/dashboard/LightweightChartWrapper";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "All"] as const;

// ─── Chart Insight System ─────────────────────────────────────────────
interface ChartBand {
  label: string;
  range: string;
  color: string; // tailwind bg class
  description: string;
}

interface ChartInsightConfig {
  metric: string;
  unit: string;
  bands: ChartBand[];
  getInsight: (value: number) => { text: string; type: "bullish" | "bearish" | "caution" | "neutral" };
  reference: string; // 지표 설명
}

const CHART_INSIGHTS: Record<string, ChartInsightConfig> = {
  "btc-risk-signal": {
    metric: "RSI (14일)",
    unit: "",
    bands: [
      { label: "극도 과매도", range: "0 – 20", color: "bg-emerald-600", description: "극히 드문 매수 기회. 역사적으로 바닥 형성 구간." },
      { label: "과매도", range: "20 – 30", color: "bg-emerald-400", description: "매수 관심 구간. 반등 가능성이 높아지는 영역." },
      { label: "중립 (약세)", range: "30 – 50", color: "bg-blue-400", description: "시장이 약세 또는 횡보 중. 관망하며 추이 확인." },
      { label: "중립 (강세)", range: "50 – 70", color: "bg-amber-400", description: "상승 추세 진행 중. 보유 유지, 추가 매수 신중." },
      { label: "과매수", range: "70 – 80", color: "bg-orange-500", description: "과열 경고. 단기 조정 가능성, 부분 이익 실현 고려." },
      { label: "극도 과매수", range: "80 – 100", color: "bg-red-500", description: "극도의 과열! 급락 위험이 매우 높음. 출구 전략 실행." },
    ],
    getInsight: (v) => {
      if (v >= 80) return { text: `RSI ${v.toFixed(1)} - 극도의 과매수 구간입니다! 시장 과열 상태이며, 급격한 조정이 임박할 수 있습니다. 단계적 이익 실현을 강력히 권장합니다. 역사적으로 이 수준에서 20-40% 하락이 빈번했습니다.`, type: "bearish" };
      if (v >= 70) return { text: `RSI ${v.toFixed(1)} - 과매수 구간에 진입했습니다. 단기 조정 가능성이 높아지고 있으며, 추가 매수는 자제하고 부분 이익 실현을 고려하세요. 상승 추세가 강하면 80 이상까지도 갈 수 있지만 리스크가 큽니다.`, type: "caution" };
      if (v >= 50) return { text: `RSI ${v.toFixed(1)} - 상승 모멘텀이 유지되는 건강한 구간입니다. 기존 포지션 유지가 적절하며, 상승 추세 내 눌림목 매수 전략이 유효합니다. 70 이상 진입 시 경계를 강화하세요.`, type: "bullish" };
      if (v >= 30) return { text: `RSI ${v.toFixed(1)} - 중립~약세 구간입니다. 방향성이 불명확하며 관망이 적절합니다. 30 이하로 하락 시 매수 기회가 될 수 있으므로 자금을 준비해두세요.`, type: "neutral" };
      if (v >= 20) return { text: `RSI ${v.toFixed(1)} - 과매도 구간입니다! 공포가 지배하는 시장이지만, 역사적으로 이 수준은 우수한 매수 진입점입니다. DCA 전략으로 분할 매수를 시작하는 것이 현명합니다.`, type: "bullish" };
      return { text: `RSI ${v.toFixed(1)} - 극도의 과매도! 극히 드문 매수 기회입니다. 역사적으로 이 수준에서 매수한 투자자는 1년 내 평균 100%+ 수익을 기록했습니다. 적극적인 축적을 고려하세요.`, type: "bullish" };
    },
    reference: "RSI(상대강도지수)는 최근 14일간의 가격 변동에서 상승폭과 하락폭의 비율을 0-100으로 나타낸 모멘텀 지표입니다. 30 이하는 과매도(매수 신호), 70 이상은 과매수(매도 신호)로 해석합니다. 비트코인의 경우 강한 상승장에서는 RSI가 80-95까지 올라가기도 하며, 약세장에서는 20-30 구간에서 반등하는 패턴을 반복합니다.",
  },
  "mvrv-zscore": {
    metric: "MVRV Z-Score",
    unit: "",
    bands: [
      { label: "극도 저평가", range: "Z < -1", color: "bg-emerald-600", description: "역사적 바닥 구간. 최적의 장기 매수 시점." },
      { label: "저평가", range: "-1 ~ 0", color: "bg-emerald-400", description: "실현 가치 대비 저렴. 축적 유리." },
      { label: "적정 가치", range: "0 ~ 2", color: "bg-blue-400", description: "시장 가치와 실현 가치가 균형." },
      { label: "고평가", range: "2 ~ 4", color: "bg-orange-500", description: "실현 가치 대비 프리미엄. 이익 실현 고려." },
      { label: "극도 고평가", range: "Z > 4", color: "bg-red-500", description: "버블 영역. 역사적 사이클 고점." },
    ],
    getInsight: (v) => {
      if (v >= 4) return { text: `MVRV Z-Score ${v.toFixed(2)} - 극도의 고평가 구간! 시장 가치가 실현 가치를 크게 상회합니다. 역사적으로 Z-Score 4+ 에서 사이클 고점이 형성되었습니다. 단계적 이익 실현을 강력히 권장합니다.`, type: "bearish" };
      if (v >= 2) return { text: `MVRV Z-Score ${v.toFixed(2)} - 고평가 구간입니다. 대부분의 보유자가 이익 상태이며, 이익 실현 압력이 증가할 수 있습니다. 출구 전략을 준비하세요.`, type: "caution" };
      if (v >= 0) return { text: `MVRV Z-Score ${v.toFixed(2)} - 적정 가치 구간입니다. 시장 가치와 실현 가치가 균형을 이루고 있어, 장기 투자자에게 합리적인 영역입니다.`, type: "neutral" };
      if (v >= -1) return { text: `MVRV Z-Score ${v.toFixed(2)} - 저평가 구간입니다. 시장 가치가 실현 가치 이하로, DCA 전략으로 분할 매수를 시작하기 좋은 시기입니다.`, type: "bullish" };
      return { text: `MVRV Z-Score ${v.toFixed(2)} - 극도의 저평가! 역사적으로 최고의 축적 기회입니다. 대부분의 보유자가 손실 상태이며, 바닥 형성 구간입니다.`, type: "bullish" };
    },
    reference: "MVRV Z-Score는 비트코인의 시장 가치(Market Value)와 실현 가치(Realized Value)의 차이를 표준편차로 나눈 지표입니다. 여기서는 가격과 200일 이동평균의 편차를 표준편차로 정규화하여 근사합니다. Z-Score가 4+ 이면 역사적 고점(매도 시그널), 0 이하이면 저점(매수 시그널)으로 해석합니다.",
  },
  "reserve-risk": {
    metric: "비트코인 가격 기반",
    unit: "$",
    bands: [
      { label: "매우 낮은 리스크", range: "녹색 밴드", color: "bg-emerald-600", description: "장기 보유자 신뢰 매우 높음. 최적의 매수 시점." },
      { label: "낮은 리스크", range: "연녹색 밴드", color: "bg-emerald-400", description: "보유자 신뢰 높음. 축적에 유리한 시기." },
      { label: "중립 리스크", range: "노란색 밴드", color: "bg-amber-400", description: "신뢰와 가격이 균형. 보유 유지." },
      { label: "높은 리스크", range: "주황색 밴드", color: "bg-orange-500", description: "가격이 보유자 신뢰를 초과. 주의." },
      { label: "매우 높은 리스크", range: "빨간색 밴드", color: "bg-red-500", description: "극도의 과열. 사이클 고점 근처." },
    ],
    getInsight: (v) => {
      if (v >= 90000) return { text: `BTC $${v.toLocaleString()} - Reserve Risk 관점에서 가격이 높아 장기 보유자 대비 리스크가 증가하고 있습니다. 장기 보유자의 이익 실현 가능성이 높아지며, 신규 매수보다는 기존 포지션 관리에 집중하세요.`, type: "caution" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - Reserve Risk가 중간 수준입니다. 장기 보유자(HODLer)의 신뢰가 가격을 지지하고 있으나, 추가 상승 시 리스크 보상 비율이 감소합니다.`, type: "neutral" };
      if (v >= 30000) return { text: `BTC $${v.toLocaleString()} - Reserve Risk가 낮은 구간으로, 장기 보유자의 강한 확신이 있는 상태입니다. 리스크 대비 보상이 매력적인 축적 구간입니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - Reserve Risk가 매우 낮습니다! 장기 보유자의 확신이 극대화된 상태이며, 역사적으로 이 수준은 비트코인의 바닥과 일치합니다. 최적의 장기 투자 진입점입니다.`, type: "bullish" };
    },
    reference: "Reserve Risk는 장기 보유자(HODLer)의 축적된 '기회비용(HODL Bank)'과 현재 가격의 비율입니다. 낮은 Reserve Risk = 장기 보유자의 신뢰가 높고 가격이 저렴 → 매수 유리. 높은 Reserve Risk = 보유자들이 이익 실현을 시작하고 가격이 과열 → 매도 고려. 이 지표는 '스마트 머니'의 행동을 추적하는 온체인 지표입니다.",
  },
  "fear-greed-index": {
    metric: "비트코인 가격 추이",
    unit: "$",
    bands: [
      { label: "극도의 공포", range: "0 – 20", color: "bg-emerald-600", description: "시장 전체가 패닉 상태. 역사적 최고의 매수 기회." },
      { label: "공포", range: "20 – 40", color: "bg-emerald-400", description: "투자자 심리 위축. 역발상 매수 고려 시점." },
      { label: "중립", range: "40 – 60", color: "bg-blue-400", description: "시장 방향성 불명확. 관망 또는 기존 전략 유지." },
      { label: "탐욕", range: "60 – 80", color: "bg-orange-500", description: "과도한 낙관. 추가 매수 자제, 리스크 관리 강화." },
      { label: "극도의 탐욕", range: "80 – 100", color: "bg-red-500", description: "FOMO 극대화. 역사적으로 고점 형성 구간. 매도 고려." },
    ],
    getInsight: (v) => {
      if (v >= 90000) return { text: `BTC $${v.toLocaleString()} - 가격 상승으로 시장 심리가 '탐욕' 영역에 있을 가능성이 높습니다. \"남들이 탐욕스러울 때 두려워하라\" - 워런 버핏. 신규 매수는 자제하고 이익 실현 전략을 준비하세요.`, type: "caution" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - 시장 심리가 중립~낙관적 수준입니다. 강한 상승 모멘텀이 있지만, 급격한 FOMO 매수는 피하세요. 계획된 전략에 따라 행동하는 것이 중요합니다.`, type: "neutral" };
      if (v >= 30000) return { text: `BTC $${v.toLocaleString()} - 시장 심리가 공포~중립 수준입니다. \"남들이 두려워할 때 탐욕스러워라\". 장기 관점에서 분할 매수(DCA)를 시작하기 좋은 시기입니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - 시장이 극도의 공포 상태입니다. 대부분의 투자자가 패닉 상태이며, 역사적으로 이런 시기가 최고의 매수 기회였습니다. 용기 있는 역발상 투자를 고려하세요.`, type: "bullish" };
    },
    reference: "Fear & Greed Index(공포·탐욕 지수)는 변동성, 거래량, 소셜미디어 감성, 설문조사, 도미넌스, 구글 트렌드 등 6가지 요소를 종합하여 0(극도의 공포)~100(극도의 탐욕)으로 산출합니다. 투자 심리의 극단은 반전 신호로 활용됩니다. '극도의 공포'에서 매수하고 '극도의 탐욕'에서 매도하는 역발상 전략이 역사적으로 우수한 성과를 보였습니다.",
  },
  "nupl": {
    metric: "비트코인 가격 기반 NUPL",
    unit: "$",
    bands: [
      { label: "항복 (Capitulation)", range: "NUPL < 0", color: "bg-red-600", description: "보유자 대부분 손실. 바닥 형성 구간. 매수 기회." },
      { label: "희망 / 공포", range: "0 – 0.25", color: "bg-orange-400", description: "시장 회복 초기. 불확실성 높지만 축적 유리." },
      { label: "낙관 / 불안", range: "0.25 – 0.5", color: "bg-amber-400", description: "상승 추세 확인. 건강한 시장 상태." },
      { label: "확신 / 부정", range: "0.5 – 0.75", color: "bg-emerald-400", description: "강세장 진행 중. 대부분 이익 상태." },
      { label: "행복감 (Euphoria)", range: "NUPL > 0.75", color: "bg-emerald-600", description: "극도의 이익. 사이클 고점 임박. 매도 고려." },
    ],
    getInsight: (v) => {
      if (v >= 90000) return { text: `BTC $${v.toLocaleString()} - NUPL 관점에서 '행복감(Euphoria)' 단계에 근접합니다. 전체 보유자의 미실현 이익이 극대화되어 있으며, 이익 실현 매도 압력이 폭발할 수 있습니다. 출구 전략을 실행하는 것이 현명합니다.`, type: "bearish" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - NUPL '확신' 단계로, 대부분의 투자자가 이익 상태입니다. 강세장이 진행 중이지만, 행복감 단계로의 전환을 주시하세요. 단계적 이익 실현과 보유를 병행하는 것이 좋습니다.`, type: "neutral" };
      if (v >= 40000) return { text: `BTC $${v.toLocaleString()} - NUPL '낙관' 단계입니다. 시장이 회복되고 있으며, 보유자들의 심리가 개선되고 있습니다. 장기 보유 전략을 유지하면서 추가 매수도 고려할 수 있습니다.`, type: "bullish" };
      if (v >= 20000) return { text: `BTC $${v.toLocaleString()} - NUPL '희망/공포' 단계입니다. 시장이 바닥에서 회복 중이며, 많은 투자자가 아직 손실 상태입니다. 역사적으로 이 구간은 장기 투자자에게 매우 유리한 축적 시기입니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - NUPL '항복(Capitulation)' 단계입니다! 대부분의 보유자가 손실 상태이며, 손절 매도가 극에 달합니다. 역사적으로 이 수준은 사이클의 절대 바닥과 일치하며, 최고의 매수 기회입니다.`, type: "bullish" };
    },
    reference: "NUPL(Net Unrealized Profit/Loss)은 전체 비트코인 보유자의 미실현 이익과 손실의 비율입니다. NUPL = (시장가치 - 실현가치) / 시장가치. NUPL > 0.75이면 '행복감' 단계로 사이클 고점, NUPL < 0이면 '항복' 단계로 사이클 저점을 나타냅니다. 2013, 2017, 2021년 고점에서 모두 NUPL 0.7+ 를 기록했습니다.",
  },
  // ─── Logarithmic Regression Charts ─────────────────────────────
  "btc-log-regression": {
    metric: "로그 회귀 밴드",
    unit: "$",
    bands: [
      { label: "하한 밴드 이하 (−2σ)", range: "녹색 선 아래", color: "bg-emerald-500", description: "극도의 저평가. 역사적 최고의 매수 구간." },
      { label: "하한 ~ 중앙선", range: "녹색 ~ 파란선", color: "bg-blue-400", description: "공정가치 이하. 장기 축적에 유리." },
      { label: "중앙선 부근", range: "파란선 주변", color: "bg-blue-600", description: "로그 회귀 공정가치. 적정 가격대." },
      { label: "중앙선 ~ 상한", range: "파란 ~ 빨간선", color: "bg-orange-500", description: "공정가치 이상. 과열 주의." },
      { label: "상한 밴드 이상 (+2σ)", range: "빨간선 위", color: "bg-red-500", description: "극도의 고평가. 버블 영역." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - 로그 회귀 상한 밴드에 근접하거나 초과했습니다. 역사적으로 이 영역에서 사이클 고점이 형성되었으며, 단계적 이익 실현이 현명합니다.`, type: "caution" };
      if (v >= 70000) return { text: `BTC $${v.toLocaleString()} - 로그 회귀 중앙선 위에 위치합니다. 상승 추세가 유지되고 있으나, 상한 밴드 접근 시 주의가 필요합니다.`, type: "neutral" };
      if (v >= 40000) return { text: `BTC $${v.toLocaleString()} - 로그 회귀 중앙선 부근으로, 장기 공정가치에 근접합니다. 합리적인 가격대이며 장기 보유에 적합합니다.`, type: "neutral" };
      return { text: `BTC $${v.toLocaleString()} - 로그 회귀 하한 밴드 근처로, 역사적 저평가 구간입니다. DCA 전략으로 적극적인 축적을 고려하세요.`, type: "bullish" };
    },
    reference: "비트코인 로그 회귀 밴드는 가격의 자연로그에 선형 회귀를 적용하여 장기 추세선(중앙)과 ±2 표준편차 밴드를 생성합니다. 중앙선은 로그 스케일에서의 공정가치를 나타내며, 상한/하한 밴드는 극도의 고평가/저평가 구간을 표시합니다. 2011년, 2013년, 2017년, 2021년 사이클 고점은 모두 상한 밴드 근처에서 형성되었습니다.",
  },
  "rainbow-chart": {
    metric: "레인보우 밴드",
    unit: "$",
    bands: [
      { label: "🔥 완전 불타는 세일", range: "최하단 (짙은 파랑)", color: "bg-indigo-900", description: "절대 바닥. 역사적으로 가장 좋은 매수 기회." },
      { label: "💰 매수!", range: "파랑", color: "bg-blue-700", description: "강력한 매수 신호. 장기 투자 최적구간." },
      { label: "📦 축적", range: "청록", color: "bg-cyan-600", description: "꾸준한 축적 구간. DCA 전략 적합." },
      { label: "💚 아직 저렴", range: "녹색", color: "bg-green-600", description: "공정가치 이하. 장기적으로 유리." },
      { label: "🟡 HODL!", range: "중앙 (노랑)", color: "bg-yellow-500", description: "공정가치. 보유 유지, 인내심 필요." },
      { label: "🔶 버블인가?", range: "주황", color: "bg-orange-500", description: "과열 시작. 추가 매수 자제." },
      { label: "🟠 FOMO 심화", range: "짙은 주황", color: "bg-orange-700", description: "FOMO 구간. 부분 이익 실현 고려." },
      { label: "🔴 매도! 진지하게!", range: "빨강", color: "bg-red-600", description: "강력한 매도 신호. 이익 실현 실행." },
      { label: "💥 최대 버블", range: "최상단 (짙은 빨강)", color: "bg-red-900", description: "극도의 버블. 사이클 고점. 출구 전략." },
    ],
    getInsight: (v) => {
      if (v >= 120000) return { text: `BTC $${v.toLocaleString()} - 레인보우 차트 상위 밴드(FOMO~버블)에 위치합니다. 역사적으로 이 영역은 사이클 고점에 해당하며, 단계적 이익 실현을 강력히 권장합니다.`, type: "bearish" };
      if (v >= 90000) return { text: `BTC $${v.toLocaleString()} - 레인보우 차트 중상위 밴드('버블인가?' 영역)에 위치합니다. 추가 매수는 자제하고, 상승 지속 시 이익 실현 계획을 수립하세요.`, type: "caution" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - 레인보우 차트 중앙 밴드(HODL 영역)에 위치합니다. 현재 가격은 장기 공정가치에 가까우며, 보유를 유지하는 것이 적절합니다.`, type: "neutral" };
      if (v >= 30000) return { text: `BTC $${v.toLocaleString()} - 레인보우 차트 하위 밴드(축적~아직 저렴)에 위치합니다. 장기 관점에서 매수 적기이며, DCA 전략이 효과적입니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - 레인보우 차트 최하단(불타는 세일!)에 위치합니다. 극히 드문 기회이며, 역사적으로 이 구간에서 매수한 투자자는 압도적인 수익을 거두었습니다.`, type: "bullish" };
    },
    reference: "비트코인 레인보우 차트는 로그 회귀 모델에 9개의 색상 밴드를 겹쳐 가격의 상대적 위치를 시각화합니다. 차가운 색(파랑)은 저평가, 따뜻한 색(빨강)은 고평가를 나타냅니다. 2011, 2013, 2017, 2021년 모든 사이클에서 고점은 빨간 밴드, 저점은 파란 밴드에서 형성되었습니다. 장기 투자 타이밍의 직관적 가이드입니다.",
  },
  "stock-to-flow": {
    metric: "S2F 모델 가격",
    unit: "$",
    bands: [
      { label: "모델 대비 극도 저평가", range: "실제가 ≪ S2F 모델가", color: "bg-emerald-600", description: "S2F 모델 기준 극도의 할인. 매수 기회." },
      { label: "모델 대비 저평가", range: "실제가 < S2F 모델가", color: "bg-emerald-400", description: "모델 공정가치 이하. 축적 유리." },
      { label: "모델 공정가치", range: "실제가 ≈ S2F 모델가", color: "bg-blue-400", description: "S2F 모델이 예측하는 공정가치 수준." },
      { label: "모델 대비 고평가", range: "실제가 > S2F 모델가", color: "bg-orange-500", description: "모델 예측 초과. 과열 가능성." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - S2F 모델의 현재 반감기 사이클(2024~2028) 예측 범위 내에 있습니다. 반감기 후 공급 감소가 가격을 지지하고 있으나, 모델의 한계도 인식해야 합니다.`, type: "neutral" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - S2F 모델 기준 합리적인 가격대입니다. 현재 S2F 비율(~120)은 금(S2F ~62)보다 높아, 희소성 측면에서 비트코인의 가치를 지지합니다.`, type: "neutral" };
      return { text: `BTC $${v.toLocaleString()} - S2F 모델 기준 저평가 구간입니다. 비트코인의 프로그래밍된 희소성(4년마다 반감기)이 장기 가치를 뒷받침하며, 현재 가격은 모델 예측 대비 매력적입니다.`, type: "bullish" };
    },
    reference: "Stock-to-Flow(S2F) 모델은 기존 재고(Stock)와 연간 신규 생산량(Flow)의 비율로 희소성을 측정합니다. 비트코인은 4년마다 반감기로 Flow가 절반으로 줄어 S2F가 급증합니다. 2024년 4차 반감기 후 S2F≈120으로 금(62)을 크게 초과합니다. 차트의 노란 선은 S2F 모델의 예측 가격이며, 실제가와 비교하여 고평가/저평가를 판단합니다. ⚠️ S2F 모델은 수요를 무시하는 한계가 있어 참고 지표로만 활용해야 합니다.",
  },
  "power-law-corridor": {
    metric: "거듭제곱 법칙 회랑",
    unit: "$",
    bands: [
      { label: "하한 회랑 이하", range: "녹색 선 아래", color: "bg-emerald-500", description: "거듭제곱 법칙 지지선 이하. 극도의 저평가." },
      { label: "하한 ~ 중앙선", range: "녹색 ~ 보라선", color: "bg-blue-400", description: "회랑 하단. 축적에 유리한 가격대." },
      { label: "중앙선 (추세)", range: "보라선 주변", color: "bg-violet-500", description: "거듭제곱 법칙 추세선. 장기 공정가치." },
      { label: "중앙선 ~ 상한", range: "보라 ~ 빨간선", color: "bg-orange-500", description: "회랑 상단 접근. 과열 주의." },
      { label: "상한 회랑 이상", range: "빨간선 위", color: "bg-red-500", description: "거듭제곱 법칙 저항선 돌파. 버블 영역." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - 거듭제곱 법칙 회랑의 상한에 근접합니다. 장기 추세 대비 과열 구간이며, 회랑 상한 돌파 시 단기 조정 가능성이 높아집니다.`, type: "caution" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - 거듭제곱 법칙 회랑 내에 위치합니다. 장기 추세선 주변으로 건강한 가격대입니다. 비트코인의 채택 곡선이 거듭제곱 법칙을 따르고 있음을 시사합니다.`, type: "neutral" };
      return { text: `BTC $${v.toLocaleString()} - 거듭제곱 법칙 회랑 하단에 위치합니다. 장기 추세 대비 저평가 구간이며, 역사적으로 이 영역은 축적 최적기입니다.`, type: "bullish" };
    },
    reference: "거듭제곱 법칙(Power Law)은 비트코인 가격이 시간의 거듭제곱 함수를 따른다는 모델입니다: ln(가격) = a × ln(일수) + b. 제네시스 블록(2009.1.3)부터의 일수를 로그 변환하면 가격과 선형 관계를 보입니다. 회랑은 이 추세선의 ±2σ 밴드로, 상한은 사이클 고점, 하한은 사이클 저점과 일치합니다. Harold Christopher Burger가 제안한 이 모델은 13년 이상의 데이터에서 높은 적합도를 보입니다.",
  },
  "btc-vs-gold-roi": {
    metric: "BTC vs 금 수익률", unit: "$",
    bands: [
      { label: "금 우위", range: "BTC < 금", color: "bg-amber-500", description: "금이 비트코인을 아웃퍼폼. 안전자산 선호." },
      { label: "비슷한 성과", range: "BTC ≈ 금", color: "bg-blue-400", description: "두 자산 성과 유사. 분산 투자 유효." },
      { label: "BTC 우위", range: "BTC > 금", color: "bg-emerald-400", description: "비트코인 아웃퍼폼. 리스크온 시장." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - 비트코인은 '디지털 금'으로서 전통 금의 수익률을 크게 상회하고 있습니다. 높은 가격대에서는 변동성 위험도 커지므로, 금과의 분산 투자가 포트폴리오 안정성을 높여줍니다.`, type: "neutral" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - 비트코인이 금 대비 강한 수익률을 보이고 있습니다. 두 자산 모두 인플레이션 헤지 역할을 하지만, BTC는 높은 변동성을 대가로 더 높은 수익을 제공합니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - 현재 가격대에서 비트코인은 금 대비 매력적인 장기 수익 잠재력을 보유합니다. 금의 시총($15T) 대비 BTC 시총이 아직 작아 성장 여지가 있습니다.`, type: "bullish" };
    },
    reference: "비트코인과 금은 모두 '가치 저장 수단'으로 비교됩니다. 금의 시가총액은 약 $15조, 비트코인은 약 $2조로 BTC가 금의 시총에 근접할 경우 1 BTC ≈ $700K입니다. 비트코인은 이동성, 분할성, 검증성에서 금보다 우수하지만, 역사가 짧고 변동성이 큽니다.",
  },
  "btc-vs-sp500-roi": {
    metric: "BTC vs S&P 500", unit: "$",
    bands: [
      { label: "주식 우위", range: "BTC < S&P", color: "bg-red-400", description: "S&P가 아웃퍼폼. 전통 시장 강세." },
      { label: "비슷한 성과", range: "BTC ≈ S&P", color: "bg-blue-400", description: "상관관계 높은 구간." },
      { label: "BTC 우위", range: "BTC > S&P", color: "bg-emerald-400", description: "비트코인 아웃퍼폼. 알파 창출." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - 비트코인은 S&P 500의 연평균 수익률(~10%)을 크게 상회하는 성과를 보이고 있습니다. 하지만 높은 변동성을 감안해 전체 포트폴리오의 5-20% 비중이 권장됩니다.`, type: "neutral" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - BTC는 S&P 500 대비 우수한 수익률을 보이는 구간입니다. 2024년 비트코인 ETF 승인 이후 기관 투자자의 포트폴리오 편입이 증가하고 있습니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - 현재 가격에서 비트코인의 리스크/보상 비율이 매력적입니다. 장기적으로 S&P 500을 아웃퍼폼할 잠재력이 있으나, 단기 변동성에 대한 대비가 필요합니다.`, type: "bullish" };
    },
    reference: "S&P 500은 미국 대형주 500개의 지수로 연평균 약 10%의 수익률을 기록합니다. 비트코인은 설립 이래 연평균 200%+ 수익률을 보이지만, -50~80%의 급락도 수차례 경험했습니다. 2024년 비트코인 현물 ETF 승인으로 전통 금융과의 상관관계가 변화하고 있습니다.",
  },
  // ═══════════════════════════════════════════════════════════════
  // MOVING AVERAGES
  // ═══════════════════════════════════════════════════════════════
  "200-week-ma": {
    metric: "200주 이동평균", unit: "$",
    bands: [
      { label: "200W MA 이하", range: "가격 < MA", color: "bg-emerald-500", description: "극도의 저평가. 역사적 바닥 구간. 최적의 매수." },
      { label: "200W MA 근접", range: "가격 ≈ MA", color: "bg-blue-400", description: "장기 지지선 테스트. 중요한 분기점." },
      { label: "200W MA 위 (1~2배)", range: "MA ~ 2×MA", color: "bg-emerald-400", description: "건강한 상승. 보유 유지." },
      { label: "200W MA 대비 과열", range: "> 2×MA", color: "bg-red-500", description: "200주 MA 대비 극도 괴리. 사이클 고점 주의." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - 200주 이동평균 대비 상당히 높은 위치입니다. 역사적으로 가격이 200주 MA의 2배를 초과하면 사이클 고점에 근접합니다. 장기 평균으로의 회귀 가능성에 유의하세요.`, type: "caution" };
      if (v >= 50000) return { text: `BTC $${v.toLocaleString()} - 200주 이동평균 위에서 안정적으로 거래되고 있습니다. 장기 상승 추세가 유지되고 있으며, 이 MA는 역사적으로 강력한 지지선 역할을 합니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - 200주 이동평균에 근접하거나 하회하는 구간입니다. 역사적으로 비트코인이 200주 MA 아래로 내려간 적은 사이클 바닥뿐이며, 최고의 매수 기회입니다.`, type: "bullish" };
    },
    reference: "200주 이동평균(약 4년)은 비트코인의 가장 신뢰할 수 있는 장기 지지선입니다. 비트코인 역사상 200주 MA 아래로 하락한 것은 각 사이클의 절대 바닥에서만 발생했습니다(2015, 2018, 2022). 이 지표는 '스마트 머니'가 장기 매수 결정에 참고하는 핵심 지표입니다.",
  },
  "pi-cycle-top": {
    metric: "Pi Cycle Top", unit: "$",
    bands: [
      { label: "111D MA < 350D MA×2", range: "정상 구간", color: "bg-emerald-400", description: "두 MA가 분리. 사이클 고점 신호 없음." },
      { label: "크로스 접근", range: "차이 < 5%", color: "bg-orange-500", description: "두 MA 수렴 중. 고점 경고." },
      { label: "크로스 발생!", range: "111D > 350D×2", color: "bg-red-500", description: "매도 신호! 역사적으로 3일 내 고점." },
    ],
    getInsight: (v) => {
      if (v >= 120000) return { text: `BTC $${v.toLocaleString()} - Pi Cycle 고점 지표를 주시해야 합니다. 111일 MA가 350일 MA×2에 접근할수록 사이클 고점 신호가 강해집니다. 이 지표는 2013, 2017, 2021년 고점을 3일 이내 정확도로 예측했습니다.`, type: "caution" };
      if (v >= 70000) return { text: `BTC $${v.toLocaleString()} - 현재 111일 MA와 350일 MA×2 사이에 괴리가 있어 Pi Cycle 고점 신호는 아직 발생하지 않았습니다. 상승 여력이 남아있음을 시사합니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - Pi Cycle 지표가 정상 구간입니다. 두 이동평균 사이의 거리가 크며, 사이클 고점까지 상당한 시간과 가격 상승이 필요합니다.`, type: "bullish" };
    },
    reference: "Pi Cycle Top은 111일 MA와 350일 MA×2의 크로스오버로 사이클 고점을 예측합니다. 111 × π ≈ 350이라는 수학적 관계에서 이름이 유래했습니다. 2013($1,130), 2017($19,600), 2021($64,800) 고점을 모두 3일 내 정확도로 예측한 놀라운 지표입니다.",
  },
  "golden-ratio-multiplier": {
    metric: "황금비 멀티플라이어", unit: "$",
    bands: [
      { label: "350D MA 이하", range: "극도 저평가", color: "bg-emerald-600", description: "장기 MA 이하. 바닥 구간." },
      { label: "350D MA ~ ×1.6", range: "축적 구간", color: "bg-emerald-400", description: "황금비율 첫째 밴드. 매수 유리." },
      { label: "×1.6 ~ ×2.6", range: "상승 구간", color: "bg-blue-400", description: "건강한 상승. 보유 유지." },
      { label: "×2.6 ~ ×3.6", range: "과열 접근", color: "bg-orange-500", description: "과열 주의. 부분 이익 실현." },
      { label: "> ×3.6", range: "극도 과열", color: "bg-red-500", description: "사이클 고점. 매도 고려." },
    ],
    getInsight: (v) => {
      if (v >= 120000) return { text: `BTC $${v.toLocaleString()} - 350일 MA의 황금비 상위 밴드에 접근 중입니다. 가격이 ×2.6 이상 밴드에 진입하면 역사적으로 사이클 고점이 형성됩니다. 단계적 이익 실현을 계획하세요.`, type: "caution" };
      if (v >= 70000) return { text: `BTC $${v.toLocaleString()} - 황금비 밴드 중간 구간에 위치합니다. 상승 추세가 유지되고 있으며, 상위 밴드까지 여력이 남아있습니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - 황금비 밴드 하위 구간으로, 장기 투자자에게 유리한 매수 영역입니다. 350일 MA 근처는 역사적으로 뛰어난 진입점입니다.`, type: "bullish" };
    },
    reference: "Golden Ratio Multiplier는 350일 MA에 황금비율(1.6) 배수를 적용하여 밴드를 생성합니다: 350MA × 1.6, × 2, × 2.6, × 3, × 3.6, × 5, × 8. 각 밴드는 매 사이클마다 가격 천장/바닥으로 작동했으며, 황금비(φ = 1.618)의 수학적 아름다움이 시장에 반영됩니다.",
  },
  "2y-ma-multiplier": {
    metric: "2년 MA 멀티플라이어", unit: "$",
    bands: [
      { label: "2Y MA 이하", range: "가격 < 2년 MA", color: "bg-emerald-600", description: "극도 저평가. 역사적 바닥. 매수 최적기." },
      { label: "2Y MA ~ ×2.5", range: "정상 범위", color: "bg-blue-400", description: "건강한 가격대. 장기 보유." },
      { label: "2Y MA ×2.5 ~ ×5", range: "과열 접근", color: "bg-orange-500", description: "상단 밴드 접근. 주의." },
      { label: "> 2Y MA ×5", range: "극도 과열", color: "bg-red-500", description: "상단 밴드 돌파. 매도 신호." },
    ],
    getInsight: (v) => {
      if (v >= 120000) return { text: `BTC $${v.toLocaleString()} - 2년 MA ×5 상단 밴드에 접근 중입니다. 이 밴드를 터치하면 역사적으로 사이클 고점이 형성됩니다. 2017년, 2021년 고점 모두 이 밴드에서 발생했습니다.`, type: "caution" };
      if (v >= 60000) return { text: `BTC $${v.toLocaleString()} - 2년 MA와 ×5 상단 밴드 사이의 건강한 구간입니다. 이 범위에서 매수/보유 전략이 적절하며, 상단 밴드 접근 시 경계를 강화하세요.`, type: "neutral" };
      return { text: `BTC $${v.toLocaleString()} - 2년 MA 하단에 근접한 매수 영역입니다. 이 지표의 하단 밴드(2년 MA 자체)는 매 사이클마다 완벽한 바닥 지지선으로 작동했습니다.`, type: "bullish" };
    },
    reference: "2년 MA 멀티플라이어는 730일 이동평균(하단)과 그 5배(상단) 사이의 채널입니다. 비트코인이 하단 MA 아래로 내려가면 극도의 저평가(매수), 상단 ×5 밴드를 터치하면 극도의 과열(매도)입니다. 2011, 2013, 2017, 2021년 고점 모두 ×5 밴드에서 형성되었습니다.",
  },
  // ═══════════════════════════════════════════════════════════════
  // MOMENTUM
  // ═══════════════════════════════════════════════════════════════
  "btc-rsi": {
    metric: "RSI (14일)", unit: "",
    bands: [
      { label: "과매도", range: "0 – 30", color: "bg-emerald-500", description: "매수 관심. 반등 가능성 높음." },
      { label: "중립", range: "30 – 70", color: "bg-blue-400", description: "정상 범위. 추세 방향 확인." },
      { label: "과매수", range: "70 – 100", color: "bg-red-500", description: "매도 관심. 조정 가능성." },
    ],
    getInsight: (v) => {
      if (v >= 70) return { text: `RSI ${v.toFixed(1)} - 과매수 구간입니다. 단기 조정 가능성이 높아지고 있으며, 신규 매수보다 기존 포지션 관리에 집중하세요.`, type: "caution" };
      if (v >= 30) return { text: `RSI ${v.toFixed(1)} - 중립 구간입니다. 방향성이 명확하지 않으며, 추세 확인 후 진입이 적절합니다.`, type: "neutral" };
      return { text: `RSI ${v.toFixed(1)} - 과매도 구간입니다! 반등 가능성이 높으며, 역사적으로 우수한 매수 진입점입니다.`, type: "bullish" };
    },
    reference: "RSI(상대강도지수)는 14일간 상승/하락폭 비율을 0~100으로 나타냅니다. 30 이하는 과매도(매수), 70 이상은 과매수(매도) 신호입니다.",
  },
  "btc-macd": {
    metric: "MACD 히스토그램", unit: "",
    bands: [
      { label: "강한 매도", range: "큰 음수", color: "bg-red-500", description: "하락 모멘텀 극대화. 반전 대기." },
      { label: "약세", range: "소폭 음수", color: "bg-orange-400", description: "하락 모멘텀 약화 중. 반전 조짐." },
      { label: "제로라인", range: "0 부근", color: "bg-blue-400", description: "추세 전환 분기점. 방향 확인 필요." },
      { label: "강세", range: "소폭 양수", color: "bg-emerald-400", description: "상승 모멘텀 형성 중." },
      { label: "강한 매수", range: "큰 양수", color: "bg-emerald-600", description: "상승 모멘텀 극대화. 과열 주의." },
    ],
    getInsight: (v) => {
      if (v > 2000) return { text: `MACD 히스토그램 ${v.toFixed(0)} - 상승 모멘텀이 매우 강합니다. 추세가 유지되고 있으나, 극단적으로 높은 값은 단기 조정의 전조일 수 있습니다.`, type: "caution" };
      if (v > 0) return { text: `MACD 히스토그램 ${v.toFixed(0)} - 상승 모멘텀입니다. MACD 라인이 시그널 라인 위에 있어 매수 신호가 유효합니다.`, type: "bullish" };
      if (v > -2000) return { text: `MACD 히스토그램 ${v.toFixed(0)} - 하락 모멘텀이지만 약화되고 있다면 반전 신호일 수 있습니다. 히스토그램이 0선을 상향 돌파할 때 매수 타이밍입니다.`, type: "neutral" };
      return { text: `MACD 히스토그램 ${v.toFixed(0)} - 강한 하락 모멘텀입니다. 추세 반전 신호가 나타날 때까지 관망이 적절합니다.`, type: "bearish" };
    },
    reference: "MACD(이동평균 수렴·확산)는 12일 EMA와 26일 EMA의 차이(MACD 라인)에서 9일 시그널 라인을 뺀 히스토그램입니다. 히스토그램이 양수이면 상승 모멘텀, 음수이면 하락 모멘텀이며, 0선 크로스는 추세 전환 신호입니다.",
  },
  "stochastic-rsi": {
    metric: "스토캐스틱 RSI", unit: "",
    bands: [
      { label: "과매도", range: "0 – 20", color: "bg-emerald-500", description: "극도 과매도. 매수 기회." },
      { label: "중립", range: "20 – 80", color: "bg-blue-400", description: "정상 범위." },
      { label: "과매수", range: "80 – 100", color: "bg-red-500", description: "극도 과매수. 조정 임박." },
    ],
    getInsight: (v) => {
      if (v >= 80) return { text: `스토캐스틱 RSI ${v.toFixed(1)} - 극도의 과매수입니다. RSI 자체가 이미 과열인 상태에서 스토캐스틱마저 과매수이므로, 단기 조정 확률이 매우 높습니다.`, type: "bearish" };
      if (v >= 20) return { text: `스토캐스틱 RSI ${v.toFixed(1)} - 중립 구간입니다. 추세 방향에 따라 매매 결정을 하세요.`, type: "neutral" };
      return { text: `스토캐스틱 RSI ${v.toFixed(1)} - 극도의 과매도! 반등 확률이 매우 높으며, 단기 매수 타이밍으로 활용할 수 있습니다.`, type: "bullish" };
    },
    reference: "스토캐스틱 RSI는 RSI에 스토캐스틱 공식을 적용한 이중 모멘텀 오실레이터입니다. RSI보다 민감하게 과매수/과매도를 포착하며, 20 이하(과매도), 80 이상(과매수)으로 해석합니다.",
  },
  // ═══════════════════════════════════════════════════════════════
  // TECHNICAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════
  "btc-support-resistance": {
    metric: "지지/저항", unit: "$",
    bands: [
      { label: "주요 지지선", range: "하락 시 반등 예상", color: "bg-emerald-500", description: "매수세 집중. 하방 지지." },
      { label: "현재 가격대", range: "현 거래 범위", color: "bg-blue-400", description: "현재 균형 영역." },
      { label: "주요 저항선", range: "상승 시 압력 예상", color: "bg-red-500", description: "매도세 집중. 돌파 필요." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - $100K는 강력한 심리적 저항/지지선입니다. 이 레벨 위에서 안착하면 다음 저항은 $120K~$150K 구간이며, 이탈 시 $90K 지지선이 중요합니다.`, type: "neutral" };
      if (v >= 70000) return { text: `BTC $${v.toLocaleString()} - $69K(2021 ATH)를 돌파한 상태입니다. 현재 주요 지지선은 $70K~$75K, 저항선은 $100K입니다.`, type: "bullish" };
      return { text: `BTC $${v.toLocaleString()} - 주요 지지선 아래입니다. 이전 고점과 심리적 라운드 넘버가 향후 저항선으로 작용할 수 있습니다.`, type: "neutral" };
    },
    reference: "지지선은 하락 시 매수세가 집중되어 가격이 반등하는 레벨, 저항선은 상승 시 매도세가 집중되어 가격이 하락하는 레벨입니다. 라운드 넘버($50K, $100K), 이전 고점/저점, 대량 거래 구간이 주요 지지/저항으로 작동합니다.",
  },
  "btc-fibonacci": (() => {
    // 사이클 고점/저점 기준 피보나치 레벨 계산
    const FIB_HIGH = 109000, FIB_LOW = 15500;
    const R = FIB_HIGH - FIB_LOW;
    const fib236 = FIB_HIGH - R * 0.236; // ~86,934
    const fib382 = FIB_HIGH - R * 0.382; // ~73,282
    const fib500 = FIB_HIGH - R * 0.5;   // ~62,250
    const fib618 = FIB_HIGH - R * 0.618; // ~51,218
    const fib786 = FIB_HIGH - R * 0.786; // ~35,541
    const fmt = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return {
      metric: "피보나치 되돌림", unit: "$",
      bands: [
        { label: `0.236 되돌림 — ${fmt(fib236)}`, range: `${fmt(FIB_HIGH)} → ${fmt(fib236)}`, color: "bg-emerald-400", description: `강한 추세에서의 얕은 조정. 가격이 ${fmt(fib236)} 위에 있으면 상승 추세 건재.` },
        { label: `0.382 되돌림 — ${fmt(fib382)}`, range: `${fmt(fib236)} → ${fmt(fib382)}`, color: "bg-blue-400", description: `건강한 조정 구간. ${fmt(fib382)}에서 반등하면 상승 재개 신호.` },
        { label: `0.5 되돌림 — ${fmt(fib500)}`, range: `${fmt(fib382)} → ${fmt(fib500)}`, color: "bg-amber-400", description: `추세의 절반 되돌림. ${fmt(fib500)}은 심리적 핵심 분기점.` },
        { label: `0.618 되돌림 — ${fmt(fib618)}`, range: `${fmt(fib500)} → ${fmt(fib618)}`, color: "bg-orange-500", description: `황금비율. ${fmt(fib618)}은 '마지막 지지선'으로 반등 확률 최고.` },
        { label: `0.786 되돌림 — ${fmt(fib786)}`, range: `${fmt(fib618)} → ${fmt(fib786)}`, color: "bg-red-500", description: `추세 붕괴 직전. ${fmt(fib786)} 이하 시 전체 상승분 반납 위험.` },
      ],
      getInsight: (v: number) => {
        const pos = (FIB_HIGH - v) / R; // 되돌림 비율
        if (v >= FIB_HIGH * 0.98) return { text: `BTC ${fmt(v)} — 사이클 고점(${fmt(FIB_HIGH)}) 근처입니다. 되돌림 비율 ${(pos * 100).toFixed(1)}%. 조정 시 1차 지지 0.236(${fmt(fib236)}), 2차 지지 0.382(${fmt(fib382)}).`, type: "neutral" as const };
        if (v >= fib236) return { text: `BTC ${fmt(v)} — 0.236 레벨(${fmt(fib236)}) 위, 되돌림 ${(pos * 100).toFixed(1)}%. 얕은 조정 구간으로 상승 추세가 강력합니다. ${fmt(fib236)}이 지지되면 고점 재도전 가능.`, type: "bullish" as const };
        if (v >= fib382) return { text: `BTC ${fmt(v)} — 0.236~0.382 사이, 되돌림 ${(pos * 100).toFixed(1)}%. 건강한 조정 구간입니다. 0.382 지지선(${fmt(fib382)})에서 반등 시 강세 지속 신호.`, type: "bullish" as const };
        if (v >= fib500) return { text: `BTC ${fmt(v)} — 0.382~0.5 사이, 되돌림 ${(pos * 100).toFixed(1)}%. 핵심 분기점입니다. 0.5(${fmt(fib500)})가 무너지면 약세 전환 주의. 이 구간에서 DCA 시작 고려.`, type: "caution" as const };
        if (v >= fib618) return { text: `BTC ${fmt(v)} — 0.5~0.618 사이, 되돌림 ${(pos * 100).toFixed(1)}%. 황금비율(${fmt(fib618)})은 역사적으로 가장 강한 반등 지점입니다. 적극적 매수 영역.`, type: "bullish" as const };
        if (v >= fib786) return { text: `BTC ${fmt(v)} — 0.618~0.786 사이, 되돌림 ${(pos * 100).toFixed(1)}%. 깊은 조정입니다. ${fmt(fib786)}이 마지막 방어선으로, 이탈 시 전체 상승분 반납 위험.`, type: "bearish" as const };
        return { text: `BTC ${fmt(v)} — 0.786 이하, 되돌림 ${(pos * 100).toFixed(1)}%. 상승 추세 완전 붕괴 구간입니다. 새로운 바닥 형성 과정으로, 장기 축적 기회이나 추가 하락 주의.`, type: "bearish" as const };
      },
      reference: `피보나치 되돌림은 사이클 고점(${fmt(FIB_HIGH)})과 저점(${fmt(FIB_LOW)}) 사이의 0.236, 0.382, 0.5, 0.618, 0.786 레벨에서 가격이 반등하는 경향을 활용합니다. 특히 0.618(황금비율, ${fmt(fib618)})은 자연과 금융시장에서 가장 빈번하게 나타나는 되돌림 수준으로, '마지막 지지선'으로 불립니다. 현재 사이클 기준 주요 레벨: 0.236=${fmt(fib236)}, 0.382=${fmt(fib382)}, 0.5=${fmt(fib500)}, 0.618=${fmt(fib618)}, 0.786=${fmt(fib786)}.`,
    };
  })(),
  "btc-bollinger": {
    metric: "볼린저 밴드", unit: "$",
    bands: [
      { label: "하단 밴드 이하", range: "< 하단 (−2σ)", color: "bg-emerald-500", description: "과매도. 평균 회귀 반등 예상." },
      { label: "하단 ~ 중간", range: "하단 ~ 중간밴드", color: "bg-blue-400", description: "약세~중립. 반등 관찰." },
      { label: "중간밴드 부근", range: "20일 SMA 근처", color: "bg-blue-500", description: "균형점. 방향 탐색 중." },
      { label: "중간 ~ 상단", range: "중간 ~ 상단밴드", color: "bg-orange-400", description: "강세. 상단 밴드 워킹 가능." },
      { label: "상단 밴드 이상", range: "> 상단 (+2σ)", color: "bg-red-500", description: "과매수. 평균 회귀 하락 예상." },
    ],
    getInsight: (v) => {
      if (v >= 100000) return { text: `BTC $${v.toLocaleString()} - 볼린저 상단 밴드에 근접합니다. '밴드 워킹'(상단 밴드를 따라 상승) 중이라면 강한 추세이지만, 밴드 이탈 후에는 평균 회귀 가능성이 높습니다.`, type: "caution" };
      if (v >= 70000) return { text: `BTC $${v.toLocaleString()} - 볼린저 밴드 중상위에 위치합니다. 밴드 폭이 넓어지면 추세 강화, 좁아지면 큰 움직임(Squeeze) 대기를 의미합니다.`, type: "neutral" };
      return { text: `BTC $${v.toLocaleString()} - 볼린저 하단 밴드 부근입니다. 통계적으로 가격의 95%가 밴드 내에서 움직이므로, 하단 밴드 터치는 평균 회귀(반등) 신호입니다.`, type: "bullish" };
    },
    reference: "볼린저 밴드는 20일 SMA를 중심으로 ±2 표준편차 밴드를 그립니다. 가격의 약 95%가 밴드 내에서 움직이며, 밴드 터치는 평균 회귀 신호입니다. 밴드 폭이 극도로 좁아지는 'Squeeze'는 큰 움직임의 전조입니다.",
  },
};

// Dual-chart config: charts that show price (top) + indicator (bottom)
// Defined at module level for stable references (avoids useEffect infinite loops)
const DUAL_CHART_CONFIG: Record<string, { secondaryApi: string; label: string; color: string }> = {
  "fear-greed-index": { secondaryApi: "/api/crypto/fear-greed-history", label: "Fear & Greed Index (0-100)", color: "#EAB308" },
  "mvrv-zscore": { secondaryApi: "", label: "MVRV Z-Score", color: "#8B5CF6" },
};

// ─── Colored band lines for Risk charts ──────────────────────────────
// Horizontal reference lines that visually map the insight bands onto the chart
const CHART_BAND_LINES: Record<string, { primary?: ChartPriceLine[]; secondary?: ChartPriceLine[] }> = {
  "btc-risk-signal": {
    primary: [
      { price: 20, color: "#10B981", title: "극도 과매도", lineStyle: 2, lineWidth: 1 },
      { price: 30, color: "#34D399", title: "과매도", lineStyle: 2, lineWidth: 1 },
      { price: 50, color: "#60A5FA", title: "중립", lineStyle: 0, lineWidth: 1 },
      { price: 70, color: "#F59E0B", title: "과매수", lineStyle: 2, lineWidth: 1 },
      { price: 80, color: "#EF4444", title: "극도 과매수", lineStyle: 2, lineWidth: 1 },
    ],
  },
  "mvrv-zscore": {
    secondary: [
      { price: -1, color: "#10B981", title: "극도 저평가", lineStyle: 2, lineWidth: 1 },
      { price: 0, color: "#34D399", title: "저평가", lineStyle: 0, lineWidth: 1 },
      { price: 2, color: "#F97316", title: "고평가", lineStyle: 2, lineWidth: 1 },
      { price: 4, color: "#EF4444", title: "극도 고평가", lineStyle: 2, lineWidth: 1 },
    ],
  },
  "reserve-risk": {
    primary: [
      { price: 30000, color: "#10B981", title: "$30K 저리스크", lineStyle: 2, lineWidth: 1 },
      { price: 60000, color: "#F59E0B", title: "$60K 중립", lineStyle: 2, lineWidth: 1 },
      { price: 90000, color: "#EF4444", title: "$90K 고리스크", lineStyle: 2, lineWidth: 1 },
    ],
  },
  "fear-greed-index": {
    secondary: [
      { price: 20, color: "#10B981", title: "극도 공포", lineStyle: 2, lineWidth: 1 },
      { price: 40, color: "#34D399", title: "공포", lineStyle: 2, lineWidth: 1 },
      { price: 60, color: "#60A5FA", title: "중립", lineStyle: 0, lineWidth: 1 },
      { price: 80, color: "#F97316", title: "탐욕", lineStyle: 2, lineWidth: 1 },
    ],
  },
  "nupl": {
    primary: [
      { price: 20000, color: "#DC2626", title: "$20K 항복", lineStyle: 2, lineWidth: 1 },
      { price: 40000, color: "#F59E0B", title: "$40K 낙관", lineStyle: 2, lineWidth: 1 },
      { price: 60000, color: "#34D399", title: "$60K 확신", lineStyle: 2, lineWidth: 1 },
      { price: 90000, color: "#10B981", title: "$90K 행복감", lineStyle: 2, lineWidth: 1 },
    ],
  },
  // ── Support & Resistance ──
  "btc-support-resistance": {
    primary: [
      { price: 50000, color: "#10B981", title: "$50K 지지", lineStyle: 2, lineWidth: 1 },
      { price: 69000, color: "#34D399", title: "$69K (2021 ATH)", lineStyle: 2, lineWidth: 1 },
      { price: 75000, color: "#60A5FA", title: "$75K 지지/저항", lineStyle: 0, lineWidth: 1 },
      { price: 100000, color: "#F97316", title: "$100K 심리적 저항", lineStyle: 2, lineWidth: 2 },
      { price: 109000, color: "#EF4444", title: "$109K (ATH)", lineStyle: 2, lineWidth: 1 },
    ],
  },
  // ── Fibonacci ──
  "btc-fibonacci": {
    primary: [
      { price: 86934, color: "#34D399", title: "Fib 0.236", lineStyle: 2, lineWidth: 1 },
      { price: 73282, color: "#60A5FA", title: "Fib 0.382", lineStyle: 2, lineWidth: 1 },
      { price: 62250, color: "#FBBF24", title: "Fib 0.5", lineStyle: 0, lineWidth: 1 },
      { price: 51218, color: "#F97316", title: "Fib 0.618", lineStyle: 2, lineWidth: 2 },
      { price: 35541, color: "#EF4444", title: "Fib 0.786", lineStyle: 2, lineWidth: 1 },
    ],
  },
  // ── Momentum / Technical ──
  "btc-rsi": {
    primary: [
      { price: 20, color: "#10B981", title: "극도 과매도 20", lineStyle: 2, lineWidth: 1 },
      { price: 30, color: "#34D399", title: "과매도 30", lineStyle: 2, lineWidth: 1 },
      { price: 50, color: "#60A5FA", title: "중립 50", lineStyle: 0, lineWidth: 1 },
      { price: 70, color: "#F97316", title: "과매수 70", lineStyle: 2, lineWidth: 1 },
      { price: 80, color: "#EF4444", title: "극도 과매수 80", lineStyle: 2, lineWidth: 1 },
    ],
  },
  "stochastic-rsi": {
    primary: [
      { price: 20, color: "#10B981", title: "과매도 20", lineStyle: 2, lineWidth: 1 },
      { price: 50, color: "#60A5FA", title: "중립 50", lineStyle: 1, lineWidth: 1 },
      { price: 80, color: "#EF4444", title: "과매수 80", lineStyle: 2, lineWidth: 1 },
    ],
  },
  "btc-macd": {
    primary: [
      { price: 0, color: "#60A5FA", title: "제로 라인", lineStyle: 0, lineWidth: 1 },
    ],
  },
};

// ─── Chart About Content ──────────────────────────────────────────────
// Rich "About This Chart" descriptions with optional asset-ranking tables
interface AssetRank {
  rank: number;
  name: string;
  symbol: string;
  marketCap: string;
  highlight?: boolean; // highlight row (e.g. crypto)
}

interface ChartAboutContent {
  description: string; // multi-paragraph description (supports \n\n)
  assetRanking?: {
    title: string;
    updated: string; // e.g. "2025 Q4 기준"
    assets: AssetRank[];
    footnote?: string;
  };
}

const CHART_ABOUT: Record<string, ChartAboutContent> = {
  "total-market-cap": {
    description: `전체 암호화폐 시가총액(Total Crypto Market Cap)은 비트코인, 이더리움을 포함한 모든 암호화폐의 시가총액을 합산한 지표입니다. 시장의 전체적인 규모와 자금 흐름을 한눈에 파악할 수 있는 가장 기본적인 매크로 지표입니다.

이 차트는 로그 스케일을 기본으로 사용하여, 초기 소규모 시장과 현재 대규모 시장을 동일한 비율로 비교할 수 있습니다. 암호화폐 시장은 약 4년 주기의 반감기 사이클을 따르며, 각 사이클마다 시가총액의 고점과 저점이 점차 높아지는 우상향 추세를 보입니다.

전체 시가총액이 증가하면 시장에 신규 자금이 유입되고 있다는 신호이며, 감소하면 자금이 빠져나가고 있음을 의미합니다. BTC 도미넌스와 함께 분석하면 알트코인 시즌 여부도 판단할 수 있습니다.`,
    assetRanking: {
      title: "글로벌 자산 시가총액 순위",
      updated: "2025 Q4 기준 (추정치)",
      assets: [
        { rank: 1, name: "Gold (금)", symbol: "GOLD", marketCap: "$18.3T" },
        { rank: 2, name: "Apple", symbol: "AAPL", marketCap: "$3.8T" },
        { rank: 3, name: "NVIDIA", symbol: "NVDA", marketCap: "$3.4T" },
        { rank: 4, name: "Microsoft", symbol: "MSFT", marketCap: "$3.1T" },
        { rank: 5, name: "Amazon", symbol: "AMZN", marketCap: "$2.3T" },
        { rank: 6, name: "Alphabet (Google)", symbol: "GOOGL", marketCap: "$2.2T" },
        { rank: 7, name: "Silver (은)", symbol: "SILVER", marketCap: "$1.8T" },
        { rank: 8, name: "Saudi Aramco", symbol: "2222.SR", marketCap: "$1.7T" },
        { rank: 9, name: "Crypto Total", symbol: "CRYPTO", marketCap: "$~3.0T", highlight: true },
        { rank: 10, name: "  ┗ Bitcoin", symbol: "BTC", marketCap: "$~1.8T", highlight: true },
        { rank: 11, name: "  ┗ Ethereum", symbol: "ETH", marketCap: "$~0.3T", highlight: true },
        { rank: 12, name: "Meta (Facebook)", symbol: "META", marketCap: "$1.6T" },
        { rank: 13, name: "Tesla", symbol: "TSLA", marketCap: "$1.1T" },
        { rank: 14, name: "Berkshire Hathaway", symbol: "BRK", marketCap: "$1.0T" },
        { rank: 15, name: "TSMC", symbol: "TSM", marketCap: "$0.9T" },
      ],
      footnote: "시가총액은 시장 상황에 따라 변동됩니다. 암호화폐 전체 시가총액은 Apple, NVIDIA 등 단일 기업과 비슷한 규모이며, Gold 대비 약 1/6 수준입니다.",
    },
  },
  "btc-market-cap": {
    description: `비트코인 시가총액(Bitcoin Market Cap)은 현재 유통 중인 비트코인 수량에 현재 가격을 곱한 값입니다. 비트코인의 네트워크 가치와 글로벌 자산 시장에서의 위상을 측정하는 핵심 지표입니다.

비트코인은 총 발행량이 2,100만 개로 제한되어 있으며, 약 4년마다 반감기(Halving)를 거치며 신규 발행량이 절반으로 줄어듭니다. 이러한 희소성 메커니즘은 장기적으로 시가총액 상승의 근본 동력입니다. 2024년 4월 네 번째 반감기 이후 블록 보상은 3.125 BTC로 감소했습니다.

비트코인 시가총액은 전체 암호화폐 시장의 약 55~65%를 차지하며, 이를 BTC 도미넌스라 합니다. 도미넌스가 상승하면 비트코인으로 자금이 집중되는 것이고, 하락하면 알트코인으로 자금이 분산되는 "알트 시즌" 신호입니다.`,
    assetRanking: {
      title: "비트코인 vs 글로벌 자산 시가총액",
      updated: "2025 Q4 기준 (추정치)",
      assets: [
        { rank: 1, name: "Gold (금)", symbol: "GOLD", marketCap: "$18.3T" },
        { rank: 2, name: "Apple", symbol: "AAPL", marketCap: "$3.8T" },
        { rank: 3, name: "NVIDIA", symbol: "NVDA", marketCap: "$3.4T" },
        { rank: 4, name: "Microsoft", symbol: "MSFT", marketCap: "$3.1T" },
        { rank: 5, name: "Amazon", symbol: "AMZN", marketCap: "$2.3T" },
        { rank: 6, name: "Bitcoin", symbol: "BTC", marketCap: "$~1.8T", highlight: true },
        { rank: 7, name: "Alphabet (Google)", symbol: "GOOGL", marketCap: "$2.2T" },
        { rank: 8, name: "Silver (은)", symbol: "SILVER", marketCap: "$1.8T" },
        { rank: 9, name: "Saudi Aramco", symbol: "2222.SR", marketCap: "$1.7T" },
        { rank: 10, name: "Meta (Facebook)", symbol: "META", marketCap: "$1.6T" },
      ],
      footnote: "비트코인은 단일 자산으로서 세계 6~8위권 시가총액을 기록하며, Silver(은)과 비슷한 규모입니다. Gold 시가총액의 약 1/10 수준이며, Stock-to-Flow 모델에서는 향후 Gold와 동등한 수준까지 성장할 수 있다고 전망합니다.",
    },
  },
  "eth-market-cap": {
    description: `이더리움 시가총액(Ethereum Market Cap)은 유통 중인 이더(ETH) 수량에 현재 가격을 곱한 값입니다. 이더리움은 스마트 컨트랙트 플랫폼의 선두주자로, DeFi, NFT, Layer 2 등 거대한 생태계의 기축 자산입니다.

2022년 9월 Merge(PoS 전환) 이후 이더리움은 지분증명(Proof of Stake) 방식으로 전환되었으며, 네트워크 사용량에 따라 ETH가 소각(burn)되는 EIP-1559 메커니즘이 작동합니다. 수수료가 높은 시기에는 신규 발행량보다 소각량이 많아 디플레이션 자산이 되기도 합니다.

ETH/BTC 비율은 이더리움의 비트코인 대비 상대적 강세를 나타내며, 이 비율이 상승하면 알트코인 시장 전반에 긍정적 신호입니다. Dencun 업그레이드(2024년 3월) 이후 Layer 2 수수료가 대폭 감소하면서 생태계 확장이 가속화되고 있습니다.`,
    assetRanking: {
      title: "이더리움 vs 주요 자산 비교",
      updated: "2025 Q4 기준 (추정치)",
      assets: [
        { rank: 1, name: "Bitcoin", symbol: "BTC", marketCap: "$~1.8T" },
        { rank: 2, name: "Ethereum", symbol: "ETH", marketCap: "$~0.3T", highlight: true },
        { rank: 3, name: "BNB (Binance)", symbol: "BNB", marketCap: "$~90B" },
        { rank: 4, name: "Solana", symbol: "SOL", marketCap: "$~70B" },
        { rank: 5, name: "XRP", symbol: "XRP", marketCap: "$~65B" },
        { rank: 6, name: "Cardano", symbol: "ADA", marketCap: "$~20B" },
        { rank: 7, name: "Avalanche", symbol: "AVAX", marketCap: "$~12B" },
        { rank: 8, name: "Polkadot", symbol: "DOT", marketCap: "$~8B" },
      ],
      footnote: "이더리움은 스마트 컨트랙트 플랫폼 중 시가총액 1위이며, 2위 이하 경쟁자들(Solana, BNB 등)을 합산한 규모보다 큽니다. DeFi TVL(Total Value Locked)의 약 60%가 이더리움 생태계에 집중되어 있습니다.",
    },
  },
  "altcoin-market-cap": {
    description: `알트코인 시가총액(Altcoin Market Cap)은 비트코인을 제외한 모든 암호화폐의 시가총액을 합산한 지표입니다. "TOTAL2"라고도 불리며, 알트코인 시장의 전체적인 자금 흐름과 건강 상태를 측정합니다.

알트코인 시가총액은 비트코인 사이클에 후행하는 경향이 있습니다. 일반적으로 비트코인이 먼저 상승한 후, 자금이 대형 알트코인(ETH, SOL 등) → 중형 알트코인 → 소형 알트코인 순서로 이동하는 "로테이션"이 발생합니다. 이 과정을 "알트 시즌(Alt Season)"이라 합니다.

BTC 도미넌스가 하락하면서 알트코인 시가총액이 증가하면 알트 시즌의 시작 신호입니다. 반대로 비트코인 도미넌스가 급등하면 알트코인에서 비트코인으로 자금이 이동하는 "알트 윈터"가 진행 중임을 의미합니다. TOTAL2 차트와 BTC.D 차트를 함께 분석하면 최적의 알트코인 매매 타이밍을 잡을 수 있습니다.`,
  },
  "stablecoin-market-cap": {
    description: `스테이블코인 시가총액(Stablecoin Market Cap)은 USDT(Tether), USDC(Circle), DAI, BUSD 등 법정 화폐에 가치가 고정된 암호화폐들의 총 시가총액입니다. 암호화폐 시장의 "건조 화약(dry powder)" — 즉, 언제든 투자에 투입될 수 있는 대기 자금의 규모를 나타냅니다.

스테이블코인 시가총액 증가는 시장에 신규 자금이 유입되고 있다는 강력한 신호입니다. 투자자들이 법정 화폐를 스테이블코인으로 변환해 거래소에 예치하면, 이 자금은 언제든 BTC나 알트코인 매수에 사용될 수 있습니다. 반대로 스테이블코인 시가총액이 감소하면 자금이 암호화폐 시장에서 빠져나가고 있음을 의미합니다.

USDT가 전체 스테이블코인의 약 65~70%를 차지하며, USDC가 약 20%로 2위입니다. DeFi 프로토콜에서의 스테이블코인 예치 금리는 시장 심리의 바로미터 역할을 하며, 금리가 높을수록 레버리지 수요가 강하다는 것을 의미합니다.`,
    assetRanking: {
      title: "주요 스테이블코인 시가총액",
      updated: "2025 Q4 기준 (추정치)",
      assets: [
        { rank: 1, name: "Tether", symbol: "USDT", marketCap: "$~140B", highlight: true },
        { rank: 2, name: "USD Coin", symbol: "USDC", marketCap: "$~45B", highlight: true },
        { rank: 3, name: "DAI", symbol: "DAI", marketCap: "$~5B" },
        { rank: 4, name: "First Digital USD", symbol: "FDUSD", marketCap: "$~3B" },
        { rank: 5, name: "Ethena USDe", symbol: "USDe", marketCap: "$~3B" },
        { rank: 6, name: "USDD", symbol: "USDD", marketCap: "$~0.7B" },
        { rank: 7, name: "Frax", symbol: "FRAX", marketCap: "$~0.6B" },
        { rank: 8, name: "PayPal USD", symbol: "PYUSD", marketCap: "$~0.5B" },
      ],
      footnote: "스테이블코인 총 시가총액은 약 $200B로, USDT가 압도적 1위입니다. 스테이블코인 발행량이 사상 최고치를 경신하면 강세장 진입의 선행 지표로 해석됩니다.",
    },
  },

  // ── Crypto On-Chain & Risk Indicators ──────────────────────────────

  "btc-risk-signal": {
    description: `비트코인 RSI 리스크 시그널은 0에서 100 사이의 수치로 비트코인의 과매수·과매도 상태를 종합적으로 평가하는 지표입니다. 이 지표는 전통적인 RSI(상대강도지수)를 기반으로 하되, 온체인 데이터와 매크로 변수를 결합하여 비트코인 특유의 사이클 리스크를 수치화합니다. 일반적으로 80 이상이면 극단적 과매수(고위험 구간), 20 이하이면 극단적 과매도(저위험 구간)로 해석합니다.

이 시그널은 비트코인의 약 4년 주기 반감기 사이클과 밀접한 관련이 있습니다. 반감기 이후 12~18개월 사이에 리스크 시그널이 점진적으로 상승하며, 사이클 고점 부근에서 80~100 구간에 진입하는 패턴이 반복적으로 관찰됩니다. 반대로 약세장 바닥에서는 10~20 구간까지 하락하여 역사적 매수 기회를 제공합니다.

실전 투자에서는 리스크 시그널이 30 이하일 때 분할 매수를 시작하고, 70 이상에서 분할 매도를 고려하는 전략이 효과적입니다. 단, 단일 지표에 의존하기보다 MVRV Z-Score, NUPL 등 다른 온체인 지표와 교차 검증하는 것이 중요합니다. 특히 강세장 초반에는 과매수 시그널이 오래 지속될 수 있으므로 성급한 매도를 경계해야 합니다.`,
  },

  "mvrv-zscore": {
    description: `MVRV Z-Score는 비트코인의 시장가치(Market Value)와 실현가치(Realized Value)의 차이를 표준편차로 정규화한 온체인 지표입니다. 시장가치는 현재 가격 × 총 공급량으로 계산되고, 실현가치는 각 비트코인이 마지막으로 이동한 시점의 가격을 기준으로 합산한 값입니다. 실현가치는 시장 참여자들의 평균 취득 원가를 반영하므로, MVRV Z-Score는 현재 가격이 전체 투자자의 평균 원가 대비 얼마나 과대 또는 과소평가되어 있는지를 보여줍니다.

역사적으로 MVRV Z-Score가 7 이상이면 사이클 고점(빨간색 구간), 0.1 이하이면 사이클 저점(녹색 구간)으로 나타났습니다. 2013년, 2017년, 2021년 강세장 고점에서 이 지표는 모두 7을 초과했으며, 2015년, 2018년, 2022년 약세장 바닥에서는 0 근처 또는 마이너스 값을 기록했습니다. Z-Score가 마이너스라는 것은 시장가치가 실현가치 아래로 떨어졌다는 의미로, 시장 전체가 미실현 손실 상태임을 나타냅니다.

MVRV Z-Score는 장기 투자자에게 가장 신뢰할 수 있는 사이클 판별 도구 중 하나입니다. 이 지표가 1~3 사이에 있을 때는 건전한 상승 구간으로, 축적을 지속하기에 적절합니다. 3을 넘기 시작하면 점진적 이익 실현을, 5 이상에서는 적극적인 리스크 관리를 권장합니다. 다만 사이클마다 고점의 절대 수치가 달라질 수 있으므로 추세 변화에도 주목해야 합니다.`,
  },

  "reserve-risk": {
    description: `Reserve Risk는 비트코인의 가격 대비 장기 보유자(HODLer)의 확신 수준을 측정하는 온체인 지표입니다. 이 지표는 '코인이 사용되지 않고 보유된 시간'에 대한 기회비용(HODL Bank)과 현재 가격 수준을 비교하여 산출됩니다. 장기 보유자들이 코인을 팔지 않고 꾸준히 보유하고 있다면 Reserve Risk는 낮아지고, 이는 경험 많은 투자자들이 현재 가격 수준에서 매도할 유인이 적다는 것을 의미합니다.

Reserve Risk가 낮은 구간(녹색)은 HODLer들의 확신이 높고 가격은 상대적으로 저평가된 상태로, 역사적으로 매수 적기에 해당합니다. 반대로 Reserve Risk가 높은 구간(빨간색)은 장기 보유자들이 이익 실현을 위해 코인을 움직이기 시작하는 시기로, 사이클 고점과 일치하는 경향이 있습니다. 이 지표의 핵심은 '스마트 머니'라 할 수 있는 장기 보유자들의 행동 패턴을 추적한다는 점입니다.

실전에서 Reserve Risk는 다른 온체인 지표들과 함께 사이클 위치를 파악하는 데 활용됩니다. 특히 이 지표가 바닥권에서 상승 전환하는 시점은 강세장 초기와 일치하는 경우가 많습니다. 장기 투자 관점에서 Reserve Risk가 녹색 구간에 머무르는 동안 꾸준히 축적하고, 빨간색 구간 진입 시 분할 매도를 시작하는 전략이 역사적으로 높은 수익률을 기록했습니다.`,
  },

  "fear-greed-index": {
    description: `공포·탐욕 지수(Fear & Greed Index)는 암호화폐 시장의 대중 심리를 0(극단적 공포)에서 100(극단적 탐욕)까지의 수치로 나타내는 복합 감성 지표입니다. 변동성(25%), 시장 모멘텀과 거래량(25%), 소셜 미디어 반응(15%), 설문조사(15%), 비트코인 도미넌스(10%), 구글 트렌드(10%) 등 여러 데이터 소스를 종합하여 매일 산출됩니다.

이 지표의 핵심 활용법은 역투자(contrarian) 전략입니다. 워런 버핏의 "남들이 공포에 떨 때 탐욕을 부려라"는 격언과 일맥상통합니다. 역사적으로 지수가 10~20(극단적 공포) 구간에 진입한 시기는 2018년 말, 2020년 3월, 2022년 6월 등 주요 바닥과 겹치며, 이 시기에 매수한 투자자는 큰 수익을 거두었습니다. 반대로 90 이상(극단적 탐욕)은 과열 신호로, 차익 실현을 고려해야 하는 구간입니다.

다만 공포·탐욕 지수는 단기 심리를 반영하므로 장기 투자 판단의 유일한 근거로 삼기에는 한계가 있습니다. 강세장에서는 탐욕 구간이 수개월간 지속될 수 있고, 약세장에서는 공포 구간이 장기간 이어질 수 있습니다. 따라서 이 지표는 진입·청산 타이밍을 미세 조정하는 보조 도구로 활용하되, 온체인 펀더멘탈 지표와 함께 종합적으로 판단하는 것이 바람직합니다.`,
  },

  "nupl": {
    description: `NUPL(Net Unrealized Profit/Loss, 미실현 순이익/손실)은 비트코인 네트워크 전체의 미실현 이익과 손실의 비율을 나타내는 온체인 지표입니다. 각 UTXO(미사용 트랜잭션 출력)가 생성된 시점의 가격과 현재 가격을 비교하여, 전체 시장이 이익 상태인지 손실 상태인지를 판별합니다. 양수이면 시장 전체가 미실현 이익, 음수이면 미실현 손실 상태입니다.

NUPL은 비트코인 사이클의 5단계를 명확하게 구분합니다. 항복(Capitulation, NUPL < 0, 빨간색): 시장 전체가 손실 상태로 바닥 부근입니다. 희망·공포(Hope/Fear, 0~0.25): 회복 초기 단계입니다. 낙관·불안(Optimism/Anxiety, 0.25~0.5): 건전한 상승장입니다. 확신·부정(Belief/Denial, 0.5~0.75): 강세장 중반으로 대부분의 투자자가 이익 상태입니다. 행복감·탐욕(Euphoria/Greed, 0.75 이상): 사이클 고점 부근으로 극단적 과열 상태입니다.

투자 전략적으로 NUPL이 0 이하(항복 구간)에서 반등하는 시점은 역사적으로 최고의 매수 기회였습니다. 반면 0.75를 넘어서면 단계적 이익 실현을 시작해야 합니다. 2021년 상승장에서는 NUPL이 0.75를 두 번 터치한 이중 고점 패턴을 보였으며, 이는 사이클 구조가 단순하지 않을 수 있음을 시사합니다. MVRV Z-Score와 함께 사용하면 사이클 위치 판단의 정확도를 높일 수 있습니다.`,
  },

  // ── Long-Term Valuation Models ─────────────────────────────────────

  "btc-log-regression": {
    description: `비트코인 로그 회귀 밴드(Log Regression Band)는 비트코인의 가격 역사를 로그 스케일에서 회귀 분석하여 장기 공정가치를 추정하는 모델입니다. 중심선이 비트코인의 '공정가치'를 나타내고, 위아래로 ±1σ(표준편차)와 ±2σ 밴드가 형성됩니다. 가격이 +2σ 이상이면 극단적 과대평가, -2σ 이하이면 극단적 과소평가로 해석합니다.

이 모델의 핵심 전제는 비트코인의 가격이 장기적으로 로그 함수적 성장 경로를 따른다는 것입니다. 초기에는 급격한 성장률을 보이지만, 시장이 성숙함에 따라 성장률이 점차 감소하는 패턴입니다. 역사적으로 비트코인 가격은 대부분의 시간을 -1σ와 +1σ 사이에서 보냈으며, ±2σ를 터치하는 경우는 극히 드물었습니다. 2017년과 2021년 고점은 +2σ 부근, 2015년과 2022년 저점은 -2σ 부근과 일치했습니다.

로그 회귀 밴드는 비트코인의 장기 가치를 평가하는 데 매우 유용합니다. 현재 가격이 중심선 아래에 위치하면 축적 기회로, 중심선 위이면서 +1σ에 접근하면 비중 축소를 고려할 수 있습니다. 다만 이 모델은 과거 데이터에 기반하므로 규제 변화, 기관 채택 가속화 등 구조적 변화에 의해 밴드 자체가 이동할 수 있다는 점을 유의해야 합니다.`,
  },

  "rainbow-chart": {
    description: `비트코인 레인보우 차트(Rainbow Chart)는 로그 성장 곡선 위에 9개의 색상 밴드를 씌워 비트코인의 현재 가격이 장기 가치 평가 스펙트럼 중 어디에 위치하는지를 직관적으로 보여주는 도구입니다. 가장 아래 짙은 파란색 밴드는 "Fire Sale(대폭 할인)"을, 가장 위 짙은 빨간색 밴드는 "Maximum Bubble Territory(최대 버블 영역)"를 나타냅니다.

9개 밴드는 아래에서 위로 다음과 같습니다: (1) Fire Sale - 극단적 저평가 매수 기회, (2) BUY! - 강력 매수 구간, (3) Accumulate - 축적 구간, (4) Still Cheap - 여전히 저렴, (5) Hold! - 보유 유지, (6) Is This a Bubble? - 버블 의심 시작, (7) FOMO Intensifies - 포모 심화, (8) Sell. Seriously, SELL! - 매도 권고, (9) Maximum Bubble Territory - 버블 고점. 각 사이클에서 비트코인 가격은 이 밴드들을 아래에서 위로 횡단하는 패턴을 반복해왔습니다.

레인보우 차트는 복잡한 분석 없이도 현재 시장 상태를 빠르게 파악할 수 있는 장점이 있습니다. 다만 이 차트는 "재미를 위한 것이지 투자 조언이 아니다"라는 면책 조항이 붙어 있으며, 과거 데이터에 대한 곡선 적합(curve fitting)이라는 한계가 있습니다. 그럼에도 불구하고 DCA(정기 적립) 투자의 강도를 조절하는 보조 도구로 활용하면 효과적입니다. 파란색-녹색 밴드에서는 적립 금액을 늘리고, 주황색-빨간색 밴드에서는 적립을 줄이거나 중단하는 식입니다.`,
  },

  "stock-to-flow": {
    description: `Stock-to-Flow(S2F) 모델은 비트코인의 희소성을 정량화하여 가격을 예측하는 모델로, 네덜란드의 익명 분석가 PlanB가 2019년에 발표했습니다. '스톡(Stock)'은 현재까지 채굴된 총 비트코인 수량, '플로우(Flow)'는 연간 새로 채굴되는 수량입니다. S2F 비율 = Stock ÷ Flow로 계산하며, 이 비율이 높을수록 희소성이 높습니다. 비트코인은 약 4년마다 반감기를 통해 플로우가 절반으로 줄어 S2F 비율이 급격히 상승합니다.

S2F 모델에 따르면, 비트코인의 가격은 희소성(S2F 비율)과 거듭제곱 관계에 있습니다. 2012년, 2016년, 2020년 반감기 이후 비트코인 가격이 S2F 모델이 예측한 가격대로 상승하면서 이 모델은 큰 주목을 받았습니다. 현재 비트코인의 S2F 비율은 약 120으로, 금(S2F ~62)보다 높으며, 이는 비트코인이 금보다 희소한 자산임을 수치적으로 보여줍니다.

그러나 S2F 모델에는 중요한 비판이 존재합니다. 수요 측면을 완전히 무시하고 공급만으로 가격을 설명하려 한다는 점, 2021-2022년 사이클에서 모델 예측치($100K+)를 크게 밑돈 점 등이 지적됩니다. 또한 공적분 분석에서 가짜 상관(spurious correlation)일 가능성도 제기됩니다. S2F 모델은 비트코인의 희소성을 이해하는 프레임워크로는 유용하지만, 정확한 가격 예측 도구로 맹신해서는 안 되며 다른 온체인·매크로 지표와 함께 참고하는 것이 바람직합니다.`,
  },

  "power-law-corridor": {
    description: `거듭제곱 법칙 회랑(Power Law Corridor)은 비트코인의 가격이 시간에 대한 거듭제곱 함수를 따라 성장한다는 가설에 기반한 장기 가격 모델입니다. 로그-로그 스케일에서 비트코인 가격과 시간(제네시스 블록 이후 일수)의 관계를 분석하면, 놀랍도록 높은 선형성(R² > 0.95)이 관찰됩니다. 이 관계를 기반으로 지지선(바닥)과 저항선(천장) 회랑이 형성됩니다.

거듭제곱 법칙의 핵심 특징은 시간이 지남에 따라 상하단 밴드의 간격이 좁아진다는 것입니다. 이는 비트코인의 변동성이 장기적으로 감소한다는 관찰과 일치합니다. 초기 사이클에서는 가격이 100배 이상 상승하기도 했지만, 최근 사이클들에서는 상승 배수가 점차 줄어들고 있습니다. 이 모델은 비트코인이 이미 초기 폭발적 성장기를 지나 점차 안정적인 성장 궤도에 진입하고 있음을 시사합니다.

Power Law Corridor의 장점은 과적합(overfitting) 위험이 상대적으로 낮고, 물리학에서 관찰되는 자연 법칙과 유사한 패턴을 보인다는 점입니다. 비트코인의 향후 10~20년 가격 범위를 대략적으로 추정하는 데 유용하며, 현재 가격이 회랑의 하단에 가까우면 매수 기회, 상단에 가까우면 매도 기회로 해석할 수 있습니다. 다만 네트워크 효과, 규제 변화 등 외생 변수에 의해 장기 추세 자체가 변할 수 있다는 점은 항상 유의해야 합니다.`,
  },

  // ── Cross-Asset Comparison ─────────────────────────────────────────

  "btc-vs-gold-roi": {
    description: `BTC vs Gold ROI 차트는 비트코인과 금의 투자 수익률을 동일 기간 기준으로 비교하는 분석 도구입니다. 비트코인은 종종 '디지털 금(Digital Gold)'으로 불리며, 금과 유사한 가치 저장 수단(Store of Value)으로서의 내러티브를 가지고 있습니다. 두 자산의 수익률을 나란히 비교함으로써 이 내러티브가 데이터로 뒷받침되는지를 검증할 수 있습니다.

역사적으로 비트코인은 거의 모든 장기 투자 기간에서 금의 수익률을 압도적으로 상회했습니다. 예를 들어, 5년 보유 기간 기준으로 비트코인이 금 대비 수십~수백 배 높은 수익률을 기록한 시기가 많습니다. 그러나 단기적으로는 비트코인의 높은 변동성으로 인해 금이 더 안정적인 수익을 제공하는 구간도 존재합니다. 특히 2022년 같은 크립토 약세장에서는 금이 하방 보호 역할을 훌륭히 수행했습니다.

이 비교 차트는 포트폴리오 자산 배분 전략을 수립할 때 중요한 참고 자료가 됩니다. 금은 수천 년간 검증된 안전 자산으로 낮은 변동성과 인플레이션 헤지 기능을 제공하고, 비트코인은 높은 성장 잠재력을 제공합니다. 리스크 허용도에 따라 두 자산을 적절히 배분하는 것이 현명한 전략이며, 비트코인이 금 대비 크게 언더퍼폼하는 구간은 비트코인 비중 확대를, 크게 아웃퍼폼하는 구간은 금 비중 확대를 고려할 수 있습니다.`,
  },

  "btc-vs-sp500-roi": {
    description: `BTC vs S&P 500 ROI 차트는 비트코인과 미국 대표 주가지수 S&P 500의 수익률을 비교하여, 비트코인이 전통 리스크 자산 대비 얼마나 우수한(또는 열등한) 성과를 보이는지를 분석합니다. S&P 500은 미국 대형주 500개를 포함한 글로벌 주식 시장의 벤치마크로, 비트코인의 투자 성과를 평가하는 가장 보편적인 비교 대상입니다.

비트코인과 S&P 500의 상관관계는 시기에 따라 크게 변합니다. 2020년 이전에는 두 자산의 상관계수가 거의 0에 가까워 독립적으로 움직였으나, 2020년 이후 기관 투자자 유입과 함께 상관관계가 0.5~0.7까지 높아지는 구간이 나타났습니다. 이는 비트코인이 점차 매크로 리스크 자산으로 편입되고 있음을 의미합니다. 특히 연준의 금리 정책에 두 자산 모두 민감하게 반응하는 경향이 강해졌습니다.

투자 관점에서 이 비교는 두 가지 중요한 시사점을 제공합니다. 첫째, 비트코인의 위험 조정 수익률(샤프 비율)을 평가할 수 있습니다. 높은 절대 수익률에도 불구하고 극심한 변동성을 감안하면, 위험 조정 기준으로는 차이가 줄어듭니다. 둘째, 두 자산의 상관관계 변화를 추적하여 포트폴리오 분산 효과를 모니터링할 수 있습니다. 상관관계가 낮아지는 구간에서 비트코인의 분산 투자 가치가 높아지므로, 이를 전술적 자산 배분에 활용할 수 있습니다.`,
  },

  // ── Moving Average & Cycle Indicators ──────────────────────────────

  "200-week-ma": {
    description: `200주 이동평균선(200-Week Moving Average)은 비트코인의 약 4년간 평균 가격을 나타내는 장기 추세 지표로, 역사적으로 비트코인의 궁극적인 바닥 지지선 역할을 해왔습니다. 비트코인은 탄생 이래 200주 이동평균선 아래에서 장기간 머무른 적이 거의 없으며, 이 선에 접근하거나 잠시 하회할 때마다 사이클 바닥을 형성했습니다.

2015년 약세장 바닥, 2018~2019년 약세장 바닥, 2020년 3월 코로나 폭락, 2022년 FTX 사태 당시 모두 비트코인 가격이 200주 이동평균선 부근에서 반등했습니다. 이는 장기 투자자들이 이 가격대를 '절대적 가치 구간'으로 인식하고 적극 매수에 나서기 때문으로 해석됩니다. 특히 200주 이동평균선 자체가 장기적으로 우상향하고 있다는 점은 비트코인의 시간이 지남에 따른 가치 성장을 반영합니다.

실전 투자에서 200주 이동평균선은 가장 단순하면서도 강력한 매수 신호 중 하나입니다. 비트코인 가격이 이 선 아래로 내려갈 때 분할 매수를 시작하는 전략은 역사적으로 예외 없이 수익을 가져다주었습니다(장기 보유 전제). 다만 200주 이동평균선 아래에서의 체류 기간은 수주에서 수개월까지 다양하므로, 한 번에 올인하기보다 가격이 이 선 아래에 머무는 동안 여러 차례에 걸쳐 분할 매수하는 것이 효과적입니다.`,
  },

  "pi-cycle-top": {
    description: `Pi Cycle Top Indicator는 비트코인의 사이클 고점을 예측하기 위해 고안된 기술적 지표로, 111일 이동평균(111DMA)의 2배 값과 350일 이동평균(350DMA)의 교차 시점을 분석합니다. 이 지표의 이름은 두 이동평균 기간의 비율(350/111 ≈ 3.153)이 원주율 π(3.14159)에 매우 근접하다는 데서 유래합니다.

역사적으로 이 두 이동평균선이 교차하는 시점은 비트코인 사이클 고점과 놀라울 정도로 정확하게 일치했습니다. 2013년 4월, 2013년 11월, 2017년 12월, 2021년 4월의 고점에서 교차가 발생했으며, 고점과의 오차가 불과 며칠 이내였습니다. 111DMA × 2 값이 350DMA를 아래에서 위로 돌파하는 순간이 매도 시그널이 되며, 이후 비트코인은 급격한 하락세를 보였습니다.

Pi Cycle Top은 매도 타이밍을 잡는 데 매우 효과적인 도구이지만, 몇 가지 한계가 있습니다. 첫째, 이 지표는 고점만 식별하며 바닥은 예측하지 못합니다. 둘째, 과거 4번의 성공이 미래에도 반복될지는 보장할 수 없습니다. 셋째, 교차가 발생한 후에야 확인 가능하므로 실시간 대응에 약간의 지연이 있습니다. 그럼에도 불구하고 다른 사이클 고점 지표(MVRV Z-Score, NUPL 등)와 함께 사용하면 매도 타이밍의 정확도를 크게 높일 수 있습니다.`,
  },

  "golden-ratio-multiplier": {
    description: `골든 레이시오 멀티플라이어(Golden Ratio Multiplier)는 비트코인의 350일 이동평균선에 피보나치 수열의 핵심 비율(황금비율)을 곱하여 잠재적 저항선과 과열 구간을 식별하는 지표입니다. 350DMA에 1.6배(φ), 2배, 3배, 5배, 8배, 13배, 21배 등 피보나치 배수를 적용하여 여러 겹의 가격 밴드를 생성합니다.

이 지표의 핵심 관찰은 비트코인의 사이클 고점이 도달하는 배수 수준이 매 사이클마다 감소한다는 것입니다. 2011년 고점은 350DMA의 약 21배, 2013년 고점은 약 13배, 2017년 고점은 약 5배, 2021년 고점은 약 3배에서 형성되었습니다. 이 패턴이 지속된다면, 다음 사이클 고점은 350DMA의 약 2~2.6배 수준에서 형성될 수 있으며, 이는 비트코인의 수익 체감 법칙(diminishing returns)과 일치합니다.

골든 레이시오 멀티플라이어는 중장기 목표 가격 설정과 분할 매도 전략에 특히 유용합니다. 350DMA × 2를 1차 경계선, × 3을 2차 경계선으로 설정하고, 가격이 각 레벨에 도달할 때마다 일정 비율을 매도하는 방식으로 활용할 수 있습니다. 이 지표가 시사하는 수익 체감 현상은 장기적으로 비트코인의 변동성이 감소하고 더 성숙한 자산으로 변화하고 있음을 보여줍니다.`,
  },

  "2y-ma-multiplier": {
    description: `2년 이동평균 멀티플라이어(2-Year MA Multiplier)는 비트코인의 2년(730일) 이동평균선과 그 5배 값을 사용하여 매수 및 매도 구간을 판별하는 장기 투자 지표입니다. 가격이 2년 이동평균선 아래로 내려가면 역사적 매수 구간(녹색), 2년 이동평균선의 5배 위로 올라가면 역사적 매도 구간(빨간색)으로 표시됩니다.

이 지표의 논리는 단순하지만 강력합니다. 비트코인이 2년 평균 가격보다 낮다는 것은 시장이 장기 평균 대비 저평가되어 있다는 의미이고, 2년 평균의 5배를 초과한다는 것은 단기간에 과도한 상승이 발생했다는 의미입니다. 역사적으로 녹색 구간에서 매수하고 빨간색 구간에서 매도한 투자자는 각 사이클에서 10배 이상의 수익을 달성할 수 있었습니다. 2015년 초, 2018년 말~2019년 초, 2022년 하반기가 대표적인 녹색(매수) 구간이었습니다.

2년 이동평균 멀티플라이어의 가장 큰 장점은 해석이 극히 단순하다는 것입니다. 녹색이면 사고, 빨간색이면 파는 것이 전부입니다. 초보자도 쉽게 활용할 수 있으며, 과거 모든 사이클에서 유효했습니다. 다만 녹색 구간 진입 후 추가 하락이 발생할 수 있으므로 일시 매수보다 분할 매수가 권장되며, 매 사이클 고점에서 5배 멀티플라이어에 도달하지 못할 가능성(수익 체감 법칙)도 고려해야 합니다.`,
  },

  // ── Technical Analysis Indicators ──────────────────────────────────

  "btc-rsi": {
    description: `RSI(Relative Strength Index, 상대강도지수)는 가장 널리 사용되는 모멘텀 오실레이터로, 일정 기간(기본 14일) 동안의 가격 상승폭과 하락폭의 비율을 0~100 사이의 수치로 나타냅니다. 일반적으로 70 이상이면 과매수(Overbought), 30 이하이면 과매도(Oversold)로 해석하며, 50은 중립 수준을 나타냅니다. 비트코인 시장에서 RSI는 가격의 단기 모멘텀과 반전 가능성을 판단하는 핵심 도구입니다.

비트코인의 RSI 해석에는 전통 주식 시장과 다른 특성이 있습니다. 강세장에서는 RSI가 70 이상에서 장기간 머무를 수 있으며(과매수 유지), 약세장에서는 30 이하에서 수주간 지속될 수 있습니다. 따라서 단순히 70/30 기준으로 매매하는 것보다, RSI의 추세선 이탈이나 다이버전스(가격과 RSI의 방향 불일치)에 주목하는 것이 효과적입니다. 특히 가격이 신고가를 경신했는데 RSI는 이전 고점을 넘지 못하는 '하락 다이버전스'는 강력한 하락 반전 신호입니다.

실전에서 비트코인 RSI는 주봉(Weekly)과 일봉(Daily) 두 타임프레임을 함께 보는 것이 중요합니다. 주봉 RSI가 30 이하에 진입하는 경우는 비트코인 역사에서 극히 드물며(2015년, 2018년, 2022년), 이 시점은 장기 투자자에게 최적의 매수 기회였습니다. 일봉 RSI는 단기 트레이딩에 활용하되, MACD나 볼린저 밴드와 함께 사용하여 신호의 신뢰도를 높이는 것이 바람직합니다.`,
  },

  "btc-macd": {
    description: `MACD(Moving Average Convergence Divergence)는 제럴드 아펠(Gerald Appel)이 개발한 추세 추종 모멘텀 지표로, 두 지수이동평균(EMA)의 차이를 이용하여 추세의 방향, 강도, 전환점을 파악합니다. 기본 설정은 12일 EMA에서 26일 EMA를 뺀 MACD 라인, 이 라인의 9일 EMA인 시그널 라인, 그리고 두 라인의 차이인 히스토그램으로 구성됩니다.

MACD의 주요 매매 시그널은 세 가지입니다. 첫째, MACD 라인이 시그널 라인을 상향 돌파하면 매수(골든 크로스), 하향 돌파하면 매도(데드 크로스) 신호입니다. 둘째, MACD 라인이 0선을 상향 돌파하면 상승 추세 전환, 하향 돌파하면 하락 추세 전환을 나타냅니다. 셋째, 히스토그램의 크기 변화를 통해 추세의 가속과 감속을 판단할 수 있습니다. 히스토그램이 점점 커지면 추세가 강화되고, 줄어들면 추세가 약화되고 있음을 의미합니다.

비트코인 시장에서 MACD를 활용할 때는 타임프레임 선택이 매우 중요합니다. 일봉 MACD는 너무 빈번한 시그널을 생성하여 노이즈가 많을 수 있으므로, 주봉 MACD가 더 신뢰할 수 있는 중기 추세 판단 도구가 됩니다. 특히 주봉 MACD가 마이너스 영역에서 골든 크로스를 형성하는 시점은 새로운 상승 추세의 시작을 알리는 강력한 신호로, 2015년, 2019년, 2023년 초에 이 패턴이 관찰된 후 큰 폭의 상승이 이어졌습니다.`,
  },

  "stochastic-rsi": {
    description: `스토캐스틱 RSI(Stochastic RSI)는 RSI 값에 스토캐스틱 오실레이터 공식을 적용한 '지표의 지표'입니다. 일반 RSI보다 더 민감하게 반응하며, 0에서 1(또는 0~100) 사이에서 움직입니다. 일반적으로 0.8 이상이면 과매수, 0.2 이하이면 과매도로 해석합니다. 기본 RSI가 중립 구간(40~60)에서 장기간 횡보할 때, 스토캐스틱 RSI는 여전히 의미 있는 시그널을 제공할 수 있다는 것이 가장 큰 장점입니다.

스토캐스틱 RSI는 %K 라인과 %D 라인(K의 이동평균)으로 구성되며, 두 라인의 교차가 핵심 매매 시그널입니다. %K가 %D를 상향 돌파하면 매수, 하향 돌파하면 매도 신호입니다. 특히 과매도 구간(0.2 이하)에서의 상향 교차와 과매수 구간(0.8 이상)에서의 하향 교차는 높은 신뢰도의 시그널로 간주됩니다. 비트코인의 급격한 가격 변동에 빠르게 반응하므로 단기 트레이딩에 유용합니다.

다만 스토캐스틱 RSI의 높은 민감도는 양날의 검입니다. 잦은 시그널 발생으로 인해 가짜 신호(whipsaw)가 많을 수 있으므로, 단독으로 사용하기보다 다른 지표와 조합하는 것이 필수적입니다. 추세 지표(이동평균선, MACD)로 큰 방향을 확인하고, 스토캐스틱 RSI로 세밀한 진입·청산 타이밍을 잡는 방식이 효과적입니다. 또한 상위 타임프레임(4시간봉, 일봉)에서의 시그널이 하위 타임프레임보다 신뢰도가 높습니다.`,
  },

  // ── Support/Resistance & Pattern Analysis ──────────────────────────

  "btc-support-resistance": {
    description: `비트코인 지지/저항(Support & Resistance) 레벨 차트는 가격이 반복적으로 반등하거나 저항을 받는 주요 가격대를 시각화합니다. 지지선은 하락하는 가격이 매수세를 만나 반등하는 바닥 역할을 하고, 저항선은 상승하는 가격이 매도세를 만나 하락 반전하는 천장 역할을 합니다. 이 레벨들은 과거 거래 데이터, 거래량 프로파일, 심리적 라운드 넘버 등을 기반으로 형성됩니다.

비트코인 시장에서 심리적 가격대(Psychological Levels)는 특히 중요합니다. $10,000, $20,000, $50,000, $100,000 같은 라운드 넘버는 수많은 트레이더들의 주문이 집중되는 구간이며, 이 가격대를 돌파하거나 이탈할 때 큰 변동성이 발생합니다. 또한 이전 사이클의 고점(예: 2017년 고점 $20K, 2021년 고점 $69K)은 오랜 기간 강력한 지지/저항 역할을 합니다. 저항선이 돌파되면 지지선으로 전환되는 '역할 전환(Role Reversal)' 현상도 빈번하게 관찰됩니다.

지지/저항 분석은 진입가, 손절가, 목표가를 설정하는 데 실질적으로 활용됩니다. 지지선 근처에서 매수하고 해당 지지선 아래에 손절을 설정하면 리스크를 제한할 수 있고, 다음 저항선을 목표가로 설정하면 리스크 대비 보상 비율(Risk/Reward Ratio)을 계산할 수 있습니다. 거래량 프로파일(Volume Profile)과 함께 분석하면, 많은 거래가 발생한 가격대(High Volume Node)에서 더 강한 지지/저항이 형성됨을 확인할 수 있어 분석의 정확도가 높아집니다.`,
  },

  "btc-fibonacci": {
    description: `피보나치 되돌림(Fibonacci Retracement)은 피보나치 수열에서 파생된 비율(23.6%, 38.2%, 50%, 61.8%, 78.6%)을 이용하여 가격 조정의 잠재적 반전 지점을 예측하는 기술적 분석 도구입니다. 상승 추세에서의 조정 시에는 직전 저점에서 고점까지의 움직임에 피보나치 비율을 적용하고, 하락 추세에서의 반등 시에는 고점에서 저점까지의 움직임에 적용합니다.

비트코인 시장에서 61.8%(황금 비율)과 38.2% 되돌림 레벨은 특히 높은 반응 빈도를 보입니다. 강세장에서의 건전한 조정은 보통 38.2%~50% 되돌림에서 지지를 받으며, 61.8% 이상 되돌릴 경우 추세 전환의 가능성이 높아집니다. ATH(사상 최고가) 이후의 하락에서 78.6% 되돌림은 마지막 방어선으로 작용하며, 이를 이탈하면 장기 약세장 진입으로 해석됩니다. 2021년 ATH($69K) 기준으로 2022년 바닥($15.5K)은 약 77.5% 되돌림에 해당하여, 78.6% 레벨이 지지선으로 작용한 사례입니다.

피보나치 되돌림은 단독으로 사용하기보다 다른 기술적 분석 도구와 '컨플루언스(Confluence, 여러 시그널이 동일 가격대에서 겹치는 현상)'를 형성할 때 신뢰도가 크게 높아집니다. 예를 들어 피보나치 61.8% 레벨이 200일 이동평균선과 겹치거나, 이전 지지/저항 수준과 일치하면 해당 가격대에서의 반응 확률이 매우 높아집니다. 피보나치 확장(Extension) 레벨(1.618, 2.618)은 목표가 설정에도 활용되며, 강세장에서 다음 고점을 예측하는 데 참고할 수 있습니다.`,
  },

  "btc-bollinger": {
    description: `볼린저 밴드(Bollinger Bands)는 존 볼린저(John Bollinger)가 개발한 변동성 기반 기술적 지표로, 20일 단순이동평균(SMA)을 중심으로 위아래에 ±2 표준편차(σ) 밴드를 그려 가격의 상대적 위치와 변동성을 파악합니다. 밴드의 폭이 넓으면 변동성이 높은 상태, 좁으면 변동성이 낮은 상태(스퀴즈)를 나타냅니다.

볼린저 밴드의 핵심 패턴은 '스퀴즈(Squeeze)'와 '밴드워킹(Band Walking)'입니다. 스퀴즈는 밴드 폭이 극도로 좁아진 상태로, 큰 변동성 폭발(breakout)이 임박했음을 시사합니다. 비트코인은 스퀴즈 이후 상방 또는 하방으로 급격한 움직임을 보이는 경향이 있습니다. 밴드워킹은 가격이 상단 밴드 또는 하단 밴드를 따라 지속적으로 이동하는 현상으로, 강한 추세가 진행 중임을 나타냅니다. 상단 밴드워킹은 강세, 하단 밴드워킹은 약세를 의미합니다.

비트코인 시장에서 볼린저 밴드를 활용할 때 주의할 점은, 가격이 상단 밴드를 터치했다고 해서 반드시 매도 시그널이 아니며, 하단 밴드를 터치했다고 해서 반드시 매수 시그널이 아니라는 것입니다. 강한 추세장에서는 밴드워킹이 지속되기 때문입니다. 따라서 밴드 이탈 후 다시 밴드 안으로 복귀하는 시점을 반전 시그널로 활용하는 것이 더 효과적입니다. 또한 %B 지표(현재 가격의 밴드 내 상대적 위치)와 밴드 폭(Bandwidth)을 함께 모니터링하면 보다 정밀한 분석이 가능합니다.`,
  },
};

const CHART_ABOUT_MACRO_TRADFI: Record<string, ChartAboutContent> = {
  // ─── Macro Charts ────────────────────────────────────────────────────
  "us-real-gdp": {
    description: `미국 실질 GDP(Gross Domestic Product) 성장률은 인플레이션을 제거한 실제 경제 산출량의 변화를 분기별로 측정하는 핵심 거시경제 지표입니다. 경기 확장기에는 양(+)의 성장률을 기록하고, 수축기에는 음(-)의 성장률을 기록합니다. 2분기 연속 마이너스 성장은 '기술적 경기침체(Technical Recession)'로 정의되며, 이는 금융시장 전반에 큰 충격을 줍니다.

GDP 성장률은 소비(약 70%), 투자, 정부지출, 순수출의 네 가지 구성요소로 이루어집니다. 투자자에게 가장 중요한 것은 추세의 변화입니다. 성장률이 둔화되기 시작하면 기업 실적 악화와 주가 하락이 뒤따르는 경우가 많으며, 반대로 바닥에서 반등하면 리스크 자산(주식, 암호화폐)에 긍정적인 시그널입니다.

실질 GDP는 연율화(Annualized) 수치로 발표되며, BEA(경제분석국)가 매 분기 3차례(사전치, 잠정치, 확정치) 수정 발표합니다. 암호화폐 시장에서는 GDP 성장이 강하면 위험 선호 심리가 높아져 비트코인에 긍정적이지만, 너무 강하면 Fed의 금리 인상 우려로 부정적일 수 있습니다.`,
  },
  "global-gdp": {
    description: `세계 주요국 GDP 비교 차트는 미국, 중국, 유로존, 일본 등 글로벌 경제 대국들의 경제 규모와 성장 추세를 비교 분석하는 매크로 지표입니다. 각국의 GDP 추이를 통해 세계 경제의 무게중심이 어디로 이동하고 있는지, 어느 지역이 성장을 주도하는지를 파악할 수 있습니다.

미국은 세계 최대 경제 대국으로 GDP의 약 25%를 차지하며, 중국은 구매력평가(PPP) 기준으로 미국을 추월한 2위 경제국입니다. 유로존은 19개국 통합 경제권으로 미국에 필적하는 규모를 보유하고 있고, 일본은 장기 저성장에도 불구하고 4위 경제 대국의 위치를 유지하고 있습니다. 각국의 성장률 차이는 환율, 자본 흐름, 그리고 글로벌 자산 배분에 직접적인 영향을 미칩니다.

글로벌 GDP 트렌드는 암호화폐 시장에도 중요한 함의를 갖습니다. 세계 경제가 동반 성장하면 리스크 자산 선호도가 높아져 비트코인에 긍정적이고, 글로벌 경기침체 우려가 커지면 안전자산 선호로 단기적 하락 압력이 커집니다. 특히 중국 경제 둔화는 글로벌 유동성 축소로 이어져 암호화폐 시장에 부정적 영향을 줄 수 있습니다.`,
  },
  "us-cpi": {
    description: `미국 소비자물가지수(CPI, Consumer Price Index)는 도시 소비자가 구매하는 재화와 서비스 바스켓의 가격 변동을 측정하는 대표적인 인플레이션 지표입니다. 전년 동월 대비(YoY) 변화율로 표시되며, 노동통계국(BLS)이 매월 발표합니다. Fed의 물가안정 목표인 2%를 크게 상회하면 금리 인상, 하회하면 금리 인하 근거가 됩니다.

CPI는 식품, 에너지, 주거비, 교통, 의료 등 다양한 카테고리로 구성됩니다. 변동성이 큰 식품과 에너지를 제외한 '근원 CPI(Core CPI)'는 기저 인플레이션 추세를 파악하는 데 더 유용합니다. CPI 발표일은 금융시장에서 가장 변동성이 큰 이벤트 중 하나이며, 예상치와의 차이(서프라이즈)에 따라 주식, 채권, 암호화폐 시장이 크게 요동칩니다.

높은 인플레이션은 비트코인의 '디지털 금' 서사를 강화하여 장기적으로 긍정적일 수 있지만, 단기적으로는 Fed의 긴축 정책을 촉발하여 유동성을 줄이고 리스크 자산에 부정적 영향을 미칩니다. 반대로 CPI가 빠르게 하락하면 금리 인하 기대가 높아져 비트코인에 강세 요인이 됩니다.`,
  },
  "us-pce": {
    description: `핵심 PCE(Personal Consumption Expenditures) 가격 지수는 연준(Fed)이 공식적으로 선호하는 인플레이션 측정 지표입니다. CPI와 유사하게 소비 가격의 변동을 추적하지만, 소비자의 대체 행동(가격이 오른 상품 대신 저렴한 대체재 구매)을 반영하고, 가중치를 동적으로 조정한다는 점에서 차이가 있습니다. 이 때문에 PCE는 일반적으로 CPI보다 낮은 수치를 보입니다.

Fed의 물가안정 목표는 핵심 PCE 기준 2%입니다. 핵심 PCE가 2%를 크게 상회하면 통화정책 긴축이 강화되고, 2%에 근접하면 금리 인하의 여지가 생깁니다. CPI가 시장에서 더 주목받지만, Fed의 정책 결정은 PCE를 기준으로 이루어지므로 투자자는 두 지표를 모두 추적해야 합니다.

PCE 데이터는 BEA(경제분석국)가 CPI보다 약 2주 후에 발표합니다. CPI와 PCE의 괴리가 클 때(예: CPI는 높지만 PCE는 안정적일 때)는 Fed가 시장의 인플레이션 우려보다 덜 긴축적일 수 있다는 신호로 해석되어, 암호화폐를 포함한 리스크 자산에 긍정적인 서프라이즈가 될 수 있습니다.`,
  },
  "breakeven-inflation": {
    description: `5년 기대 인플레이션율(5-Year Breakeven Inflation Rate)은 명목 국채 수익률과 TIPS(물가연동국채) 수익률의 차이로, 채권시장 참여자들이 향후 5년간 예상하는 연평균 인플레이션율을 나타냅니다. 이는 시장이 '가격으로 말하는' 인플레이션 기대치이므로, 설문 기반 기대 인플레이션보다 실시간성과 신뢰도가 높습니다.

기대 인플레이션이 2% 근처에서 안정적이면 Fed 정책에 대한 불확실성이 낮아 시장에 긍정적입니다. 반면 급격히 상승하면 인플레이션 공포가 확산되어 금리 인상 기대가 높아지고, 성장주와 암호화폐에 부정적입니다. 급격히 하락하면 디플레이션 우려나 경기침체 공포를 의미하여, 역시 리스크 자산에 부정적일 수 있습니다.

비트코인 투자자에게 기대 인플레이션은 이중적 의미를 갖습니다. 기대 인플레이션이 적당히 높으면 비트코인의 인플레이션 헤지 수요를 자극하고, 너무 높으면 Fed 긴축으로 유동성이 줄어 비트코인에 부정적입니다. 가장 이상적인 환경은 기대 인플레이션이 안정적이면서 실질금리가 낮은(또는 마이너스인) 상황입니다.`,
  },
  "us-unemployment": {
    description: `미국 실업률(Unemployment Rate)은 경제활동인구 중 일자리를 구하지 못한 사람의 비율로, 노동시장의 건강 상태를 나타내는 대표적인 후행지표입니다. 노동통계국(BLS)이 매월 첫째 주 금요일에 비농업 고용과 함께 발표하며, 시장에 큰 영향을 미칩니다. 자연실업률(약 4.0-4.5%)과의 비교를 통해 노동시장의 과열 또는 냉각 여부를 판단할 수 있습니다.

'Sahm Rule'은 실업률의 3개월 이동평균이 최근 12개월 최저치보다 0.5%p 이상 상승하면 경기침체 시작을 알리는 지표로, 1970년 이후 모든 경기침체를 정확히 예측했습니다. 실업률이 바닥에서 반등하기 시작하면 경기 둔화의 초기 신호이므로, 투자 포트폴리오의 방어적 전환을 고려해야 합니다.

낮은 실업률은 경제 호황을 의미하지만, 너무 낮으면 임금 인플레이션 압력이 커져 Fed가 금리를 올릴 수 있습니다. 암호화폐 시장에서는 실업률 급등이 경기침체 공포로 이어져 단기적 하락을 유발하지만, 동시에 Fed의 금리 인하 기대를 높여 중기적으로는 유동성 확대 → 비트코인 상승의 촉매가 될 수 있습니다.`,
  },
  "us-nonfarm-payrolls": {
    description: `비농업 고용(Nonfarm Payrolls, NFP)은 미국 경제에서 농업을 제외한 모든 산업의 월별 신규 일자리 수를 측정하는 지표로, 매월 첫째 주 금요일에 발표됩니다. 이 지표는 고용시장의 강도를 직접적으로 보여주며, Fed의 통화정책 결정에 핵심적인 역할을 합니다. 시장 예상치와의 차이가 클수록 발표 직후 금융시장의 변동성이 극대화됩니다.

월별 약 15만~25만 개의 신규 일자리 창출은 건강한 경제를 나타내며, 이를 크게 상회하면 경기 과열, 크게 하회하면 경기 둔화를 시사합니다. NFP가 예상보다 강하면 달러 강세·금리 상승으로 이어져 비트코인에 단기적으로 부정적이고, 예상보다 약하면 금리 인하 기대로 비트코인에 긍정적인 경향이 있습니다.

NFP 발표일은 '비농업 고용 금요일(NFP Friday)'로 불리며, 트레이더들 사이에서 월간 최대 변동성 이벤트로 간주됩니다. 데이터 발표 후 수 초 내에 비트코인이 2-5% 급등하거나 급락하는 것이 일반적이므로, 레버리지 트레이더는 포지션 관리에 특히 주의해야 합니다. 고용 데이터의 수정치(revision)도 시장에 영향을 줄 수 있어 전월 수정치도 함께 확인해야 합니다.`,
  },
  "us-initial-claims": {
    description: `신규 실업수당 청구건수(Initial Jobless Claims)는 매주 목요일에 발표되는 고빈도 고용 지표로, 전주에 처음으로 실업보험을 신청한 사람의 수를 집계합니다. 월별 지표인 실업률이나 NFP와 달리 주간 데이터이므로 노동시장의 변화를 가장 빠르게 포착할 수 있는 선행지표 역할을 합니다.

통상 20만~25만 건 수준이면 건강한 노동시장을 나타내고, 30만 건을 넘으면 고용 악화의 신호입니다. 4주 이동평균을 사용하면 주별 노이즈를 제거하고 추세를 더 명확히 파악할 수 있습니다. 역사적으로 신규 청구건수가 급증하기 시작하면 경기침체 진입 약 3-6개월 전을 가리키는 경향이 있어, 조기 경보 시스템으로 활용됩니다.

암호화폐 투자자에게 이 지표는 Fed 정책 방향을 예측하는 데 유용합니다. 청구건수가 추세적으로 증가하면 Fed가 경기 부양을 위해 금리를 인하할 가능성이 높아져 비트코인에 긍정적이고, 반대로 청구건수가 역사적 저점 근처에서 유지되면 긴축 정책이 지속될 수 있어 단기적으로 비트코인에 중립~부정적입니다.`,
  },
  "fed-funds-rate": {
    description: `연방기금금리(Federal Funds Rate)는 미국 중앙은행(Fed)이 설정하는 기준금리로, 은행 간 야간 대출에 적용되는 금리입니다. 모든 금융자산의 가격에 영향을 미치는 가장 중요한 단일 변수이며, 8주마다 열리는 FOMC(연방공개시장위원회) 회의에서 결정됩니다. 금리 인상은 경기 과열과 인플레이션을 억제하고, 금리 인하는 경기 부양과 고용 촉진을 목적으로 합니다.

Fed의 금리 사이클은 암호화폐 시장과 강한 상관관계를 보입니다. 2020-2021년 제로금리 환경에서 비트코인은 $60K 이상으로 급등했고, 2022년 급격한 금리 인상(0%→5.25%) 시기에는 $16K까지 하락했습니다. 금리 인상 사이클이 끝나고 인하로 전환되는 '피벗(pivot)' 시점은 역사적으로 비트코인의 새로운 상승장 시작과 일치했습니다.

CME FedWatch 도구를 통해 시장이 선물 가격에 반영한 향후 금리 경로를 확인할 수 있습니다. 시장 기대와 실제 Fed 결정 사이의 차이(서프라이즈)가 클수록 비트코인 가격 변동이 커집니다. 특히 '점도표(Dot Plot)'에서 위원들의 금리 전망 분포를 확인하면 중기적인 금리 방향을 가늠할 수 있습니다.`,
  },
  "us-10y-yield": {
    description: `미국 10년 국채 수익률은 글로벌 금융시장의 '벤치마크 금리'로, 모든 자산의 가치 평가에 기준이 되는 핵심 지표입니다. 주택담보대출 금리, 회사채 금리, 주식의 할인율 등이 모두 10년물 수익률에 연동되어 있어, 이 수치의 변동은 전 세계 자산 가격에 파급됩니다.

10년물 수익률은 경제 성장 기대, 인플레이션 기대, 그리고 기간 프리미엄(term premium)의 세 가지 요소로 구성됩니다. 수익률이 상승하면 경제 전망이 밝거나 인플레이션 우려가 커지고 있음을 의미하고, 하락하면 경기 둔화 우려나 안전자산 수요가 증가하고 있음을 반영합니다. 특히 4% 이상의 높은 수익률은 주식과 암호화폐 같은 위험 자산에 강한 역풍이 됩니다.

비트코인과 10년물 수익률의 관계는 단순하지 않습니다. 실질금리(10년물 수익률 - 기대 인플레이션)가 하락하면 비트코인에 긍정적이고, 실질금리가 상승하면 부정적입니다. 이는 비트코인이 '제로 쿠폰의 장기 자산'으로서, 높은 실질금리 환경에서 기회비용이 증가하기 때문입니다.`,
  },
  "us-2y-10y-spread": {
    description: `장단기 금리차(2Y-10Y Treasury Spread)는 10년 국채 수익률에서 2년 국채 수익률을 뺀 값으로, 수익률 곡선의 기울기를 나타냅니다. 정상적인 경제 환경에서는 장기 금리가 단기 금리보다 높아 양(+)의 값을 보이지만, 이 수치가 음(-)으로 전환되면 '수익률 곡선 역전(Yield Curve Inversion)'이라 하며, 경기침체의 강력한 선행지표로 인정받습니다.

역사적으로 2Y-10Y 스프레드 역전은 1950년 이후 모든 미국 경기침체를 약 6-18개월 전에 예측했으며, 허위 신호(false signal)가 거의 없었습니다. 다만 역전 자체보다 역전 후 다시 양(+)으로 전환되는 '역전 해소(un-inversion)' 시점이 실제 경기침체 시작에 더 가까운 것으로 알려져 있으므로, 역전 해소 시점에 특히 경계해야 합니다.

암호화폐 시장에서 수익률 곡선 역전은 두 가지 함의를 갖습니다. 첫째, 역전은 Fed가 단기 금리를 높이 올린 긴축 환경을 반영하므로, 유동성 축소로 비트코인에 부정적입니다. 둘째, 역전 해소 후 Fed가 금리를 인하하기 시작하면, 이는 새로운 비트코인 강세장의 초기 신호가 될 수 있습니다.`,
  },
  "us-dollar-index": {
    description: `DXY 달러 인덱스는 유로(EUR, 57.6%), 엔(JPY, 13.6%), 파운드(GBP, 11.9%), 캐나다 달러(CAD, 9.1%), 스웨덴 크로나(SEK, 4.2%), 스위스 프랑(CHF, 3.6%) 등 6개 주요 통화 바스켓 대비 미국 달러의 상대적 가치를 측정하는 지수입니다. 기준값 100을 중심으로, 100 이상이면 달러 강세, 이하이면 달러 약세를 의미합니다.

달러 인덱스는 비트코인과 역(-)의 상관관계를 보이는 경향이 강합니다. 달러가 강세이면 글로벌 자금이 달러 자산으로 몰려 비트코인에서 유출되고, 달러가 약세이면 대체 가치 저장 수단으로서 비트코인의 매력이 높아집니다. 특히 DXY의 장기 하락 추세는 역사적으로 비트코인 강세장과 일치하는 경우가 많았습니다.

달러 강/약세를 결정하는 핵심 요인은 미국과 다른 국가들 간의 금리 차이(금리 차별화), 경제 성장률 차이, 그리고 지정학적 리스크입니다. Fed가 다른 중앙은행보다 먼저 금리를 인하하면 달러가 약세로 전환되어 비트코인에 유리한 환경이 조성됩니다. DXY가 110 이상이면 글로벌 유동성 위축 신호, 90 이하이면 유동성 확대 신호로 해석됩니다.`,
  },
  "us-m2-money-supply": {
    description: `M2 통화량은 현금, 요구불예금, 저축예금, 소액 정기예금, MMF 등을 포함하는 광의의 통화 공급량으로, 경제 내 유동성의 총량을 나타냅니다. Fed와 시중 은행 시스템의 통화 창출 능력을 반영하며, 경제 활동과 인플레이션의 궁극적 동인 중 하나입니다.

M2와 비트코인의 상관관계는 매우 주목할 만합니다. 2020년 코로나 대응으로 M2가 약 40% 급증했을 때 비트코인은 $10K에서 $69K까지 상승했고, 2022년 M2 증가율이 마이너스로 전환(사상 최초)되면서 비트코인은 $16K까지 하락했습니다. 이는 '유동성이 모든 보트를 들어올린다(Liquidity lifts all boats)'는 격언을 보여줍니다.

글로벌 M2(미국+유로존+중국+일본)를 종합적으로 추적하면 비트코인의 중기적 방향을 더 정확히 예측할 수 있습니다. 글로벌 M2가 추세적으로 증가하는 환경은 비트코인의 구조적 강세장과 일치하며, M2 증가율의 변곡점은 비트코인 가격의 전환점보다 약 2-3개월 선행하는 것으로 관찰됩니다.`,
  },
  "fed-balance-sheet": {
    description: `연준 대차대조표(Fed Balance Sheet)는 연방준비제도가 보유한 총 자산의 규모로, 양적완화(QE)와 양적긴축(QT)의 직접적인 결과물입니다. QE 시에 Fed는 국채와 MBS(주택담보증권)를 매입하여 대차대조표를 확대하고 시장에 유동성을 공급하며, QT 시에는 만기 도래 채권의 재투자를 중단하여 대차대조표를 축소합니다.

2008년 금융위기 전 $0.9T였던 Fed 대차대조표는 세 차례의 QE를 거쳐 $4.5T로 확대되었고, 코로나 대응으로 $9T까지 급증했습니다. 이후 2022년부터 QT가 시작되어 규모가 축소되고 있습니다. 대차대조표의 확대/축소는 금융시장의 유동성 환경을 직접 결정하므로, Fed 금리 결정만큼이나 중요한 정책 변수입니다.

비트코인과 Fed 대차대조표의 상관관계는 놀라울 정도로 높습니다. QE 기간(2020-2021년)에 비트코인은 폭발적으로 상승했고, QT 기간(2022년)에는 급락했습니다. QT의 속도 감소나 중단 시점은 비트코인의 바닥 형성과 맞물리는 경향이 있어, 투자자들은 Fed의 대차대조표 변화 속도를 면밀히 모니터링해야 합니다.`,
  },

  // ─── TradFi Charts ───────────────────────────────────────────────────
  "sp500-pe-ratio": {
    description: `S&P500 PER(주가수익비율, Price-to-Earnings Ratio)은 S&P500 지수의 가격을 구성 기업들의 주당순이익(EPS) 합으로 나눈 밸류에이션 지표입니다. 현재 주가가 기업 실적 대비 얼마나 비싸거나 저렴한지를 판단하는 가장 기본적인 잣대이며, 역사적 평균(약 15-17배)과 비교하여 시장의 고/저평가 여부를 가늠합니다.

PER이 20배를 초과하면 역사적 평균 대비 고평가, 25배 이상이면 과열 수준으로 간주됩니다. 반면 12배 이하는 심각한 저평가로, 경기침체나 금융위기 시에만 나타나는 수준입니다. 다만 PER은 금리 수준에 따라 적정 범위가 달라집니다. 저금리 환경에서는 높은 PER이 정당화될 수 있고, 고금리 환경에서는 낮은 PER도 비쌀 수 있습니다.

암호화폐 투자자에게 S&P500 PER은 전통 시장의 리스크 선호도를 가늠하는 척도입니다. PER이 극단적으로 높으면 시장 전반의 과열 신호이며, 주식시장 조정 시 암호화폐도 함께 하락하는 경향이 있습니다. 반대로 PER이 역사적 저점에 있으면, 이후 리스크 자산 전반의 회복과 함께 비트코인도 강세를 보이는 경우가 많습니다.`,
  },
  "sp500-earnings": {
    description: `S&P500 기업실적(Earnings)은 미국 대형주 500개 기업의 분기별 순이익을 집계한 것으로, 주당순이익(EPS)으로 표시됩니다. 매 분기 어닝 시즌(실적 발표 기간)은 약 6주간 지속되며, 이 기간 동안 개별 기업과 시장 전체의 방향이 결정됩니다. 실적 성장률(전년 동기 대비 EPS 변화율)은 주식시장의 펀더멘털 건강을 직접 보여줍니다.

'어닝 서프라이즈(Earnings Surprise)'는 실제 실적이 애널리스트 컨센서스를 상회하거나 하회하는 정도를 나타내며, 시장 반응의 핵심 동인입니다. 역사적으로 S&P500 기업의 약 70%가 컨센서스를 상회하는 실적을 보고하지만, 이 비율이 크게 변하면 시장 심리에 중대한 영향을 미칩니다. 실적 가이던스(향후 전망)는 실제 실적보다 더 중요하게 여겨지기도 합니다.

기업실적은 암호화폐 시장과 간접적으로 연결됩니다. 강한 기업실적은 경제 호황을 반영하여 리스크 자산 선호도를 높이고, 기업이 비트코인을 재무제표에 편입하거나 블록체인 기술에 투자할 여력을 제공합니다. 반면 실적 침체기에는 투자자들이 위험 자산에서 이탈하여 비트코인에도 하방 압력이 가해집니다.`,
  },
  "buffett-indicator": {
    description: `버핏 지표(Buffett Indicator)는 워런 버핏이 "어느 한 시점에서든 시장이 어디에 있는지를 보여주는 가장 좋은 단일 지표"라고 평가한 밸류에이션 측정도구입니다. 미국 주식시장의 총 시가총액(Wilshire 5000)을 GDP로 나눈 비율로, 경제 규모 대비 주식시장의 크기가 적정한지를 판단합니다.

역사적으로 이 비율이 100% 이하이면 저평가, 100-120%이면 적정 수준, 120% 이상이면 고평가, 150% 이상이면 극단적 과열로 해석됩니다. 2000년 닷컴 버블 시 약 140%를 기록한 후 주가가 폭락했고, 2021년에는 200%를 넘어서며 사상 최고치를 갱신했습니다. 다만 이 지표는 금리 수준, 기업의 해외 수익 비중 증가, 기술기업의 높은 마진 등 구조적 변화를 충분히 반영하지 못한다는 비판도 있습니다.

버핏 지표가 극단적 고평가를 시사할 때 주식시장 조정이 발생하면, 암호화폐 시장도 동반 하락하는 경향이 있습니다. 이는 레버리지 청산, 리스크 오프 심리, 마진콜에 따른 강제 매도 등이 자산 전반에 걸쳐 발생하기 때문입니다. 반대로 버핏 지표가 저평가 영역에서 반등하기 시작하면, 전체 리스크 자산의 회복 사이클이 시작되는 신호입니다.`,
  },
  "shiller-cape": {
    description: `Shiller CAPE(Cyclically Adjusted Price-to-Earnings ratio, 경기조정 주가수익비율)는 노벨 경제학상 수상자 로버트 쉴러 교수가 개발한 장기 밸류에이션 지표입니다. S&P500의 현재 가격을 인플레이션 조정된 과거 10년간의 평균 실적으로 나누어, 단기 경기 변동의 영향을 제거하고 구조적 밸류에이션 수준을 파악합니다.

CAPE의 장기 평균은 약 17배이며, 25배 이상은 고평가, 30배 이상은 역사적 상위 10%의 과열 수준입니다. 1929년 대공황 전(33배), 2000년 닷컴 버블(44배) 시기에 극단적 수준을 기록한 후 대규모 하락이 뒤따랐습니다. 다만 최근 수십 년간 기술 기업의 높은 수익성, 낮은 금리 환경, 자사주 매입 증가 등으로 CAPE의 '새로운 정상(new normal)' 수준이 과거보다 높아졌다는 주장도 있습니다.

CAPE는 향후 10-12년의 주식시장 실질 수익률을 예측하는 데 높은 정확도를 보입니다. CAPE가 높을수록 향후 장기 수익률이 낮고, 낮을수록 장기 수익률이 높습니다. 이는 비트코인 투자자에게 전통 자산 대비 암호화폐의 상대적 매력도를 판단하는 데 도움이 됩니다. 주식시장의 기대 수익률이 낮을 때, 비트코인과 같은 대안 자산으로의 자금 유입이 증가할 수 있습니다.`,
  },
  "sp500-index": {
    description: `S&P500 지수는 미국 대형주 500개 기업의 시가총액 가중 평균 지수로, 미국 주식시장은 물론 글로벌 금융시장의 가장 중요한 벤치마크입니다. 미국 상장 기업 전체 시가총액의 약 80%를 대표하며, 전 세계 기관투자자와 개인투자자 모두가 기준으로 삼는 지수입니다. S&P Dow Jones Indices가 관리하며, 구성 종목은 시가총액, 유동성, 섹터 대표성 등을 기준으로 주기적으로 조정됩니다.

S&P500은 장기적으로 연평균 약 10%(인플레이션 조정 전) 수익률을 기록해왔으며, 경기 사이클에 따라 강세장과 약세장을 반복합니다. 20% 이상 하락하면 '약세장(Bear Market)', 20% 이상 상승하면 '강세장(Bull Market)'으로 정의됩니다. 200일 이동평균선은 장기 추세 판단의 핵심 기술적 지표로 활용됩니다.

비트코인과 S&P500의 상관관계는 2020년 이후 크게 높아졌습니다. 기관투자자의 암호화폐 시장 참여가 증가하면서, 두 자산 모두 글로벌 유동성과 위험 선호 심리에 동일하게 반응하는 경향이 강해졌습니다. S&P500이 사상최고가를 경신하는 환경은 비트코인에도 강세 신호이며, S&P500의 급격한 하락은 암호화폐 시장의 동반 하락을 촉발하는 경우가 많습니다.`,
  },
  "nasdaq-composite": {
    description: `나스닥 종합지수(NASDAQ Composite)는 나스닥 거래소에 상장된 3,000개 이상의 기업을 포함하는 시가총액 가중 지수로, 기술주(Tech)와 성장주(Growth)의 바로미터입니다. Apple, Microsoft, Amazon, Alphabet(Google), Meta, NVIDIA, Tesla 등 세계 최대 기술 기업들이 포진해 있어, 기술 혁신과 성장에 대한 시장의 기대를 직접 반영합니다.

나스닥은 S&P500보다 변동성이 크며, 금리 변화에 더 민감합니다. 이는 성장주의 가치가 미래 이익의 현재가치 할인으로 결정되기 때문에, 금리가 오르면 할인율이 높아져 가치가 감소하고, 금리가 내리면 가치가 증가하기 때문입니다. 2022년 금리 급등기에 나스닥이 S&P500보다 더 큰 폭으로 하락한 것이 대표적인 사례입니다.

비트코인과 나스닥의 상관관계는 S&P500보다 더 높습니다. 두 자산 모두 '기술적 혁신'과 '미래 가치'에 베팅하는 성장 지향적 투자 대상이기 때문입니다. 나스닥이 강세이면 기술주·성장주·혁신 자산에 대한 위험 선호가 높다는 의미이고, 이는 비트코인과 알트코인에도 긍정적인 환경입니다. 나스닥의 기술적 분석 레벨(지지선, 저항선)은 비트코인의 방향을 예측하는 보조 도구로 활용할 수 있습니다.`,
  },
  "gold-price": {
    description: `금 현물가격(Gold Spot Price)은 인류가 수천 년간 가치 저장 수단으로 사용해온 귀금속의 온스당 가격입니다. 대표적인 안전자산(Safe Haven)으로, 인플레이션 헤지, 통화 가치 하락 방어, 지정학적 위기 시 피난처 역할을 합니다. 전 세계 중앙은행들이 외환보유고의 상당 부분을 금으로 보유하고 있으며, 최근 중국, 러시아, 인도 등의 중앙은행 금 매입이 가속화되고 있습니다.

금 가격의 핵심 결정 요인은 실질금리(명목금리 - 인플레이션)입니다. 실질금리가 하락하면 금의 기회비용이 줄어 가격이 상승하고, 실질금리가 상승하면 이자가 붙는 채권의 매력이 높아져 금 가격이 하락합니다. 달러 약세도 금 가격에 긍정적이며, 지정학적 불안(전쟁, 제재 등)은 안전자산 수요를 급증시켜 금 가격을 끌어올립니다.

비트코인은 '디지털 금(Digital Gold)'으로 불리며, 금과 여러 속성을 공유합니다. 제한된 공급량(금: 지구 내 한정, BTC: 2,100만 개), 탈중앙성, 인플레이션 헤지 기능 등이 유사합니다. 금과 비트코인의 시가총액 비율(현재 금이 약 10배 이상)은 비트코인의 장기 성장 잠재력을 가늠하는 척도로 활용됩니다. 두 자산이 동시에 상승하면 법정화폐 가치 하락에 대한 시장의 우려가 커지고 있다는 시그널입니다.`,
  },
  "silver-price": {
    description: `은 현물가격(Silver Spot Price)은 금과 함께 대표적인 귀금속이지만, 금과 달리 산업수요(전체의 약 50%)와 투자수요가 공존하는 독특한 자산입니다. 태양광 패널, 전자기기, 의료기기 등에 필수적으로 사용되어, 산업 경기와 녹색 에너지 전환의 수혜를 동시에 받습니다. 이중적 수요 구조 때문에 금보다 변동성이 훨씬 크며, '가난한 자의 금(Poor Man\'s Gold)'이라 불리기도 합니다.

금은비(Gold/Silver Ratio)는 금 가격을 은 가격으로 나눈 비율로, 귀금속 시장의 중요한 밸류에이션 지표입니다. 역사적 평균은 약 60-65배이며, 80배 이상이면 은이 금 대비 저평가(은 매수 신호), 50배 이하이면 은이 금 대비 고평가로 해석됩니다. 강세장 후반부에는 은이 금을 아웃퍼폼하며 금은비가 하락하는 경향이 있습니다.

암호화폐 시장에서 은은 직접적인 상관관계는 약하지만, 리스크 선호(Risk-on) 환경에서 은과 비트코인이 동시에 상승하는 패턴이 관찰됩니다. 특히 인플레이션 헤지 차원에서 귀금속과 비트코인에 함께 투자하는 '하드자산 포트폴리오' 전략이 인기를 끌고 있으며, 은의 산업수요 증가는 실물경제의 건강함을 반영하여 간접적으로 비트코인에도 긍정적 환경을 조성합니다.`,
  },
  "crude-oil-price": {
    description: `WTI(West Texas Intermediate) 원유 가격은 글로벌 에너지 시장의 벤치마크이자, 인플레이션과 경제 활동의 핵심 선행지표입니다. 원유는 운송, 제조, 난방, 석유화학 등 경제 전반에 사용되어, 원유 가격의 변동은 소비자물가(CPI)와 기업 비용에 직접적인 영향을 미칩니다. OPEC+(산유국 카르텔)의 감산/증산 결정, 지정학적 갈등(중동 분쟁), 미국 셰일 생산량이 가격의 주요 결정 요인입니다.

원유 가격이 급등하면 인플레이션 우려가 커져 Fed의 금리 인상 압력이 높아지고, 소비자 지출이 위축되어 경기 둔화를 촉발할 수 있습니다. 반대로 원유 가격이 급락하면 수요 둔화(경기침체 신호)를 반영하거나, 공급 과잉을 의미합니다. 유가 $100 이상은 경제에 부담, $40 이하는 산유국 경제 위기와 디플레이션 우려를 촉발하는 수준으로 간주됩니다.

비트코인 채굴에 소비되는 에너지 비용은 원유 가격에 간접적으로 연동되어, 유가 상승은 채굴 비용을 높이고 손익분기점을 올립니다. 거시적으로 원유 가격 안정은 인플레이션 완화와 금리 인하 기대를 높여 비트코인에 긍정적이며, 원유 가격 급등은 글로벌 유동성을 위축시켜 비트코인을 포함한 위험 자산에 부정적입니다.`,
  },
  "vix-index": {
    description: `VIX(CBOE Volatility Index, 공포지수)는 S&P500 옵션의 30일 내재변동성을 측정하는 지표로, 시장 참여자들이 향후 30일간 예상하는 주식시장의 변동성을 수치화한 것입니다. '공포지수'라는 별명에서 알 수 있듯이, VIX가 높으면 시장의 불안과 공포가 크고, 낮으면 안도감과 자만이 팽배합니다. 일반적으로 VIX 20 이하는 안정적, 20-30은 불안정, 30 이상은 공포, 40 이상은 극단적 공포 상태를 나타냅니다.

VIX의 역설적 특성은 투자에 매우 유용합니다. 극단적으로 높은 VIX(40+)는 역사적으로 주식시장의 바닥과 일치하는 경우가 많아, 역발상 매수 신호로 해석됩니다. 반대로 극단적으로 낮은 VIX(12 이하)는 시장의 자만심이 극에 달했음을 의미하며, 갑작스러운 변동성 폭발(Vol Shock)의 전조가 될 수 있습니다. "공포에 사고, 탐욕에 팔라"는 격언이 VIX에서 정량화됩니다.

비트코인과 VIX의 관계는 복잡하지만 중요합니다. VIX가 급등하는 시장 공포 국면에서 비트코인도 함께 하락하는 경향이 있지만, VIX가 정점을 찍고 하락 반전하면 비트코인이 주식시장보다 빠르게 반등하는 패턴이 자주 관찰됩니다. VIX 선물의 '콘탱고(contango)' 구조(선물가격 > 현물가격)가 지속되면 시장 참여자들이 미래의 위험을 헤지하고 있다는 의미이므로, 비트코인 투자자도 방어적 포지션을 고려해야 합니다.`,
  },
};

export default function ChartDetailPage() {
  const params = useParams();
  const chartId = typeof params.chartId === "string" ? params.chartId : "";
  const chart = getChartById(chartId);

  const [period, setPeriod] = useState<string>("1Y");
  const [scaleType, setScaleType] = useState<"linear" | "log">("linear");
  const [isFavorited, setIsFavorited] = useState(false);
  const [rawData, setRawData] = useState<
    Array<{ time: string; value: number }>
  >([]);
  const [rawSecondary, setRawSecondary] = useState<
    Array<{ time: string; value: number }>
  >([]);
  const [secondaryLabel, setSecondaryLabel] = useState("");
  const [rawOverlays, setRawOverlays] = useState<OverlaySeries[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback title from URL slug
  const chartTitle =
    chart?.title ||
    chartId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const chartColor = chart?.color || "#2962FF";
  const backHref = chart
    ? `/charts/${chart.section}`
    : "/charts/crypto";

  const dualConfig = DUAL_CHART_CONFIG[chartId] || null;

  // Fetch full data from API or generate sample (only on chartId change)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setRawSecondary([]);
      setSecondaryLabel("");
      setRawOverlays([]);

      if (chart?.apiEndpoint) {
        try {
          const params = new URLSearchParams(chart.apiParams || {});
          const res = await fetch(`${chart.apiEndpoint}?${params}`);
          const json = await res.json();

          const metric = chart.apiParams?.metric;

          // Always parse price data first (for dual-chart: top = price)
          let priceData: Array<{ time: string; value: number }> = [];
          if (json.data && Array.isArray(json.data)) {
            if (Array.isArray(json.data[0])) {
              priceData = json.data.map(([ts, val]: [number, number]) => ({
                time: new Date(ts).toISOString().split("T")[0],
                value: val,
              }));
            } else if (json.data[0]?.date) {
              priceData = json.data.map((d: { date: string; value: string }) => ({
                time: d.date,
                value: parseFloat(d.value),
              }));
            }
          } else if (json.withStables?.data) {
            priceData = json.withStables.data.map(([ts, val]: [number, number]) => ({
              time: new Date(ts).toISOString().split("T")[0],
              value: val,
            }));
          }

          // For dual-chart indicators (mvrv): show price on top, indicator on bottom
          if (dualConfig && metric === "mvrv" && json.indicator && Array.isArray(json.indicator)) {
            setRawData(priceData);
            setRawSecondary(
              json.indicator.map(([ts, val]: [number, number]) => ({
                time: new Date(ts).toISOString().split("T")[0],
                value: parseFloat(val.toFixed(3)),
              }))
            );
            setSecondaryLabel(dualConfig.label);
          }
          // For single indicator charts (RSI, MACD): show only indicator
          else if (metric && (metric === "rsi" || metric === "macd") && json.indicator && Array.isArray(json.indicator)) {
            const indicatorData = json.indicator.map(([ts, val]: [number, number]) => ({
              time: new Date(ts).toISOString().split("T")[0],
              value: val,
            }));
            if (indicatorData.length > 0) {
              setRawData(indicatorData);
            } else if (priceData.length > 0) {
              setRawData(priceData);
            } else {
              generateSampleData();
            }
          }
          // Bollinger: show BTC price as main, bands as overlays
          else if (metric === "bollinger" && json.middle && priceData.length > 0) {
            setRawData(priceData);
          }
          // Standard: just price
          else if (priceData.length > 0) {
            setRawData(priceData);
          } else {
            generateSampleData();
          }

          // ── Parse model overlay data ──
          const toChart = (arr: Array<[number, number]>) =>
            arr.map(([ts, val]: [number, number]) => ({
              time: new Date(ts).toISOString().split("T")[0],
              value: val,
            }));
          const newOverlays: OverlaySeries[] = [];

          // Comparison overlay (BTC vs Gold / S&P 500)
          if (json.compareOverlay && Array.isArray(json.compareOverlay)) {
            const compareColor = chartId === "btc-vs-gold-roi" ? "#F59E0B" : "#EF4444";
            newOverlays.push({ data: toChart(json.compareOverlay), color: compareColor, lineWidth: 2 });
          }

          // SMA overlays (50-day and 200-day moving averages)
          if (json.sma50 && Array.isArray(json.sma50)) {
            newOverlays.push({ data: toChart(json.sma50), color: "#F59E0B", lineWidth: 2 }); // gold
          }
          if (json.sma200 && Array.isArray(json.sma200)) {
            newOverlays.push({ data: toChart(json.sma200), color: "#EF4444", lineWidth: 2 }); // red
          }

          // Bollinger bands (upper, middle, lower)
          if (json.upper && json.middle && json.lower) {
            newOverlays.push({ data: toChart(json.upper), color: "#EF4444", lineWidth: 1 });
            newOverlays.push({ data: toChart(json.middle), color: "#60A5FA", lineWidth: 2 });
            newOverlays.push({ data: toChart(json.lower), color: "#10B981", lineWidth: 1 });
          }

          // Log regression bands
          if (json.regressionMiddle) {
            newOverlays.push({ data: toChart(json.regressionMiddle), color: "#60A5FA", lineWidth: 2 });
            newOverlays.push({ data: toChart(json.regressionUpper), color: "#F87171", lineWidth: 1 });
            newOverlays.push({ data: toChart(json.regressionLower), color: "#34D399", lineWidth: 1 });
          }

          // Rainbow bands (9 colored lines)
          const rainbowColors = ["#1a237e", "#1565c0", "#0097a7", "#00897b", "#43a047", "#fdd835", "#ff8f00", "#e65100", "#c62828"];
          if (json.rainbow0) {
            for (let b = 0; b < 9; b++) {
              if (json[`rainbow${b}`]) {
                newOverlays.push({ data: toChart(json[`rainbow${b}`]), color: rainbowColors[b], lineWidth: 2 });
              }
            }
          }

          // S2F model line + color segments (halving cycle progress)
          if (json.s2fModel) {
            newOverlays.push({ data: toChart(json.s2fModel), color: "#F59E0B", lineWidth: 2 });
            // Color segments: blue → cyan → green → yellow → orange → red
            const s2fSegColors = [
              "#3B82F6", "#2563EB", "#0EA5E9", "#06B6D4",
              "#10B981", "#22C55E", "#84CC16", "#EAB308",
              "#F97316", "#EF4444",
            ];
            for (let s = 0; s < 10; s++) {
              if (json[`s2fColor${s}`] && json[`s2fColor${s}`].length > 1) {
                newOverlays.push({ data: toChart(json[`s2fColor${s}`]), color: s2fSegColors[s], lineWidth: 3 });
              }
            }
          }

          // Power law corridor
          if (json.powerlawMiddle) {
            newOverlays.push({ data: toChart(json.powerlawMiddle), color: "#A78BFA", lineWidth: 2 });
            newOverlays.push({ data: toChart(json.powerlawUpper), color: "#EF4444", lineWidth: 1 });
            newOverlays.push({ data: toChart(json.powerlawLower), color: "#10B981", lineWidth: 1 });
          }

          if (newOverlays.length > 0) setRawOverlays(newOverlays);
        } catch {
          generateSampleData();
        }
      } else {
        generateSampleData();
      }

      // Fear & Greed: fetch secondary data from separate API
      if (dualConfig && dualConfig.secondaryApi) {
        try {
          const secRes = await fetch(dualConfig.secondaryApi);
          const secJson = await secRes.json();
          if (secJson.data && Array.isArray(secJson.data)) {
            const secData = secJson.data.map((d: { date: string; value: number }) => ({
              time: d.date,
              value: d.value,
            }));
            setRawSecondary(secData);
            setSecondaryLabel(dualConfig.label);
          }
        } catch {
          // secondary fetch failed, just show price
        }
      }

      setLoading(false);
    }

    function generateSampleData() {
      let hash = 0;
      for (let i = 0; i < chartId.length; i++) {
        hash = ((hash << 5) - hash + chartId.charCodeAt(i)) | 0;
      }
      hash = Math.abs(hash);

      const days = 365;
      const data: Array<{ time: string; value: number }> = [];
      let value = 100 + (hash % 900);
      const now = new Date();

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const noise =
          Math.sin(i * 0.05 + hash) * 10 +
          Math.sin(i * 0.02 + hash * 2) * 20 +
          (Math.random() - 0.5) * 5;
        value = Math.max(10, value + noise * 0.1);
        data.push({
          time: date.toISOString().split("T")[0],
          value: Math.round(value * 100) / 100,
        });
      }
      setRawData(data);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId]);

  // Filter data by selected period
  const filterByPeriod = (data: Array<{ time: string; value: number }>) => {
    if (data.length === 0) return [];
    const periodDays: Record<string, number> = {
      "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "2Y": 730, "All": Infinity,
    };
    const days = periodDays[period] ?? 365;
    if (days === Infinity) return data;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.filter((d) => d.time >= cutoffStr);
  };

  const chartData = useMemo(() => filterByPeriod(rawData), [rawData, period]);
  const secondaryData = useMemo(() => filterByPeriod(rawSecondary), [rawSecondary, period]);
  const overlayData = useMemo(
    () => rawOverlays.map((o) => ({ ...o, data: filterByPeriod(o.data) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawOverlays, period]
  );

  // Statistics from data
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const values = chartData.map((d) => d.value);
    const current = values[values.length - 1];
    const first = values[0];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = ((current - first) / first) * 100;

    return {
      current,
      high,
      low,
      change,
      startDate: chartData[0].time,
      endDate: chartData[chartData.length - 1].time,
    };
  }, [chartData]);

  // Insight config for this chart (if available)
  const insightConfig = CHART_INSIGHTS[chartId] || null;

  // Related charts
  const relatedCharts = chart
    ? CHART_CATALOG.filter(
        (c) =>
          c.section === chart.section &&
          c.category === chart.category &&
          c.id !== chart.id
      ).slice(0, 4)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{chartTitle}</h1>
            {chart && (
              <p className="text-sm text-muted-foreground">
                {chart.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorited(!isFavorited)}
            className="rounded-md border border-border p-2 hover:bg-muted transition-colors"
          >
            <Star
              className={`h-4 w-4 ${isFavorited ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-border" />
        <select
          value={scaleType}
          onChange={(e) =>
            setScaleType(e.target.value as "linear" | "log")
          }
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="linear">Linear</option>
          <option value="log">Logarithmic</option>
        </select>
        {chart && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: chart.color }}
            />
            <span className="text-xs text-muted-foreground">
              {chart.section.toUpperCase()} · {chart.category}
            </span>
          </div>
        )}
      </div>

      {/* Chart(s) */}
      {loading ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="h-[480px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      ) : secondaryData.length > 0 ? (
        /* ── Dual Chart: Price (top) + Indicator (bottom) ── */
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Bitcoin Price (USD)</span>
            </div>
            <LightweightChartWrapper
              data={chartData}
              type="area"
              color="#2962FF"
              height={280}
              showGrid
              logarithmic={scaleType === "log"}
              priceLines={CHART_BAND_LINES[chartId]?.primary}
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dualConfig?.color || chartColor }} />
              <span className="text-xs font-medium text-muted-foreground">{secondaryLabel}</span>
              {secondaryData.length > 0 && (
                <span className="ml-auto text-sm font-bold" style={{ color: dualConfig?.color || chartColor }}>
                  {secondaryData[secondaryData.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <LightweightChartWrapper
              data={secondaryData}
              type="line"
              color={dualConfig?.color || chartColor}
              height={220}
              showGrid
              priceLines={CHART_BAND_LINES[chartId]?.secondary}
            />
            {/* Scale reference for Fear & Greed */}
            {chartId === "fear-greed-index" && (
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span className="text-red-500 font-medium">0 = Extreme Fear</span>
                <span className="text-amber-500 font-medium">50 = Neutral</span>
                <span className="text-emerald-500 font-medium">100 = Extreme Greed</span>
              </div>
            )}
            {/* Scale reference for MVRV */}
            {chartId === "mvrv-zscore" && (
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span className="text-emerald-500 font-medium">{'< 0 = 저평가 (매수 기회)'}</span>
                <span className="text-blue-500 font-medium">0~2 = 적정 가치</span>
                <span className="text-red-500 font-medium">{'> 3 = 고평가 (과열 경고)'}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Single Chart ── */
        <div className="rounded-lg border border-border bg-card p-4">
          <LightweightChartWrapper
            data={chartData}
            type={chart?.chartType === "area" ? "area" : "line"}
            color={chartColor}
            height={480}
            showGrid
            logarithmic={scaleType === "log"}
            priceLines={CHART_BAND_LINES[chartId]?.primary}
            overlays={overlayData.length > 0 ? overlayData : undefined}
          />
          {/* Legend for overlay charts */}
          {chartId === "rainbow-chart" && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
              {[
                { color: "#1a237e", label: "불타는 세일" },
                { color: "#1565c0", label: "매수!" },
                { color: "#0097a7", label: "축적" },
                { color: "#00897b", label: "아직 저렴" },
                { color: "#43a047", label: "HODL!" },
                { color: "#fdd835", label: "버블?" },
                { color: "#ff8f00", label: "FOMO" },
                { color: "#e65100", label: "매도!" },
                { color: "#c62828", label: "최대 버블" },
              ].map((b) => (
                <span key={b.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.label}
                </span>
              ))}
            </div>
          )}
          {chartId === "btc-log-regression" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-400" />상한 (+2σ)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-blue-400" />중앙 (회귀선)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-400" />하한 (-2σ)</span>
            </div>
          )}
          {chartId === "stock-to-flow" && (
            <div className="mt-2 space-y-1.5 px-1">
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />S2F 모델 가격</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="mr-1">BTC 가격 (반감기 진행도):</span>
                {[
                  { color: "#3B82F6", label: "반감기 직후" },
                  { color: "#0EA5E9", label: "" },
                  { color: "#10B981", label: "중간" },
                  { color: "#84CC16", label: "" },
                  { color: "#EAB308", label: "" },
                  { color: "#F97316", label: "" },
                  { color: "#EF4444", label: "반감기 직전" },
                ].map((c) => (
                  <span key={c.color} className="flex items-center gap-0.5">
                    <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: c.color }} />
                    {c.label && <span>{c.label}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {chartId === "btc-bollinger" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#2962FF" }} />BTC 가격</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-500" />상단 밴드 (+2σ)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-blue-400" />중간 밴드 (SMA 20)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />하단 밴드 (-2σ)</span>
            </div>
          )}
          {chartId === "power-law-corridor" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-500" />상한 회랑</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-violet-400" />추세선</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />하한 회랑</span>
            </div>
          )}
          {chartId === "btc-vs-gold-roi" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F7931A" }} />Bitcoin (BTC)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />Gold (XAU)</span>
            </div>
          )}
          {chartId === "btc-vs-sp500-roi" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#627EEA" }} />Bitcoin (BTC)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#EF4444" }} />S&P 500</span>
            </div>
          )}
          {["200-week-ma", "pi-cycle-top", "golden-ratio-multiplier", "2y-ma-multiplier"].includes(chartId) && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: chart?.color || "#2962FF" }} />BTC 가격</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />50일 이동평균 (SMA 50)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#EF4444" }} />200일 이동평균 (SMA 200)</span>
            </div>
          )}
        </div>
      )}

      {/* Current Value Insight (for charts with insight config) */}
      {insightConfig && stats && (() => {
        const insight = insightConfig.getInsight(stats.current);
        const insightColors = {
          bullish: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
          bearish: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400",
          caution: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
          neutral: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
        };
        return (
          <div className={`rounded-lg border px-4 py-3 ${insightColors[insight.type]}`}>
            <div className="flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-relaxed">{insight.text}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reference Bands (for charts with insight config) */}
      {insightConfig && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">해석 기준</h2>
          </div>
          <div className="space-y-2 mb-5">
            {insightConfig.bands.map((band, idx) => {
              // Fibonacci 차트: 현재 BTC 가격이 해당 밴드에 있는지 판별
              const isFibChart = chartId === "btc-fibonacci";
              const fibLevels = [86934, 73282, 62250, 51218, 35541, 0]; // 0.236, 0.382, 0.5, 0.618, 0.786, below
              const fibHighBounds = [109000, 86934, 73282, 62250, 51218]; // upper bound per band
              const isActive = isFibChart && stats ? (
                idx === 0 ? stats.current >= fibLevels[0] :
                idx === insightConfig.bands.length - 1 ? stats.current < fibLevels[idx - 1] :
                stats.current >= fibLevels[idx] && stats.current < fibHighBounds[idx]
              ) : false;
              return (
              <div key={band.label} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-all ${
                isActive
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/50 bg-muted/20"
              }`}>
                <span className={`h-3 w-8 rounded-sm shrink-0 ${band.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{band.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">({band.range})</span>
                    {isActive && (
                      <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                        ◀ 현재 BTC ${stats!.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{band.description}</p>
                </div>
              </div>
              );
            })}
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-2">지표 설명</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{insightConfig.reference}</p>
          </div>
        </div>
      )}

      {/* Description & Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">About This Chart</h2>
          {(CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId]) ? (
            <div className="space-y-3">
              {(CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId]).description.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {chart?.description ||
                `${chartTitle} 차트입니다. 기간 선택, 스케일 타입(선형/로그) 변경, 즐겨찾기 등의 기능을 사용할 수 있습니다.`}
            </p>
          )}
          {chart && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.section}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.category}
              </span>
              {chart.subcategory && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {chart.subcategory}
                </span>
              )}
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.chartType}
              </span>
            </div>
          )}

          {/* Asset Ranking Table */}
          {(CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId])?.assetRanking && (() => {
            const ranking = (CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId]).assetRanking!;
            return (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-1">{ranking.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{ranking.updated}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-semibold text-xs">#</th>
                        <th className="text-left p-2 font-semibold text-xs">자산</th>
                        <th className="text-left p-2 font-semibold text-xs">심볼</th>
                        <th className="text-right p-2 font-semibold text-xs">시가총액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.assets.map((asset) => (
                        <tr
                          key={asset.symbol}
                          className={`border-b border-border/50 ${asset.highlight ? "bg-primary/5 font-semibold" : "hover:bg-muted/50"}`}
                        >
                          <td className="p-2 text-xs text-muted-foreground">{asset.rank}</td>
                          <td className={`p-2 text-xs ${asset.highlight ? "text-primary" : ""}`}>
                            {asset.name}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">{asset.symbol}</td>
                          <td className={`p-2 text-xs text-right ${asset.highlight ? "text-primary" : ""}`}>
                            {asset.marketCap}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {ranking.footnote && (
                  <p className="mt-3 text-xs text-muted-foreground italic">
                    {ranking.footnote}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Key Statistics</h2>
          {stats ? (
            <dl className="space-y-3">
              {[
                {
                  label: "Current",
                  value: stats.current.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Period High",
                  value: stats.high.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Period Low",
                  value: stats.low.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Change",
                  value: `${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)}%`,
                  color:
                    stats.change >= 0
                      ? "text-positive"
                      : "text-negative",
                },
                { label: "Start Date", value: stats.startDate },
                { label: "End Date", value: stats.endDate },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between"
                >
                  <dt className="text-sm text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd
                    className={`text-sm font-semibold ${"color" in stat ? stat.color : ""}`}
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </div>
      </div>

      {/* Related Charts */}
      {relatedCharts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Related Charts</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedCharts.map((rc) => (
              <Link
                key={rc.id}
                href={`/charts/${rc.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="h-12 mb-2 rounded-md bg-muted/30 overflow-hidden">
                  <div
                    className="h-full w-full opacity-30"
                    style={{ backgroundColor: rc.color }}
                  />
                </div>
                <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {rc.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {rc.category}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
