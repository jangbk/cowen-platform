"use client";

import { useState, useEffect, useMemo } from "react";
import { Gauge, Info, TrendingUp, TrendingDown, Minus, Loader2, BarChart3, Shield, Lightbulb, AlertTriangle } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Indicator {
  name: string;
  value: number;
  displayValue: string;
  label: string;
  risk: number; // 0-1 (0=low risk, 1=high risk)
  status: "bullish" | "bearish" | "neutral" | "caution";
  description: string;
  category: "price" | "onchain" | "social";
  source: string;
  freshness: "realtime" | "near-realtime" | "daily";
  // realtime: Binance 실시간 (1h 이내)
  // near-realtime: CoinGecko 가격 기반 계산 (~1분 캐시)
  // daily: 1일 1회 업데이트 (CoinMetrics, Blockchain.com, Alternative.me)
}

const freshnessConfig = {
  realtime: { label: "실시간", color: "text-green-500 bg-green-500/10" },
  "near-realtime": { label: "준실시간", color: "text-blue-500 bg-blue-500/10" },
  daily: { label: "일간", color: "text-yellow-600 bg-yellow-500/10" },
};

// ---------------------------------------------------------------------------
// Risk → label/status helpers
// ---------------------------------------------------------------------------
function riskToStatus(risk: number): Indicator["status"] {
  if (risk <= 0.25) return "bullish";
  if (risk <= 0.5) return "neutral";
  if (risk <= 0.75) return "caution";
  return "bearish";
}

function fearGreedLabel(v: number): string {
  if (v <= 20) return "Extreme Fear";
  if (v <= 40) return "Fear";
  if (v <= 60) return "Neutral";
  if (v <= 80) return "Greed";
  return "Extreme Greed";
}

function rsiLabel(v: number): string {
  if (v <= 20) return "Extreme Oversold";
  if (v <= 30) return "Oversold";
  if (v <= 50) return "Weak";
  if (v <= 70) return "Neutral-Strong";
  if (v <= 80) return "Overbought";
  return "Extreme Overbought";
}

function mvrvLabel(v: number): string {
  if (v < 0.8) return "Deep Undervalued";
  if (v < 1.0) return "Undervalued";
  if (v < 2.0) return "Fair Value";
  if (v < 3.5) return "Overvalued";
  return "Extreme Overvalued";
}

function puellLabel(v: number): string {
  if (v < 0.5) return "Miner Capitulation";
  if (v < 0.8) return "Undervalued";
  if (v < 1.2) return "Fair Value";
  if (v < 2.0) return "Profitable";
  return "Overheated";
}

const statusColor = {
  bullish: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  bearish: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  neutral: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  caution: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" },
};

// ---------------------------------------------------------------------------
// Dynamic Market Analysis Generator
// ---------------------------------------------------------------------------
function generateMarketAnalysis(indicators: Indicator[], overallRisk: number, bullish: number, bearish: number) {
  const find = (name: string) => indicators.find((i) => i.name === name);
  const fg = find("Fear & Greed Index");
  const rsi = find("RSI (14D)");
  const mvrv = find("MVRV Ratio");
  const puell = find("Puell Multiple");
  const nvt = find("NVT Signal");
  const macd = find("MACD Signal");
  const funding = find("Funding Rate");
  const ls = find("Long/Short Ratio");
  const oi = find("Open Interest");
  const vol = find("30D Volatility");
  const addr = find("Active Addresses");
  const sma = find("200W MA Heatmap");

  // --- 1. Market Sentiment ---
  let sentimentLevel: "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
  let sentimentEmoji: string;
  if (overallRisk <= 0.2) { sentimentLevel = "extreme-fear"; sentimentEmoji = "🔴"; }
  else if (overallRisk <= 0.35) { sentimentLevel = "fear"; sentimentEmoji = "🟠"; }
  else if (overallRisk <= 0.6) { sentimentLevel = "neutral"; sentimentEmoji = "🟡"; }
  else if (overallRisk <= 0.8) { sentimentLevel = "greed"; sentimentEmoji = "🟢"; }
  else { sentimentLevel = "extreme-greed"; sentimentEmoji = "🔵"; }

  const sentimentTitle: Record<string, string> = {
    "extreme-fear": "극도의 공포 — 역사적 매수 기회 구간",
    "fear": "공포 우세 — 시장 침체, 신중한 접근 필요",
    "neutral": "중립 — 방향성 탐색 구간",
    "greed": "탐욕 우세 — 과열 주의, 리스크 관리 강화",
    "extreme-greed": "극도의 탐욕 — 사이클 고점 경고",
  };

  // --- 2. Build Sentiment Paragraphs ---
  const sentimentParts: string[] = [];

  // Fear & Greed + RSI
  if (fg && rsi) {
    const fgV = fg.value;
    const rsiV = rsi.value;
    if (fgV <= 20 && rsiV <= 30) {
      sentimentParts.push(`Fear & Greed 지수가 ${fgV}(${fg.label})이고, RSI가 ${rsiV.toFixed(1)}로 과매도 구간입니다. 시장 심리와 기술적 지표 모두 극도의 약세를 나타내고 있으며, 역사적으로 이 수준은 중장기 매수 기회와 일치했습니다.`);
    } else if (fgV <= 40) {
      sentimentParts.push(`Fear & Greed 지수 ${fgV}(${fg.label}), RSI ${rsiV.toFixed(1)}로 시장은 공포 구간에 있습니다. 투자자 심리가 위축되어 있으나, 패닉 셀링이 동반되지 않는 한 점진적 회복 가능성이 존재합니다.`);
    } else if (fgV >= 75) {
      sentimentParts.push(`Fear & Greed 지수 ${fgV}(${fg.label}), RSI ${rsiV.toFixed(1)}로 시장이 과열 상태입니다. 탐욕이 지배하는 시장에서는 갑작스러운 조정 가능성이 높으므로 포지션 축소를 고려해야 합니다.`);
    } else {
      sentimentParts.push(`Fear & Greed 지수 ${fgV}(${fg.label}), RSI ${rsiV.toFixed(1)}로 시장은 중립 구간입니다.`);
    }
  }

  // MVRV + Puell (On-Chain)
  if (mvrv && puell) {
    const mvrvV = mvrv.value;
    const puellV = puell.value;
    if (mvrvV < 1.0 && puellV < 0.8) {
      sentimentParts.push(`온체인 지표가 강한 저평가 신호를 보이고 있습니다. MVRV ${mvrvV.toFixed(3)}(시장가치 < 실현가치)은 장기 보유자들이 평균적으로 손실 상태임을 의미하며, Puell Multiple ${puellV.toFixed(3)}은 채굴자 수익이 역사적 평균 대비 낮아 항복 가능성을 시사합니다.`);
    } else if (mvrvV > 3.0 && puellV > 2.0) {
      sentimentParts.push(`온체인 지표가 과열 신호를 나타냅니다. MVRV ${mvrvV.toFixed(3)}은 미실현 이익이 축적되어 대규모 매도 압력이 발생할 수 있으며, Puell Multiple ${puellV.toFixed(3)}은 채굴자 수익이 과도하게 높은 상태입니다.`);
    } else {
      sentimentParts.push(`온체인 지표: MVRV ${mvrvV.toFixed(3)}(${mvrv.label}), Puell Multiple ${puellV.toFixed(3)}(${puell.label}). ${mvrvV < 1.5 ? "실현가치 대비 시장가치가 낮은 편으로, 밸류에이션 측면에서 매력적인 구간입니다." : "밸류에이션이 적정 수준이나 과열 징후를 주시해야 합니다."}`);
    }
  }

  // Derivatives
  if (funding && ls && oi) {
    const fundingPct = funding.value * 100;
    const lsV = ls.value;
    const oiChangeStr = oi.description.match(/([\-+][\d.]+%)/)?.[1] ?? "";
    if (fundingPct < -0.01 && lsV > 1.5) {
      sentimentParts.push(`파생상품 시장: 펀딩율 ${fundingPct.toFixed(4)}%(음수)이지만 롱/숏 비율 ${lsV.toFixed(3)}으로 롱 포지션이 우세합니다. Open Interest ${oi.displayValue}(${oiChangeStr}). 펀딩율 음수는 숏 포지션의 비용 부담을 의미하며, 숏 스퀴즈 가능성을 높입니다.`);
    } else if (fundingPct > 0.05) {
      sentimentParts.push(`파생상품 시장: 펀딩율 ${fundingPct.toFixed(4)}%(양수)로 롱이 프리미엄을 지불 중입니다. 과열된 롱 포지션은 청산 캐스케이드 리스크를 높입니다.`);
    } else {
      sentimentParts.push(`파생상품 시장: 펀딩율 ${fundingPct.toFixed(4)}%, 롱/숏 비율 ${lsV.toFixed(3)}, OI ${oi.displayValue}(${oiChangeStr}). ${Math.abs(fundingPct) < 0.01 ? "파생상품 시장은 비교적 균형 잡힌 상태입니다." : "방향성 편향이 존재하나 극단적 수준은 아닙니다."}`);
    }
  }

  // --- 3. Investment Guide ---
  const guide: { title: string; content: string; color: string }[] = [];

  if (overallRisk <= 0.3) {
    guide.push({
      title: "단기 전략 (1~4주)",
      content: `종합 리스크 ${(overallRisk * 100).toFixed(0)}%로 저위험 구간입니다. ${rsi && rsi.value <= 30 ? "RSI 과매도 구간에서의 기술적 반등이 기대됩니다. " : ""}카운터 트렌드 랠리 가능성이 있으나, 하락 추세에서의 반등은 제한적일 수 있습니다. 소규모 분할 매수를 고려할 수 있습니다.`,
      color: "green",
    });
    guide.push({
      title: "중기 전략 (1~6개월)",
      content: `${mvrv && mvrv.value < 1.0 ? `MVRV ${mvrv.value.toFixed(3)}으로 역사적 저평가 구간입니다. ` : ""}${puell && puell.value < 0.8 ? `Puell Multiple ${puell.value.toFixed(3)}으로 채굴자 항복 구간에 근접합니다. ` : ""}이 수준의 온체인 지표는 과거 사이클에서 중장기 바닥과 일치했습니다. DCA(정기 매수) 전략으로 평균 매입가를 낮추는 것이 유효합니다.`,
      color: "green",
    });
    guide.push({
      title: "리스크 관리",
      content: `${vol ? `변동성 ${vol.displayValue}(${vol.label})으로 ${vol.value > 60 ? "급격한 가격 변동이 예상됩니다. 손절 라인 설정 필수." : "비교적 안정적인 변동성을 보이고 있습니다."}` : ""} 포트폴리오의 ${overallRisk < 0.2 ? "20~30%" : "10~20%"}를 암호화폐에 배분하되, 나머지는 현금 또는 안전자산으로 유지하세요.`,
      color: "yellow",
    });
  } else if (overallRisk <= 0.6) {
    guide.push({
      title: "단기 전략 (1~4주)",
      content: `종합 리스크 ${(overallRisk * 100).toFixed(0)}%로 중립 구간입니다. 명확한 방향성이 부재하므로 관망 또는 소규모 포지션 유지가 적절합니다. ${macd ? `MACD ${macd.displayValue}(${macd.label}) — ${macd.value > 0 ? "상승 모멘텀이 유지되고 있으나 추세 전환 가능성을 주시하세요." : "하락 모멘텀이지만 반전 시그널을 관찰하세요."}` : ""}`,
      color: "blue",
    });
    guide.push({
      title: "중기 전략 (1~6개월)",
      content: `시장 방향성을 확인한 후 포지션을 조정하세요. ${sma ? `200일 이동평균 대비 가격이 ${sma.label} 상태로, ${sma.risk < 0.3 ? "SMA 아래에서 회복 시 강력한 매수 신호가 됩니다." : sma.risk > 0.7 ? "SMA 위에서의 하락 이탈 시 매도 신호입니다." : "추세 확인이 필요합니다."}` : ""}`,
      color: "blue",
    });
    guide.push({
      title: "리스크 관리",
      content: "포트폴리오 리밸런싱을 검토하세요. 이익 실현과 손절 라인을 사전에 설정하고, 레버리지 사용을 최소화하세요.",
      color: "yellow",
    });
  } else {
    guide.push({
      title: "단기 전략 (1~4주)",
      content: `종합 리스크 ${(overallRisk * 100).toFixed(0)}%로 고위험 구간입니다. ${fg && fg.value >= 75 ? "극도의 탐욕 상태에서는 이익 실현을 우선시하세요. " : ""}신규 매수보다는 기존 포지션의 단계적 익절을 권장합니다.`,
      color: "red",
    });
    guide.push({
      title: "중기 전략 (1~6개월)",
      content: `${mvrv && mvrv.value > 3.0 ? `MVRV ${mvrv.value.toFixed(3)}으로 역사적 고평가 구간입니다. ` : ""}${puell && puell.value > 2.0 ? `Puell Multiple ${puell.value.toFixed(3)}으로 채굴자 수익이 과도합니다. ` : ""}사이클 고점 신호가 축적되고 있으므로, 포지션을 50% 이상 축소하고 현금 비중을 높이세요.`,
      color: "red",
    });
    guide.push({
      title: "리스크 관리",
      content: `레버리지를 즉시 해소하고, 스탑로스를 타이트하게 설정하세요. ${oi ? `OI ${oi.displayValue}로 ${oi.risk > 0.7 ? "레버리지가 과도하여 대규모 청산 이벤트 가능성이 높습니다." : "레버리지 수준을 모니터링하세요."}` : ""}`,
      color: "red",
    });
  }

  // --- 4. Key Implications ---
  const implications: string[] = [];

  // Bullish vs Bearish count
  implications.push(`12개 지표 중 ${bullish}개 강세, ${bearish}개 약세 신호로, 시장은 ${bullish > bearish ? "강세 쪽으로 기울어" : bearish > bullish ? "약세 쪽으로 기울어" : "균형 상태에"} 있습니다.`);

  // On-chain insights
  if (mvrv && mvrv.value < 1.0) {
    implications.push(`MVRV < 1.0은 시장 전체가 미실현 손실 상태임을 의미합니다. 과거 사이클에서 이 구간은 6~18개월 내 강한 상승의 출발점이었습니다.`);
  } else if (mvrv && mvrv.value > 3.5) {
    implications.push(`MVRV > 3.5는 역사적으로 사이클 고점에서만 관찰되었습니다. 대규모 이익 실현 매물이 쏟아질 수 있습니다.`);
  }

  if (nvt) {
    if (nvt.value > 120) {
      implications.push(`NVT ${nvt.value.toFixed(1)}로 네트워크 활용도 대비 시가총액이 높습니다. 실제 사용량이 가격을 뒷받침하지 못하고 있어 조정 가능성이 있습니다.`);
    } else if (nvt.value < 50) {
      implications.push(`NVT ${nvt.value.toFixed(1)}로 네트워크 사용량 대비 시가총액이 저평가 상태입니다. 펀더멘털 대비 가격이 매력적입니다.`);
    }
  }

  if (addr) {
    const addrChange = addr.description.match(/([\-+][\d.]+%)/)?.[1] ?? "";
    if (addr.status === "bullish") {
      implications.push(`활성 주소 ${addr.displayValue}(${addrChange})로 네트워크 참여가 증가하고 있습니다. 신규 유입은 강세장의 전조 신호입니다.`);
    } else if (addr.status === "caution" || addr.status === "bearish") {
      implications.push(`활성 주소 ${addr.displayValue}(${addrChange})로 네트워크 활동이 감소 추세입니다. 사용자 이탈은 약세 지속을 시사합니다.`);
    }
  }

  if (funding && ls) {
    const fundingPct = funding.value * 100;
    if (fundingPct < -0.01 && ls.value > 1.3) {
      implications.push(`펀딩율 음수 + 롱 우세 비율은 역설적 상황입니다. 개인 투자자는 롱이지만 기관은 숏 포지션을 취하고 있을 가능성이 높으며, 숏 스퀴즈 또는 롱 청산 양방향 리스크가 존재합니다.`);
    }
  }

  if (vol && vol.risk > 0.6) {
    implications.push(`높은 변동성(${vol.displayValue})은 급격한 가격 움직임이 임박했음을 의미합니다. 방향은 불확실하지만 큰 움직임이 예상됩니다.`);
  }

  return { sentimentLevel, sentimentEmoji, sentimentTitle: sentimentTitle[sentimentLevel], sentimentParts, guide, implications };
}

export default function CryptoIndicatorsPage() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "price" | "onchain" | "social">("all");
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Fetch real-time data from APIs ────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const results: Indicator[] = [];

      // Fetch existing APIs + new onchain-indicators in parallel
      const [fgRes, rsiRes, riskRes, macdRes, onchainRes] = await Promise.allSettled([
        fetch("/api/crypto/fear-greed").then((r) => r.json()),
        fetch("/api/crypto/history?coin=bitcoin&days=365&metric=rsi").then((r) => r.json()),
        fetch("/api/crypto/risk?asset=bitcoin").then((r) => r.json()),
        fetch("/api/crypto/history?coin=bitcoin&days=365&metric=macd").then((r) => r.json()),
        fetch("/api/crypto/onchain-indicators").then((r) => r.json()),
      ]);

      // 1. Fear & Greed Index (alternative.me)
      if (fgRes.status === "fulfilled") {
        const fgVal = fgRes.value.value ?? 50;
        results.push({
          name: "Fear & Greed Index",
          value: fgVal,
          displayValue: String(fgVal),
          label: fearGreedLabel(fgVal),
          risk: fgVal / 100,
          status: fgVal <= 25 ? "bullish" : fgVal <= 50 ? "neutral" : fgVal <= 75 ? "caution" : "bearish",
          description: "시장 심리를 측정하는 복합 지수 (0=극도의 공포, 100=극도의 탐욕). 극도의 공포는 매수 기회, 극도의 탐욕은 매도 시그널.",
          category: "price",
          source: "Alternative.me",
          freshness: "daily",
        });
      }

      // 2. RSI 14D (CoinGecko price → calculated)
      if (rsiRes.status === "fulfilled") {
        const rsiArr = rsiRes.value.indicator ?? [];
        if (rsiArr.length > 0) {
          const rsiVal = rsiArr[rsiArr.length - 1][1];
          results.push({
            name: "RSI (14D)",
            value: rsiVal,
            displayValue: rsiVal.toFixed(1),
            label: rsiLabel(rsiVal),
            risk: rsiVal / 100,
            status: rsiVal <= 30 ? "bullish" : rsiVal <= 50 ? "neutral" : rsiVal <= 70 ? "caution" : "bearish",
            description: "14일 상대강도지수. 30 이하 = 과매도(매수 기회), 70 이상 = 과매수(매도 시그널).",
            category: "price",
            source: "CoinGecko",
            freshness: "near-realtime",
          });
        }
      }

      // 3. 200W MA Heatmap + Volatility (CoinGecko risk)
      if (riskRes.status === "fulfilled" && riskRes.value.priceRisk !== undefined) {
        const riskJson = riskRes.value;
        const smaRisk = riskJson.momentumRisk ?? 0.5;
        results.push({
          name: "200W MA Heatmap",
          value: Math.round(smaRisk * 100),
          displayValue: `${Math.round(smaRisk * 100)}%`,
          label: smaRisk < 0.3 ? "Cold" : smaRisk < 0.6 ? "Warm" : "Hot",
          risk: smaRisk,
          status: riskToStatus(smaRisk),
          description: "200일 이동평균 대비 가격 위치. 낮으면 SMA 아래(저평가), 높으면 SMA 위(과열).",
          category: "price",
          source: "CoinGecko",
          freshness: "near-realtime",
        });

        const volRisk = riskJson.volatilityRisk ?? 0.5;
        results.push({
          name: "30D Volatility",
          value: Math.round(volRisk * 200),
          displayValue: `${Math.round(volRisk * 200)}%`,
          label: volRisk < 0.25 ? "Low" : volRisk < 0.5 ? "Moderate" : volRisk < 0.75 ? "High" : "Extreme",
          risk: volRisk,
          status: riskToStatus(volRisk),
          description: "30일 연환산 변동성. 높은 변동성은 리스크 증가를 의미.",
          category: "price",
          source: "CoinGecko",
          freshness: "near-realtime",
        });
      }

      // 4. MACD Signal (CoinGecko price → calculated)
      if (macdRes.status === "fulfilled") {
        const macdArr = macdRes.value.indicator ?? [];
        if (macdArr.length > 0) {
          const macdVal = macdArr[macdArr.length - 1][1];
          const macdPrev = macdArr.length > 1 ? macdArr[macdArr.length - 2][1] : macdVal;
          const momentum = macdVal > macdPrev ? "Improving" : "Declining";
          const macdRisk = Math.max(0, Math.min(1, (macdVal + 5000) / 10000));
          results.push({
            name: "MACD Signal",
            value: macdVal,
            displayValue: macdVal.toFixed(0),
            label: momentum,
            risk: macdRisk,
            status: macdVal < -2000 ? "bullish" : macdVal < 0 ? "neutral" : macdVal < 2000 ? "caution" : "bearish",
            description: "MACD 히스토그램. 음수에서 양수로 전환 시 매수 신호, 양수에서 음수로 전환 시 매도 신호.",
            category: "price",
            source: "CoinGecko",
            freshness: "near-realtime",
          });
        }
      }

      // ─── On-Chain & Derivatives (real data from new API) ───────
      if (onchainRes.status === "fulfilled") {
        const oc = onchainRes.value;

        // 5. MVRV (CoinMetrics)
        if (oc.mvrv !== undefined) {
          const mvrvVal = oc.mvrv;
          // MVRV risk: 0.5→0.0, 1.0→0.2, 2.0→0.45, 3.5→0.75, 5→1.0
          const mvrvRisk = Math.max(0, Math.min(1, (mvrvVal - 0.5) / 4.5));
          results.push({
            name: "MVRV Ratio",
            value: mvrvVal,
            displayValue: mvrvVal.toFixed(3),
            label: mvrvLabel(mvrvVal),
            risk: mvrvRisk,
            status: mvrvVal < 0.8 ? "bullish" : mvrvVal < 2.0 ? "neutral" : mvrvVal < 3.5 ? "caution" : "bearish",
            description: "시장가치 대 실현가치 비율. 1.0 미만 = 저평가(매수 기회), 3.5+ = 고평가(사이클 고점 근접).",
            category: "onchain",
            source: "CoinMetrics",
            freshness: "daily",
          });
        }

        // 6. Puell Multiple (blockchain.com)
        if (oc.puellMultiple !== undefined) {
          const puellVal = oc.puellMultiple;
          const puellRisk = Math.max(0, Math.min(1, (puellVal - 0.3) / 3.7));
          results.push({
            name: "Puell Multiple",
            value: puellVal,
            displayValue: puellVal.toFixed(3),
            label: puellLabel(puellVal),
            risk: puellRisk,
            status: puellVal < 0.5 ? "bullish" : puellVal < 1.2 ? "neutral" : puellVal < 2 ? "caution" : "bearish",
            description: "일일 채굴 수익 / 365일 평균 채굴 수익. 0.5 미만 = 채굴자 항복(매수 기회), 4+ = 과열.",
            category: "onchain",
            source: "Blockchain.com",
            freshness: "daily",
          });
        }

        // 7. NVT Signal (blockchain.com + CoinMetrics)
        if (oc.nvtSignal !== undefined) {
          const nvtVal = oc.nvtSignal;
          const nvtRisk = Math.max(0, Math.min(1, (nvtVal - 20) / 200));
          results.push({
            name: "NVT Signal",
            value: nvtVal,
            displayValue: nvtVal.toFixed(1),
            label: nvtVal < 45 ? "Undervalued" : nvtVal < 90 ? "Fair Value" : nvtVal < 150 ? "Overvalued" : "Bubble",
            risk: nvtRisk,
            status: nvtVal < 45 ? "bullish" : nvtVal < 90 ? "neutral" : nvtVal < 150 ? "caution" : "bearish",
            description: "시가총액 / 90일 평균 일일 트랜잭션 볼륨. 낮을수록 네트워크 활용도 대비 저평가.",
            category: "onchain",
            source: "Blockchain.com + CoinMetrics",
            freshness: "daily",
          });
        }

        // 8. Active Addresses (blockchain.com)
        if (oc.activeAddresses !== undefined) {
          const addrVal = oc.activeAddresses;
          const addrChange = oc.activeAddressesChange ?? 0;
          // More active addresses = healthier network = lower risk of decline
          // Change-based risk: -20%→high risk, 0%→moderate, +20%→low risk
          const addrRisk = Math.max(0, Math.min(1, 0.5 - addrChange / 40));
          results.push({
            name: "Active Addresses",
            value: addrVal,
            displayValue: `${(addrVal / 1000).toFixed(0)}K`,
            label: addrChange > 5 ? "Growing" : addrChange > -5 ? "Stable" : "Declining",
            risk: addrRisk,
            status: addrChange > 5 ? "bullish" : addrChange > -5 ? "neutral" : addrChange > -15 ? "caution" : "bearish",
            description: `일일 활성 주소 수. 30일 평균 대비 ${addrChange >= 0 ? "+" : ""}${addrChange.toFixed(1)}% 변화. 증가 = 네트워크 성장(강세).`,
            category: "onchain",
            source: "Blockchain.com",
            freshness: "daily",
          });
        }

        // 9. Funding Rate (Binance)
        if (oc.fundingRate !== undefined) {
          const fundingVal = oc.fundingRate;
          const fundingPct = fundingVal * 100;
          const fundingRisk = Math.max(0, Math.min(1, (fundingPct + 0.1) / 0.2));
          results.push({
            name: "Funding Rate",
            value: fundingVal,
            displayValue: `${fundingPct >= 0 ? "+" : ""}${fundingPct.toFixed(4)}%`,
            label: fundingPct > 0.05 ? "Long Dominant" : fundingPct < -0.05 ? "Short Dominant" : "Neutral",
            risk: fundingRisk,
            status: Math.abs(fundingPct) < 0.02 ? "neutral" : fundingPct > 0.05 ? "caution" : fundingPct < -0.05 ? "bullish" : "neutral",
            description: "Binance BTCUSDT 무기한 선물 펀딩율. 양수=롱 우세(과열 주의), 음수=숏 우세(반등 가능).",
            category: "social",
            source: "Binance",
            freshness: "realtime",
          });
        }

        // 10. Long/Short Ratio (Binance)
        if (oc.longShortRatio !== undefined) {
          const lsVal = oc.longShortRatio;
          const longPct = oc.longAccount ? (oc.longAccount * 100).toFixed(1) : "?";
          const shortPct = oc.shortAccount ? (oc.shortAccount * 100).toFixed(1) : "?";
          const lsRisk = Math.max(0, Math.min(1, (lsVal - 0.5) / 2.0));
          results.push({
            name: "Long/Short Ratio",
            value: lsVal,
            displayValue: lsVal.toFixed(3),
            label: `Long ${longPct}% / Short ${shortPct}%`,
            risk: lsRisk,
            status: lsVal > 2.0 ? "bearish" : lsVal > 1.5 ? "caution" : lsVal < 0.8 ? "bullish" : "neutral",
            description: "Binance 글로벌 롱/숏 계정 비율. 2.0+ = 롱 과밀(하락 주의), 0.7- = 숏 과밀(반등 가능).",
            category: "social",
            source: "Binance",
            freshness: "realtime",
          });
        }

        // 11. Open Interest (Binance)
        if (oc.openInterestValue !== undefined) {
          const oiVal = oc.openInterestValue;
          const oiBtc = oc.openInterest;
          const oiChange = oc.oiChange24h ?? 0;
          // High OI + rising = more leverage = more risk
          const oiRisk = Math.max(0, Math.min(1, 0.5 + oiChange / 20));
          results.push({
            name: "Open Interest",
            value: oiVal,
            displayValue: `$${(oiVal / 1e9).toFixed(2)}B`,
            label: `${oiBtc?.toFixed(0) ?? "?"} BTC (${oiChange >= 0 ? "+" : ""}${oiChange.toFixed(1)}%)`,
            risk: oiRisk,
            status: oiChange > 10 ? "bearish" : oiChange > 3 ? "caution" : oiChange < -10 ? "bullish" : "neutral",
            description: `24시간 OI 변화: ${oiChange >= 0 ? "+" : ""}${oiChange.toFixed(1)}%. OI 급증 = 레버리지 과열(청산 리스크 증가).`,
            category: "social",
            source: "Binance",
            freshness: "realtime",
          });
        }
      }

      setIndicators(results);
      setLoading(false);
    }

    fetchAll();
  }, []);

  const filteredIndicators = useMemo(
    () =>
      selectedCategory === "all"
        ? indicators
        : indicators.filter((i) => i.category === selectedCategory),
    [selectedCategory, indicators]
  );

  const priceIndicators = indicators.filter((i) => i.category === "price");
  const onchainIndicators = indicators.filter((i) => i.category === "onchain");
  const socialIndicators = indicators.filter((i) => i.category === "social");

  const avgRisk = (arr: Indicator[]) =>
    arr.length > 0 ? arr.reduce((sum, i) => sum + i.risk, 0) / arr.length : 0.5;

  const overallRisk =
    avgRisk(priceIndicators) * 0.35 +
    avgRisk(onchainIndicators) * 0.45 +
    avgRisk(socialIndicators) * 0.2;

  const bullish = indicators.filter((i) => i.status === "bullish").length;
  const bearish = indicators.filter((i) => i.status === "bearish").length;
  const neutral = indicators.length - bullish - bearish;

  const analysis = useMemo(
    () => generateMarketAnalysis(indicators, overallRisk, bullish, bearish),
    [indicators, overallRisk, bullish, bearish]
  );

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 mx-auto max-w-[1600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">실시간 지표 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Indicator Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          실시간 온체인 및 시장 지표 — 비트코인 사이클 분석을 위한 리스크 게이지
        </p>
      </div>

      {/* Top Section: Main Gauge + Sub Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            종합 Crypto Risk
          </h2>
          <GaugeChart
            value={overallRisk}
            label="Crypto Risk Indicator"
            size="lg"
            subMetrics={[
              { label: "Price", value: avgRisk(priceIndicators), color: "#3b82f6" },
              { label: "On-Chain", value: avgRisk(onchainIndicators), color: "#8b5cf6" },
              { label: "Derivatives", value: avgRisk(socialIndicators), color: "#f59e0b" },
            ]}
          />
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">Price Risk</h3>
          <GaugeChart value={avgRisk(priceIndicators)} label="가격 기반 지표" size="sm" />
          <p className="mt-2 text-xs text-muted-foreground text-center">{priceIndicators.length}개 지표</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">On-Chain Risk</h3>
          <GaugeChart value={avgRisk(onchainIndicators)} label="온체인 지표" size="sm" />
          <p className="mt-2 text-xs text-muted-foreground text-center">{onchainIndicators.length}개 지표</p>
        </div>
      </div>

      {/* Signal Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-500">{bullish}</p>
              <p className="text-sm text-muted-foreground">Bullish Signals</p>
            </div>
          </div>
          {indicators.filter((i) => i.status === "bullish").length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-green-500/20">
              {indicators.filter((i) => i.status === "bullish").map((i) => (
                <span key={i.name} className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                  {i.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Minus className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-500">{neutral}</p>
              <p className="text-sm text-muted-foreground">Neutral / Caution</p>
            </div>
          </div>
          {indicators.filter((i) => i.status === "neutral" || i.status === "caution").length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-yellow-500/20">
              {indicators.filter((i) => i.status === "neutral" || i.status === "caution").map((i) => (
                <span key={i.name} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  i.status === "caution"
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  {i.name}{i.status === "caution" ? " ⚠" : ""}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{bearish}</p>
              <p className="text-sm text-muted-foreground">Bearish Signals</p>
            </div>
          </div>
          {indicators.filter((i) => i.status === "bearish").length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-red-500/20">
              {indicators.filter((i) => i.status === "bearish").map((i) => (
                <span key={i.name} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                  {i.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Market Sentiment & Analysis ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 시장 분위기 */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">시장 분위기 분석</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className={`rounded-lg p-4 ${
              analysis.sentimentLevel.includes("fear") ? "bg-red-500/5 border border-red-500/20" :
              analysis.sentimentLevel.includes("greed") ? "bg-green-500/5 border border-green-500/20" :
              "bg-blue-500/5 border border-blue-500/20"
            }`}>
              <p className={`text-sm font-bold mb-1 ${
                analysis.sentimentLevel.includes("fear") ? "text-red-500" :
                analysis.sentimentLevel.includes("greed") ? "text-green-500" :
                "text-blue-500"
              }`}>
                {analysis.sentimentEmoji} {analysis.sentimentTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                종합 리스크 {(overallRisk * 100).toFixed(0)}% | 강세 {bullish} · 중립 {neutral} · 약세 {bearish}
              </p>
            </div>
            {analysis.sentimentParts.map((p, i) => (
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
              const borderColor = g.color === "green" ? "border-green-500/30" : g.color === "red" ? "border-red-500/30" : g.color === "blue" ? "border-blue-500/30" : "border-yellow-500/30";
              const bgColor = g.color === "green" ? "bg-green-500/5" : g.color === "red" ? "bg-red-500/5" : g.color === "blue" ? "bg-blue-500/5" : "bg-yellow-500/5";
              const titleColor = g.color === "green" ? "text-green-600" : g.color === "red" ? "text-red-600" : g.color === "blue" ? "text-blue-600" : "text-yellow-600";
              return (
                <div key={i} className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
                  <p className={`text-xs font-bold mb-1 ${titleColor}`}>{g.title}</p>
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

      {/* Category Filter */}
      <div className="flex gap-1">
        {(
          [
            { key: "all", label: "전체" },
            { key: "price", label: "Price" },
            { key: "onchain", label: "On-Chain" },
            { key: "social", label: "Derivatives" },
          ] as const
        ).map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium ${
              selectedCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Indicator Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredIndicators.map((ind) => {
          const colors = statusColor[ind.status];
          return (
            <div
              key={ind.name}
              className={`rounded-lg border bg-card p-4 transition-all hover:shadow-sm ${colors.border}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold leading-tight">{ind.name}</h3>
                  {ind.freshness !== "realtime" && (
                    <span className={`rounded px-1 py-0.5 text-[9px] font-medium leading-none ${freshnessConfig[ind.freshness].color}`}>
                      {freshnessConfig[ind.freshness].label}
                    </span>
                  )}
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                  onClick={() => setShowInfo(showInfo === ind.name ? null : ind.name)}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${ind.risk * 100}%`,
                    background: `linear-gradient(90deg, #10b981, #eab308 50%, #ef4444)`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{ind.displayValue}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                  {ind.label}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">Risk: {(ind.risk * 100).toFixed(0)}%</span>
                <span className={`text-[10px] font-semibold ${colors.text}`}>
                  {ind.status === "bullish" ? "▲ Bullish" : ind.status === "bearish" ? "▼ Bearish" : ind.status === "caution" ? "◆ Caution" : "● Neutral"}
                </span>
              </div>
              {showInfo === ind.name && (
                <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">{ind.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk Summary Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">리스크 요약 테이블</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">지표</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">값</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">리스크</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">신호</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">업데이트</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">소스</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind) => {
                const colors = statusColor[ind.status];
                return (
                  <tr key={ind.name} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{ind.name}</td>
                    <td className="px-4 py-2 text-center font-mono">{ind.displayValue}</td>
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
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {ind.label}
                        </span>
                        <span className={`text-[10px] font-semibold ${colors.text}`}>
                          {ind.status === "bullish" ? "▲ Bullish" : ind.status === "bearish" ? "▼ Bearish" : ind.status === "caution" ? "◆ Caution" : "● Neutral"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${freshnessConfig[ind.freshness].color}`}>
                        {freshnessConfig[ind.freshness].label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{ind.source}</td>
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
