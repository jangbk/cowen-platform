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
          <p className="text-sm text-muted-foreground leading-relaxed">
            {chart?.description ||
              `${chartTitle} 차트입니다. 기간 선택, 스케일 타입(선형/로그) 변경, 즐겨찾기 등의 기능을 사용할 수 있습니다.`}
          </p>
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
