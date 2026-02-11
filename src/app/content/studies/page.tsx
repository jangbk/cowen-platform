"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Newspaper,
  Search,
  TrendingUp,
  Globe,
  Cpu,
  Layers,
  BarChart3,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Study {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  source: string;
  sourceUrl: string;
  tags: string[];
  category: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSourceIcon(source: string) {
  switch (source) {
    case "CoinDesk":
      return <TrendingUp className="h-10 w-10 text-blue-500/30" />;
    case "CoinTelegraph":
      return <Globe className="h-10 w-10 text-yellow-500/30" />;
    case "Bitcoin Magazine":
      return <Layers className="h-10 w-10 text-orange-500/30" />;
    case "Decrypt":
      return <Cpu className="h-10 w-10 text-purple-500/30" />;
    default:
      return <BarChart3 className="h-10 w-10 text-primary/20" />;
  }
}

function getSourceColor(source: string) {
  switch (source) {
    case "CoinDesk":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "CoinTelegraph":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    case "Bitcoin Magazine":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "Decrypt":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function timeAgo(epochMs: number): string {
  if (!epochMs) return "";
  const diff = Date.now() - epochMs;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cachedAt, setCachedAt] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Fetch helper
  const fetchStudies = useCallback(async (refresh: boolean) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const url = refresh
        ? "/api/content/studies?refresh=true"
        : "/api/content/studies";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStudies(data.articles || []);
      setCachedAt(data.cachedAt || 0);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "기사를 불러올 수 없습니다."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load (use cache)
  useEffect(() => {
    fetchStudies(false);
  }, [fetchStudies]);

  // Derived: all tags & categories
  const allTags = useMemo(
    () => Array.from(new Set(studies.flatMap((s) => s.tags))).sort(),
    [studies]
  );
  const categories = useMemo(
    () => Array.from(new Set(studies.map((s) => s.category))).sort(),
    [studies]
  );

  // Filtering
  const filtered = useMemo(() => {
    let list = [...studies];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.excerpt.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.source.toLowerCase().includes(q)
      );
    }

    if (selectedTag !== "All") {
      list = list.filter((s) => s.tags.includes(selectedTag));
    }

    if (selectedCategory !== "All") {
      list = list.filter((s) => s.category === selectedCategory);
    }

    list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return list;
  }, [studies, search, selectedTag, selectedCategory]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Crypto News</h1>
          </div>
          <p className="text-muted-foreground">
            CoinDesk, CoinTelegraph, Bitcoin Magazine, Decrypt에서 수집한 최신 크립토 뉴스
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cachedAt > 0 && !loading && (
            <span className="text-xs text-muted-foreground">
              {timeAgo(cachedAt)} 업데이트
            </span>
          )}
          <button
            onClick={() => fetchStudies(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "불러오는 중..." : "새로고침"}
          </button>
          <span className="text-sm text-muted-foreground">
            {loading ? "로딩 중..." : `총 ${filtered.length}개`}
          </span>
        </div>
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
              placeholder="기사 검색..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="All">전체 카테고리</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {["All", ...allTags.slice(0, 20)].map((tag) => (
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
        )}
      </div>

      {/* Loading (initial) */}
      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin opacity-50" />
          <p>최신 뉴스를 불러오는 중...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-16 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50 text-red-500" />
          <p>기사를 불러올 수 없습니다.</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>검색 결과가 없습니다.</p>
        </div>
      )}

      {/* Studies Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((study) => (
            <a
              key={study.id}
              href={study.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-md"
            >
              {/* Card Image */}
              <div className="h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center relative">
                {getSourceIcon(study.source)}
                <span
                  className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSourceColor(study.source)}`}
                >
                  {study.source}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>
                    {new Date(study.date).toLocaleDateString("ko-KR")}
                  </span>
                  <span>&middot;</span>
                  <span>{study.category}</span>
                </div>
                <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {study.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 whitespace-pre-line">
                  {study.excerpt}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {study.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                  원문 보기 <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
