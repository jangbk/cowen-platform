"use client";

import { useState, useMemo } from "react";
import {
  Play,
  Clock,
  Lock,
  Crown,
  Search,
  Eye,
  X,
  Calendar,
  ThumbsUp,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface Video {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
  date: string;
  category: string;
  premium: boolean;
  views: number;
  likes: number;
}

const VIDEOS: Video[] = [
  {
    id: "v1",
    youtubeId: "dQw4w9WgXcQ",
    title: "Weekly Market Update: Bitcoin Breaks $98K",
    description:
      "BTC, ETH, 주요 알트코인, 핵심 온체인 메트릭을 다루는 주간 종합 분석입니다. 다음 주 주요 이벤트와 가격 전망을 포함합니다.",
    duration: "42:18",
    date: "2026-02-06",
    category: "주간 리뷰",
    premium: true,
    views: 2400,
    likes: 312,
  },
  {
    id: "v2",
    youtubeId: "dQw4w9WgXcQ",
    title: "On-Chain Deep Dive: Exchange Outflows Accelerate",
    description:
      "최신 거래소 잔고 데이터를 분석하고, BTC 대규모 유출이 단기 가격에 미치는 신호를 해석합니다.",
    duration: "28:45",
    date: "2026-02-04",
    category: "온체인 분석",
    premium: true,
    views: 1800,
    likes: 245,
  },
  {
    id: "v3",
    youtubeId: "dQw4w9WgXcQ",
    title: "Macro Monday: Fed Meeting Preview",
    description:
      "FOMC 회의 전망, 인플레이션 데이터, 위험 자산에 대한 영향을 분석합니다.",
    duration: "35:12",
    date: "2026-02-03",
    category: "매크로",
    premium: false,
    views: 3100,
    likes: 428,
  },
  {
    id: "v4",
    youtubeId: "dQw4w9WgXcQ",
    title: "Portfolio Strategy: Building a Risk-Adjusted Crypto Portfolio",
    description:
      "현대 포트폴리오 이론을 크립토 자산에 적용하여 리스크 조정 포트폴리오를 구축하는 단계별 가이드입니다.",
    duration: "52:30",
    date: "2026-01-30",
    category: "전략",
    premium: true,
    views: 4200,
    likes: 567,
  },
  {
    id: "v5",
    youtubeId: "dQw4w9WgXcQ",
    title: "Technical Analysis Masterclass: Support & Resistance",
    description:
      "여러 기법과 타임프레임 분석을 활용한 핵심 지지/저항 레벨 식별법을 학습합니다.",
    duration: "1:04:22",
    date: "2026-01-27",
    category: "교육",
    premium: true,
    views: 5800,
    likes: 892,
  },
  {
    id: "v6",
    youtubeId: "dQw4w9WgXcQ",
    title: "Altcoin Spotlight: Solana Ecosystem Analysis",
    description:
      "솔라나 생태계, DeFi 프로토콜, SOL 토크노믹스 분석과 투자 논제를 제시합니다.",
    duration: "38:15",
    date: "2026-01-24",
    category: "알트코인",
    premium: false,
    views: 2900,
    likes: 345,
  },
  {
    id: "v7",
    youtubeId: "dQw4w9WgXcQ",
    title: "Bitcoin vs Gold: The Digital Gold Narrative in 2026",
    description:
      "비트코인과 금의 상관관계 변화, 인플레이션 헤지 자산으로서의 역할을 분석합니다.",
    duration: "31:42",
    date: "2026-01-20",
    category: "매크로",
    premium: false,
    views: 3400,
    likes: 456,
  },
  {
    id: "v8",
    youtubeId: "dQw4w9WgXcQ",
    title: "DeFi Yield Farming: Sustainable Strategies",
    description:
      "지속 가능한 DeFi 일드 전략과 위험 관리 방법을 소개합니다. 실제 프로토콜 예시와 함께 설명합니다.",
    duration: "45:08",
    date: "2026-01-17",
    category: "교육",
    premium: true,
    views: 2100,
    likes: 289,
  },
  {
    id: "v9",
    youtubeId: "dQw4w9WgXcQ",
    title: "Ethereum L2 Wars: Arbitrum vs Optimism vs Base",
    description:
      "이더리움 L2 경쟁 구도를 TVL, 트랜잭션 수, 개발자 활동, 토큰 가치 측면에서 비교합니다.",
    duration: "40:55",
    date: "2026-01-13",
    category: "알트코인",
    premium: true,
    views: 3700,
    likes: 501,
  },
];

const CATEGORIES = ["전체", ...Array.from(new Set(VIDEOS.map((v) => v.category)))];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PremiumVideosPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState<"date" | "views" | "likes">("date");
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [showCount, setShowCount] = useState(6);

  const filtered = useMemo(() => {
    let list = [...VIDEOS];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "전체") {
      list = list.filter((v) => v.category === selectedCategory);
    }

    if (sortBy === "date") list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sortBy === "views") list.sort((a, b) => b.views - a.views);
    else list.sort((a, b) => b.likes - a.likes);

    return list;
  }, [search, selectedCategory, sortBy]);

  const visible = filtered.slice(0, showCount);

  return (
    <div className="p-6 space-y-6">
      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold truncate pr-4">
                {playingVideo.title}
              </h3>
              <button
                onClick={() => setPlayingVideo(null)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${playingVideo.youtubeId}?autoplay=1`}
                title={playingVideo.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-white/60">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(playingVideo.date).toLocaleDateString("ko-KR")}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {playingVideo.views.toLocaleString()} views
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" /> {playingVideo.likes.toLocaleString()}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
                {playingVideo.category}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/50">{playingVideo.description}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Play className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Premium Videos</h1>
          </div>
          <p className="text-muted-foreground">
            주간 마켓 업데이트, 온체인 분석, 전략 세션, 교육 마스터클래스
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          총 {filtered.length}개
        </span>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="영상 검색..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date" | "views" | "likes")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="date">최신순</option>
          <option value="views">조회수순</option>
          <option value="likes">좋아요순</option>
        </select>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setShowCount(6); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured Video (first one) */}
      {visible.length > 0 && (
        <div
          className="group relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer"
          onClick={() => setPlayingVideo(visible[0])}
        >
          <div className="flex flex-col md:flex-row">
            {/* Thumbnail */}
            <div className="relative md:w-1/2 h-56 md:h-auto bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-primary/80 group-hover:scale-110 transition-all">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
              <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2.5 py-1 text-xs font-mono text-white">
                {visible[0].duration}
              </span>
              {visible[0].premium && (
                <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-yellow-500/90 px-2.5 py-0.5 text-xs font-bold text-yellow-950">
                  <Crown className="h-3 w-3" /> PREMIUM
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-6 md:w-1/2 flex flex-col justify-center">
              <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium w-fit mb-3">
                최신 영상
              </span>
              <h2 className="text-xl font-bold group-hover:text-primary transition-colors">
                {visible[0].title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {visible[0].description}
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(visible[0].date).toLocaleDateString("ko-KR")}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {visible[0].views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5" /> {visible[0].likes.toLocaleString()}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5">{visible[0].category}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {visible.length > 1 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.slice(1).map((video) => (
            <div
              key={video.id}
              onClick={() => setPlayingVideo(video)}
              className="group rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative h-44 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-primary/80 group-hover:scale-110 transition-all">
                  {video.premium ? (
                    <Lock className="h-5 w-5 text-white/60 group-hover:hidden" />
                  ) : null}
                  <Play
                    className={`h-5 w-5 text-white ${video.premium ? "hidden group-hover:block" : ""}`}
                  />
                </div>
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs font-mono text-white">
                  {video.duration}
                </span>
                {video.premium && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-yellow-500/90 px-2 py-0.5 text-xs font-bold text-yellow-950">
                    <Crown className="h-3 w-3" /> PREMIUM
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{new Date(video.date).toLocaleDateString("ko-KR")}</span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {video.views.toLocaleString()}
                  </span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> {video.likes.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {video.description}
                </p>
                <div className="mt-3">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {video.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {showCount < filtered.length && (
        <div className="text-center">
          <button
            onClick={() => setShowCount((c) => c + 6)}
            className="flex items-center gap-2 mx-auto rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
            더보기 ({filtered.length - showCount}개 남음)
          </button>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Play className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
