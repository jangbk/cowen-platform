"use client";

import { useState } from "react";
import {
  Mail,
  Send,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Globe,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface Newsletter {
  id: string;
  title: string;
  date: string;
  preview: string;
  readTime: string;
  views: number;
  category: string;
  sections: {
    heading: string;
    content: string;
    sentiment?: "bullish" | "bearish" | "neutral";
  }[];
  highlights: string[];
}

const NEWSLETTERS: Newsletter[] = [
  {
    id: "nl-2026-02-03",
    title: "Weekly Digest: Bitcoin Eyes $100K, Macro Tailwinds",
    date: "2026-02-03",
    preview:
      "비트코인이 심리적 저항선 $100K에 접근하면서 매크로 환경이 지지적으로 유지되고 있습니다. CPI가 예상치를 하회했습니다.",
    readTime: "5분",
    views: 3420,
    category: "주간 다이제스트",
    sections: [
      {
        heading: "시장 개요",
        content:
          "비트코인은 지난주 $98,420까지 상승하며 $100K 돌파를 앞두고 있습니다. 이더리움은 소폭 하락(-0.38%)하며 $3,285에 거래 중입니다. 전체 크립토 시가총액은 $3.42T로 주간 1.8% 상승했습니다.\n\n주요 알트코인 중 SOL(+2.15%), AVAX(+4.2%), LINK(+3.8%)가 강세를 보였습니다. DeFi TVL은 $120B를 돌파하며 2022년 이후 최고치를 기록했습니다.",
        sentiment: "bullish",
      },
      {
        heading: "매크로 환경",
        content:
          "1월 CPI는 전월 대비 0.2%, 전년 대비 2.8%로 예상(0.3%, 3.0%)을 하회했습니다. 이는 연준의 금리 인하 기대를 강화하며 위험 자산에 긍정적입니다.\n\nDXY(달러 인덱스)는 104.2로 하락세를 지속하고 있으며, 10년 국채 금리는 4.15%로 안정적입니다. 고용 시장은 여전히 견고하나 점진적 냉각 신호가 나타나고 있습니다.",
        sentiment: "bullish",
      },
      {
        heading: "온체인 분석",
        content:
          "거래소 BTC 잔고가 계속 감소하며 공급 압박이 진행 중입니다. 장기 보유자(LTH) 공급은 소폭 감소했으나 이는 건전한 순환의 일부입니다.\n\nFunding Rate는 0.012%로 중립 수준이며, 과열 신호는 아직 나타나지 않고 있습니다.",
        sentiment: "neutral",
      },
      {
        heading: "다음 주 전망",
        content:
          "$100K 돌파 시 FOMO 매수세가 강화될 수 있으나, 심리적 저항선에서의 차익 실현 압력도 존재합니다. 2월 14일 PPI 데이터와 2월 19일 FOMC 의사록 공개에 주목하세요.",
        sentiment: "neutral",
      },
    ],
    highlights: [
      "BTC $98,420 (+2.41%), $100K 접근",
      "CPI 예상 하회 → 금리 인하 기대 강화",
      "DeFi TVL $120B 돌파 (2022년 이후 최고)",
      "거래소 BTC 잔고 지속 감소",
    ],
  },
  {
    id: "nl-2026-01-27",
    title: "Weekly Digest: ETH Gains Momentum, DeFi Revival",
    date: "2026-01-27",
    preview:
      "이더리움이 DeFi 활성화와 Pectra 업그레이드 기대감으로 주간 12% 상승하며 강세를 보였습니다.",
    readTime: "5분",
    views: 2890,
    category: "주간 다이제스트",
    sections: [
      {
        heading: "시장 개요",
        content:
          "ETH가 주간 12% 상승하며 $3,400대에 진입했습니다. ETH/BTC 비율도 반등하며 알트 시즌 초기 신호가 나타나고 있습니다. BTC는 $96K 부근에서 횡보했으며, SOL은 5% 상승했습니다.",
        sentiment: "bullish",
      },
      {
        heading: "DeFi 생태계",
        content:
          "Aave, Uniswap, Lido 등 주요 DeFi 프로토콜의 거래량과 TVL이 급증했습니다. 특히 리스테이킹(Restaking) 프로토콜의 성장이 두드러지며 EigenLayer TVL이 $15B를 넘었습니다.\n\n이는 이더리움 생태계의 근본적 가치 증가를 의미하며, ETH 가격에 긍정적 영향을 미치고 있습니다.",
        sentiment: "bullish",
      },
      {
        heading: "리스크 요인",
        content:
          "급격한 상승에 따른 단기 과열 가능성에 유의하세요. RSI가 70을 넘어서며 단기적 조정이 있을 수 있습니다. 또한 Pectra 업그레이드 지연 리스크도 고려해야 합니다.",
        sentiment: "bearish",
      },
    ],
    highlights: [
      "ETH 주간 12% 상승, $3,400대 진입",
      "ETH/BTC 비율 반등 → 알트 시즌 초기 신호",
      "EigenLayer TVL $15B 돌파",
      "DeFi TVL 급증, 리스테이킹 프로토콜 성장",
    ],
  },
  {
    id: "nl-2026-01-20",
    title: "Weekly Digest: Institutional Inflows Hit New Records",
    date: "2026-01-20",
    preview:
      "비트코인 ETF 유입이 주간 $2.8B로 역대 최고치를 기록했습니다. MicroStrategy가 또 다른 대규모 매입을 발표했습니다.",
    readTime: "6분",
    views: 4150,
    category: "주간 다이제스트",
    sections: [
      {
        heading: "ETF 자금 유입",
        content:
          "비트코인 현물 ETF 주간 순유입이 $2.8B로 출시 이후 최고치를 경신했습니다. BlackRock IBIT이 $1.5B, Fidelity FBTC가 $800M을 기록하며 선두를 달렸습니다.\n\n누적 AUM은 $85B를 넘어섰으며, 이는 금 ETF의 AUM을 추월하는 역사적 시점에 가까워지고 있습니다.",
        sentiment: "bullish",
      },
      {
        heading: "기관 동향",
        content:
          "MicroStrategy는 추가 15,000 BTC를 매입했으며, 총 보유량이 200,000 BTC를 넘었습니다. 여러 공기업과 헤지펀드도 비트코인 보유를 공시하며 기관 채택이 가속화되고 있습니다.",
        sentiment: "bullish",
      },
    ],
    highlights: [
      "BTC ETF 주간 유입 $2.8B (역대 최고)",
      "BlackRock IBIT $1.5B 유입",
      "MicroStrategy 총 보유량 200K BTC 돌파",
      "ETF 누적 AUM $85B 돌파",
    ],
  },
  {
    id: "nl-2026-01-13",
    title: "Weekly Digest: Fed Signals Patience, Markets Consolidate",
    date: "2026-01-13",
    preview:
      "FOMC 의사록에서 금리 인하에 대한 신중한 입장이 드러나며 위험 자산이 소폭 조정을 받았습니다.",
    readTime: "5분",
    views: 2340,
    category: "주간 다이제스트",
    sections: [
      {
        heading: "시장 동향",
        content: "비트코인은 $90K 지지선을 유지하며 횡보했습니다. 연준의 신중한 발언에 일시적으로 $88K까지 하락했으나 빠르게 회복했습니다. 알트코인 시장은 혼조세를 보였습니다.",
        sentiment: "neutral",
      },
      {
        heading: "연준 전망",
        content: "12월 FOMC 의사록은 2026년 금리 인하 속도에 대해 신중한 접근을 시사했습니다. 시장은 3월 인하 확률을 60%에서 45%로 하향 조정했습니다. 다만, 인하 사이클 자체는 유효하며 시기의 문제입니다.",
        sentiment: "neutral",
      },
    ],
    highlights: [
      "BTC $90K 지지선 유지",
      "FOMC 의사록: 금리 인하에 신중한 입장",
      "3월 인하 확률 45%로 하향",
      "전체 시장 횡보, 추세 결정 대기",
    ],
  },
  {
    id: "nl-2026-01-06",
    title: "2026 Outlook: Key Themes and Price Targets",
    date: "2026-01-06",
    preview:
      "2026년 연간 전망: 크립토 상승장 지속, 규제 환경 변화, 기관 채택 가속, 주요 가격 목표를 제시합니다.",
    readTime: "8분",
    views: 6780,
    category: "특별 보고서",
    sections: [
      {
        heading: "2026년 핵심 테마",
        content: "1. 비트코인 사이클 중후반: 2024 반감기 효과 지속\n2. 기관 채택 가속: ETF, 기업 재무, 국가 전략\n3. 이더리움 업그레이드: Pectra, Danksharding\n4. 규제 명확화: MiCA 시행, 미국 스테이블코인 법안\n5. RWA 토큰화: 채권, 부동산, 주식 토큰화",
        sentiment: "bullish",
      },
      {
        heading: "가격 전망",
        content: "비트코인: 기본 $120K-$150K, 낙관 $180K, 비관 $80K\n이더리움: 기본 $5,000-$7,000, 낙관 $10,000\n솔라나: 기본 $300-$400\n\n이 전망은 매크로 환경 유지, 규제 리스크 제한적이라는 가정 하에 제시됩니다.",
        sentiment: "bullish",
      },
    ],
    highlights: [
      "BTC 기본 전망: $120K-$150K",
      "ETH 기본 전망: $5,000-$7,000",
      "2026 5대 핵심 테마",
      "기관 채택 가속화 예상",
    ],
  },
];

function getSentimentIcon(sentiment?: string) {
  switch (sentiment) {
    case "bullish":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "bearish":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <BarChart3 className="h-4 w-4 text-blue-500" />;
  }
}

function getSentimentColor(sentiment?: string) {
  switch (sentiment) {
    case "bullish":
      return "border-l-green-500";
    case "bearish":
      return "border-l-red-500";
    default:
      return "border-l-blue-500";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Newsletter</h1>
        </div>
        <p className="text-muted-foreground">
          매주 월요일 크립토, 매크로, 투자 인사이트를 이메일로 받아보세요.
        </p>
      </div>

      {/* Subscribe Section */}
      <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-8">
        <div className="max-w-xl mx-auto text-center">
          <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Cowen Insights 구독하기</h2>
          <p className="text-sm text-muted-foreground mb-6">
            주간 시장 분석, 온체인 인사이트, 실행 가능한 투자 아이디어를 매주 받아보세요.
          </p>

          {subscribed ? (
            <div className="flex items-center justify-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">
                구독이 완료되었습니다! 이메일을 확인해주세요.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요..."
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                required
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Send className="h-4 w-4" /> 구독
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" /> 무료 주간 다이제스트
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> 프리미엄: 일일 브리프 + 분석
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "총 구독자", value: "12,450+", icon: <Mail className="h-4 w-4" /> },
          { label: "총 발행 수", value: `${NEWSLETTERS.length}호`, icon: <Calendar className="h-4 w-4" /> },
          { label: "평균 읽기 시간", value: "5분", icon: <Clock className="h-4 w-4" /> },
          { label: "오픈율", value: "68%", icon: <Eye className="h-4 w-4" /> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              {stat.icon}
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-lg font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Newsletter List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">지난 호</h2>
        <div className="space-y-4">
          {NEWSLETTERS.map((nl) => {
            const isExpanded = expandedId === nl.id;
            return (
              <div
                key={nl.id}
                className={`rounded-lg border bg-card overflow-hidden transition-all ${
                  isExpanded ? "border-primary/40" : "border-border"
                }`}
              >
                {/* Header (always visible) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : nl.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(nl.date).toLocaleDateString("ko-KR")}
                      </span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {nl.readTime}
                      </span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {nl.views.toLocaleString()}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5">{nl.category}</span>
                    </div>
                    <h3 className="text-base font-semibold">{nl.title}</h3>
                    {!isExpanded && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {nl.preview}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border p-5 space-y-6">
                    {/* Highlights */}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                      <h4 className="text-sm font-semibold text-primary mb-2">
                        이번 호 하이라이트
                      </h4>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {nl.highlights.map((h, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold mt-0.5">
                              {i + 1}
                            </span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Sections */}
                    {nl.sections.map((section, idx) => (
                      <div
                        key={idx}
                        className={`border-l-4 ${getSentimentColor(section.sentiment)} pl-4`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getSentimentIcon(section.sentiment)}
                          <h4 className="font-semibold">{section.heading}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {section.content}
                        </p>
                      </div>
                    ))}

                    {/* Footer */}
                    <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        발행일: {new Date(nl.date).toLocaleDateString("ko-KR")}
                      </span>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ArrowLeft className="h-3 w-3" /> 접기
                      </button>
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
