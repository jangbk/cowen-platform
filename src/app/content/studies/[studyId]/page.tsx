"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Share2,
  Bookmark,
  BookmarkCheck,
  Eye,
  Crown,
  ChevronRight,
  List,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Study Content Data
// ---------------------------------------------------------------------------
interface StudyContent {
  id: string;
  title: string;
  date: string;
  readTime: string;
  tags: string[];
  premium: boolean;
  author: string;
  views: number;
  sections: { heading: string; content: string }[];
  keyFindings: string[];
  relatedStudies: { id: string; title: string; date: string }[];
}

const STUDY_DB: Record<string, StudyContent> = {
  "bitcoin-cycle-analysis-2025": {
    id: "bitcoin-cycle-analysis-2025",
    title: "Bitcoin Cycle Analysis: Where Are We in 2025?",
    date: "2026-02-05",
    readTime: "12분",
    tags: ["Bitcoin", "Cycles", "On-Chain"],
    premium: false,
    author: "Cowen Platform Research",
    views: 4280,
    sections: [
      {
        heading: "Executive Summary",
        content:
          "비트코인 시장 사이클의 현재 위치를 온체인 메트릭, 가격 기반 지표, 거시경제 조건을 조합하여 분석합니다. 우리의 분석에 따르면 현재 상승장의 중후반부에 위치하며, 여러 핵심 지표가 사이클 소진 전 추가 상승 여력을 시사합니다.",
      },
      {
        heading: "사이클 비교 분석",
        content:
          "비트코인의 4년 주기는 반감기를 기점으로 형성됩니다. 2012, 2016, 2020년 반감기 이후 각각 12-18개월 내 사이클 고점에 도달했습니다. 2024년 4월 반감기 이후 현재 약 10개월이 경과했으며, 과거 패턴에 비추어 볼 때 사이클 고점까지 2-8개월의 여유가 있을 수 있습니다.\n\n다만, 각 사이클마다 수익률 체감 현상이 관찰됩니다. 2013년 ~5,500% → 2017년 ~1,300% → 2021년 ~700%. 이 패턴이 지속된다면 이번 사이클 고점은 $120K-$180K 범위일 수 있습니다.",
      },
      {
        heading: "온체인 지표 분석",
        content:
          "MVRV Z-Score는 현재 2.8로, 과열 구간(7.0+)까지 상당한 여유가 있습니다. 다만, 각 사이클마다 피크 MVRV가 하락하는 추세를 고려하면 4.5-5.5가 이번 사이클의 경고 구간이 될 수 있습니다.\n\nReserve Risk는 장기 보유자의 확신 대비 가격을 측정하는 지표로, 현재 값은 중립 구간에 위치합니다. NUPL(Net Unrealized Profit/Loss)은 0.58로 \"Belief\" 단계에 있으며, \"Euphoria\"(0.75+) 구간 진입 시 경계가 필요합니다.\n\nRHODL Ratio는 단기 vs 장기 보유자 간의 자금 이동을 추적하며, 현재 상승 추세에 있지만 과거 사이클 고점 대비 절반 수준입니다.",
      },
      {
        heading: "매크로 환경",
        content:
          "연준의 금리 인하 사이클이 시작되었으며, 역사적으로 초기 금리 인하 구간은 위험 자산에 긍정적이었습니다. 글로벌 M2 통화 공급이 재확장 중이며, 이는 2020-2021년 상승장의 주요 동력이었던 유동성 확대와 유사한 패턴입니다.\n\n다만, 고용 시장 약화 신호와 지정학적 리스크가 상존하므로 순전히 낙관적 시나리오만 가정하는 것은 위험합니다.",
      },
      {
        heading: "리스크 평가",
        content:
          "복합 리스크 모델은 현재 62/100 점수를 보이며, \"경계\" 수준입니다. 이는 완전한 투자를 유지하기보다 점진적 차익 실현 전략이 적절한 구간임을 시사합니다.\n\n주요 리스크 요인:\n• 규제 리스크: 각국의 크립토 규제 강화 가능성\n• 거시경제 리스크: 경기 침체 진입 시 상관 자산군 동반 하락\n• 레버리지 리스크: 선물 미결제약정(OI)이 역대 최고치에 근접",
      },
      {
        heading: "결론 및 전략",
        content:
          "현재 비트코인 상승장은 추가 상승 여력이 있으나, 리스크 관리 전략을 즉시 시행해야 합니다. 가중 리스크 모델 기반으로 62/100 점수는 포지션의 60-70%를 유지하고 사전 결정된 가격 수준에서 점진적 차익 실현을 권장합니다.\n\n장기 핵심 포지션은 유지하되, 레버리지 사용을 최소화하고, 매크로 조건 악화 시 추가 축소를 대비하는 것이 바람직합니다.",
      },
    ],
    keyFindings: [
      "온체인 메트릭 기준 현재 상승 사이클의 65-70% 지점에 위치",
      "장기 보유자 행동이 사이클 중반 분배 패턴과 일치",
      "매크로 환경은 금리 인하와 기관 채택 확대로 지지적",
      "리스크 조정 포지셔닝: 피크 배분의 60-70% 유지 권장",
    ],
    relatedStudies: [
      { id: "ethereum-roadmap-impact", title: "Ethereum Roadmap Impact", date: "2026-01-28" },
      { id: "macro-regime-shift", title: "The Great Macro Regime Shift", date: "2026-01-20" },
      { id: "global-liquidity-crypto", title: "Global Liquidity & Crypto", date: "2025-12-28" },
    ],
  },
  "ethereum-roadmap-impact": {
    id: "ethereum-roadmap-impact",
    title: "Ethereum Roadmap: Impact on ETH Valuation",
    date: "2026-01-28",
    readTime: "15분",
    tags: ["Ethereum", "Fundamentals", "Valuation"],
    premium: true,
    author: "Cowen Platform Research",
    views: 3150,
    sections: [
      { heading: "Executive Summary", content: "이더리움의 기술 로드맵(Pectra, Verkle Trees, Danksharding)이 네트워크 경제에 미치는 영향을 분석하고, ETH의 근본적 가치 평가 모델을 제시합니다." },
      { heading: "Pectra 업그레이드", content: "Pectra 업그레이드는 EIP-7702(계정 추상화), EIP-7251(최대 유효 잔고 증가), EIP-7594(PeerDAS)를 포함합니다. 이들은 사용자 경험 개선, 스테이킹 효율화, 데이터 가용성 확장에 기여합니다.\n\n특히 계정 추상화는 일반 사용자의 진입 장벽을 크게 낮출 수 있으며, 이는 트랜잭션 볼륨과 가스비 수익 증가로 이어질 수 있습니다." },
      { heading: "가치 평가 모델", content: "DCF 모델 기반으로 ETH의 적정 가치를 산출합니다. 주요 수익원은 가스비 소각(EIP-1559)과 MEV입니다. 현재 연간 소각량과 성장률을 고려한 기본 시나리오에서 ETH의 적정 가치는 $4,500-$6,000 범위입니다.\n\n낙관적 시나리오(L2 생태계 급성장)에서는 $8,000-$12,000, 비관적 시나리오(규제 리스크)에서는 $2,500-$3,500 범위입니다." },
      { heading: "결론", content: "이더리움의 기술적 발전은 장기적으로 네트워크 가치를 강화하지만, 단기적으로는 L2의 가스비 절감이 L1 수익을 잠식할 수 있습니다. 균형 잡힌 시각에서 ETH는 현재 가격 대비 상승 여력이 있으나, 로드맵 실행 리스크를 고려한 포지션 관리가 필요합니다." },
    ],
    keyFindings: [
      "Pectra 업그레이드로 사용자 경험과 스테이킹 효율 크게 개선 예상",
      "DCF 기본 시나리오 적정 가치: $4,500-$6,000",
      "L2 생태계 성장이 L1 수익에 미치는 이중적 영향에 주목",
      "장기 보유 관점에서 현재 가격은 매력적인 진입점",
    ],
    relatedStudies: [
      { id: "bitcoin-cycle-analysis-2025", title: "Bitcoin Cycle Analysis", date: "2026-02-05" },
      { id: "defi-renaissance", title: "DeFi Renaissance", date: "2026-01-14" },
    ],
  },
};

// Fallback for studies not in the detailed DB
function getFallbackStudy(id: string): StudyContent {
  const title = id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return {
    id,
    title,
    date: "2026-01-01",
    readTime: "10분",
    tags: ["Research"],
    premium: false,
    author: "Cowen Platform Research",
    views: 1000,
    sections: [
      { heading: "Executive Summary", content: `${title}에 대한 심층 분석입니다. 크립토 시장의 핵심 동향과 투자 전략을 다룹니다.` },
      { heading: "분석", content: "이 연구는 다양한 데이터 소스와 온체인 메트릭을 활용하여 현재 시장 상황을 평가합니다. 과거 사이클 비교와 매크로 환경 분석을 통해 투자 인사이트를 도출합니다." },
      { heading: "결론", content: "데이터 기반의 접근 방식으로 시장을 분석하고, 리스크 관리를 최우선으로 한 투자 전략을 제시합니다." },
    ],
    keyFindings: ["데이터 기반 시장 분석", "리스크 관리 중심 전략", "온체인 메트릭 활용"],
    relatedStudies: [
      { id: "bitcoin-cycle-analysis-2025", title: "Bitcoin Cycle Analysis", date: "2026-02-05" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StudyDetailPage() {
  const params = useParams();
  const studyId = typeof params.studyId === "string" ? params.studyId : "";
  const study = STUDY_DB[studyId] || getFallbackStudy(studyId);

  const [bookmarked, setBookmarked] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [showToc, setShowToc] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  // Reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;
      const el = articleRef.current;
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight;
      const visible = window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const progress = Math.min(100, (scrolled / (total - visible)) * 100);
      setReadProgress(Math.max(0, progress));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (idx: number) => {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setShowToc(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: study.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("링크가 클립보드에 복사되었습니다.");
    }
  };

  return (
    <>
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8" ref={articleRef}>
        {/* Back */}
        <Link
          href="/content/studies"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> 스터디 목록으로
        </Link>

        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />{" "}
              {new Date(study.date).toLocaleDateString("ko-KR")}
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {study.readTime}
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {study.views.toLocaleString()}
            </span>
            {study.premium && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <Crown className="h-3.5 w-3.5" /> Premium
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold leading-tight">{study.title}</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            {study.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              CP
            </div>
            <div>
              <p className="text-sm font-medium">{study.author}</p>
              <p className="text-xs text-muted-foreground">Research Team</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setShowToc(!showToc)}
                className="rounded-md border border-border p-2 hover:bg-muted transition-colors"
                title="목차"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="rounded-md border border-border p-2 hover:bg-muted transition-colors"
                title="북마크"
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleShare}
                className="rounded-md border border-border p-2 hover:bg-muted transition-colors"
                title="공유"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Table of Contents (collapsible) */}
        {showToc && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">목차</h3>
              <button onClick={() => setShowToc(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <ol className="space-y-1.5">
              {study.sections.map((section, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => scrollToSection(idx)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                    <span>{section.heading}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Key Findings */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">핵심 발견사항</h3>
          <ul className="space-y-2">
            {study.keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold mt-0.5">
                  {idx + 1}
                </span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Content Sections */}
        <article className="space-y-8">
          {study.sections.map((section, idx) => (
            <section
              key={idx}
              ref={(el) => { sectionRefs.current[idx] = el; }}
            >
              <h2 className="text-xl font-bold mb-4 scroll-mt-20">{section.heading}</h2>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </section>
          ))}
        </article>

        {/* Embedded Chart Placeholder */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="h-48 w-full rounded-md bg-muted/30 flex items-center justify-center">
            <svg viewBox="0 0 500 150" className="w-full max-w-md">
              <path
                d="M10,130 C50,125 80,80 130,90 C180,100 200,50 260,40 C320,30 350,60 400,20 L490,10"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
              />
              <path
                d="M10,130 C50,125 80,80 130,90 C180,100 200,50 260,40 C320,30 350,60 400,20 L490,10 L490,150 L10,150 Z"
                fill="hsl(var(--primary))"
                fillOpacity="0.08"
              />
            </svg>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            사이클 비교 분석 차트
          </p>
        </div>

        {/* Related Studies */}
        <div className="border-t border-border pt-8">
          <h3 className="text-lg font-semibold mb-4">관련 스터디</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {study.relatedStudies.map((related) => (
              <Link
                key={related.id}
                href={`/content/studies/${related.id}`}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
              >
                <p className="text-sm font-medium">{related.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(related.date).toLocaleDateString("ko-KR")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
