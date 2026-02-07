"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  Clock,
  ArrowRight,
  Search,
  Crown,
  Eye,
  TrendingUp,
  BarChart3,
  Globe,
  Cpu,
  Layers,
  Shield,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface Study {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  premium: boolean;
  category: string;
  views: number;
  icon: string;
}

const STUDIES: Study[] = [
  {
    id: "bitcoin-cycle-analysis-2025",
    title: "Bitcoin Cycle Analysis: Where Are We in 2025?",
    excerpt:
      "비트코인 4년 주기를 온체인 메트릭, 프라이스 프랙탈, 매크로 조건을 활용해 분석합니다. 현재 상승장의 위치를 과거 사이클과 비교합니다.",
    date: "2026-02-05",
    readTime: "12분",
    tags: ["Bitcoin", "Cycles", "On-Chain"],
    premium: false,
    category: "Bitcoin",
    views: 4280,
    icon: "btc",
  },
  {
    id: "ethereum-roadmap-impact",
    title: "Ethereum Roadmap: Impact on ETH Valuation",
    excerpt:
      "이더리움의 Pectra 업그레이드와 Verkle Trees가 네트워크 경제, 스테이킹 수익률, 장기 가격 모델에 미치는 영향을 분석합니다.",
    date: "2026-01-28",
    readTime: "15분",
    tags: ["Ethereum", "Fundamentals", "Valuation"],
    premium: true,
    category: "Ethereum",
    views: 3150,
    icon: "eth",
  },
  {
    id: "macro-regime-shift",
    title: "The Great Macro Regime Shift: Rate Cuts & Crypto",
    excerpt:
      "연준의 금리 인하 전환이 위험 자산에 미치는 역사적 영향과 2026년 크립토 포트폴리오 배분 전략을 제시합니다.",
    date: "2026-01-20",
    readTime: "10분",
    tags: ["Macro", "Fed", "Strategy"],
    premium: false,
    category: "Macro",
    views: 5620,
    icon: "macro",
  },
  {
    id: "defi-renaissance",
    title: "DeFi Renaissance: Protocols to Watch",
    excerpt:
      "리얼 이율드, 지속 가능한 토크노믹스, 신흥 카테고리에 초점을 맞춘 DeFi 프로토콜 성장 분석과 투자 테마를 다룹니다.",
    date: "2026-01-14",
    readTime: "18분",
    tags: ["DeFi", "Research", "Altcoins"],
    premium: true,
    category: "DeFi",
    views: 2890,
    icon: "defi",
  },
  {
    id: "bitcoin-mining-profitability",
    title: "Post-Halving Mining Economics",
    excerpt:
      "2024년 반감기 이후 채굴 수익성, 해시레이트 트렌드, 마이너 항복 신호, BTC 공급 역학에 대한 분석입니다.",
    date: "2026-01-08",
    readTime: "8분",
    tags: ["Mining", "Bitcoin", "Supply"],
    premium: false,
    category: "Bitcoin",
    views: 3740,
    icon: "mining",
  },
  {
    id: "global-liquidity-crypto",
    title: "Global Liquidity Cycles and Crypto Correlation",
    excerpt:
      "글로벌 M2 통화 공급, 중앙은행 밸런스시트와 암호화폐 시장 성과 간의 상관관계를 사이클별로 분석합니다.",
    date: "2025-12-28",
    readTime: "14분",
    tags: ["Macro", "Liquidity", "Correlation"],
    premium: true,
    category: "Macro",
    views: 4100,
    icon: "macro",
  },
  {
    id: "solana-ecosystem-deep-dive",
    title: "Solana Ecosystem Deep Dive: Beyond the Hype",
    excerpt:
      "솔라나 생태계의 DeFi TVL, NFT 거래량, 개발자 활동을 분석하고 SOL 투자 관점에서의 강점과 위험을 평가합니다.",
    date: "2025-12-20",
    readTime: "16분",
    tags: ["Solana", "Ecosystem", "Altcoins"],
    premium: false,
    category: "Altcoins",
    views: 6210,
    icon: "alt",
  },
  {
    id: "stablecoin-landscape-2026",
    title: "Stablecoin Landscape: Market Structure Shift",
    excerpt:
      "USDT, USDC, DAI 등 스테이블코인 시장 구조 변화와 규제 영향, 새로운 경쟁자들의 등장을 분석합니다.",
    date: "2025-12-15",
    readTime: "11분",
    tags: ["Stablecoins", "Regulation", "Market"],
    premium: false,
    category: "Research",
    views: 2450,
    icon: "defi",
  },
  {
    id: "btc-etf-flow-analysis",
    title: "Bitcoin ETF Flow Analysis: Institutional Adoption",
    excerpt:
      "비트코인 현물 ETF의 자금 유입/유출 패턴, 기관 투자자 행동, 가격과의 상관관계를 심층 분석합니다.",
    date: "2025-12-08",
    readTime: "13분",
    tags: ["Bitcoin", "ETF", "Institutional"],
    premium: true,
    category: "Bitcoin",
    views: 7840,
    icon: "btc",
  },
  {
    id: "risk-management-framework",
    title: "Crypto Risk Management Framework",
    excerpt:
      "변동성이 큰 크립토 시장에서 포지션 사이징, 손절매, 리스크 리워드 비율을 활용한 체계적 리스크 관리 프레임워크를 제시합니다.",
    date: "2025-12-01",
    readTime: "20분",
    tags: ["Strategy", "Risk", "Education"],
    premium: false,
    category: "Strategy",
    views: 9120,
    icon: "strategy",
  },
  {
    id: "onchain-metrics-guide",
    title: "On-Chain Metrics 완전 가이드",
    excerpt:
      "MVRV, SOPR, NUPL, Reserve Risk 등 핵심 온체인 지표들의 의미, 계산 방법, 활용법을 총정리합니다.",
    date: "2025-11-25",
    readTime: "25분",
    tags: ["On-Chain", "Education", "Bitcoin"],
    premium: true,
    category: "Education",
    views: 11500,
    icon: "onchain",
  },
  {
    id: "tradfi-crypto-convergence",
    title: "TradFi & Crypto Convergence: What's Next",
    excerpt:
      "전통 금융과 크립토의 융합 트렌드, 토큰화 자산, RWA(Real World Assets), 제도권 진입 분석입니다.",
    date: "2025-11-18",
    readTime: "12분",
    tags: ["TradFi", "RWA", "Institutional"],
    premium: false,
    category: "Research",
    views: 3620,
    icon: "tradfi",
  },
];

const ALL_TAGS = Array.from(new Set(STUDIES.flatMap((s) => s.tags))).sort();
const CATEGORIES = Array.from(new Set(STUDIES.map((s) => s.category))).sort();

function getCategoryIcon(icon: string) {
  switch (icon) {
    case "btc":
      return <TrendingUp className="h-10 w-10 text-orange-500/30" />;
    case "eth":
      return <Layers className="h-10 w-10 text-indigo-500/30" />;
    case "macro":
      return <Globe className="h-10 w-10 text-blue-500/30" />;
    case "defi":
      return <Cpu className="h-10 w-10 text-purple-500/30" />;
    case "alt":
      return <BarChart3 className="h-10 w-10 text-green-500/30" />;
    case "strategy":
      return <Shield className="h-10 w-10 text-yellow-500/30" />;
    case "mining":
      return <Cpu className="h-10 w-10 text-gray-400/30" />;
    case "onchain":
      return <BarChart3 className="h-10 w-10 text-cyan-500/30" />;
    case "tradfi":
      return <Globe className="h-10 w-10 text-emerald-500/30" />;
    default:
      return <BookOpen className="h-10 w-10 text-primary/20" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StudiesPage() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [premiumFilter, setPremiumFilter] = useState<"all" | "free" | "premium">("all");
  const [sortBy, setSortBy] = useState<"date" | "views">("date");

  const filtered = useMemo(() => {
    let list = [...STUDIES];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.excerpt.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (selectedTag !== "All") {
      list = list.filter((s) => s.tags.includes(selectedTag));
    }

    // Category filter
    if (selectedCategory !== "All") {
      list = list.filter((s) => s.category === selectedCategory);
    }

    // Premium filter
    if (premiumFilter === "free") list = list.filter((s) => !s.premium);
    if (premiumFilter === "premium") list = list.filter((s) => s.premium);

    // Sort
    if (sortBy === "date") {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      list.sort((a, b) => b.views - a.views);
    }

    return list;
  }, [search, selectedTag, selectedCategory, premiumFilter, sortBy]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Research Studies</h1>
          </div>
          <p className="text-muted-foreground">
            크립토, 온체인, 매크로, 투자 전략에 대한 심층 리서치와 분석
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          총 {filtered.length}개
        </span>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="스터디 검색..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="All">전체 카테고리</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={premiumFilter}
            onChange={(e) => setPremiumFilter(e.target.value as "all" | "free" | "premium")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            <option value="free">무료</option>
            <option value="premium">프리미엄</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "views")}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="date">최신순</option>
            <option value="views">조회수순</option>
          </select>
        </div>

        {/* Tag Pills */}
        <div className="flex flex-wrap gap-2">
          {["All", ...ALL_TAGS].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tag === "All" ? "전체" : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Studies Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((study) => (
            <Link
              key={study.id}
              href={`/content/studies/${study.id}`}
              className="group rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-md"
            >
              {/* Card Image */}
              <div className="h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center relative">
                {getCategoryIcon(study.icon)}
                {study.premium && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-yellow-500/90 px-2.5 py-0.5 text-xs font-bold text-yellow-950">
                    <Crown className="h-3 w-3" /> PREMIUM
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{new Date(study.date).toLocaleDateString("ko-KR")}</span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {study.readTime}
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {study.views.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {study.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {study.excerpt}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {study.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  자세히 보기 <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
