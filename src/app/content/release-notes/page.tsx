"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Tag,
  Sparkles,
  Bug,
  Zap,
  Search,
  ChevronDown,
  ChevronUp,
  Rocket,
  Calendar,
  Hash,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface Change {
  type: "feature" | "improvement" | "fix";
  text: string;
}

interface Release {
  version: string;
  date: string;
  title: string;
  description: string;
  highlights: boolean;
  changes: Change[];
}

const RELEASES: Release[] = [
  {
    version: "2.5.0",
    date: "2026-02-07",
    title: "Content Hub & Newsletter System",
    description: "리서치 스터디, 프리미엄 영상, 뉴스레터 시스템이 대폭 강화되었습니다.",
    highlights: true,
    changes: [
      { type: "feature", text: "리서치 스터디 페이지에 태그 필터링, 검색, 카테고리 분류 추가" },
      { type: "feature", text: "스터디 상세 페이지에 읽기 진행바, 목차, 북마크 기능 추가" },
      { type: "feature", text: "프리미엄 영상 인라인 YouTube 플레이어 및 카테고리 필터" },
      { type: "feature", text: "뉴스레터 아카이브 상세보기 (확장/축소 방식)" },
      { type: "improvement", text: "릴리즈 노트 타입별 필터링 및 검색 기능 추가" },
      { type: "improvement", text: "전체 Content 섹션 한국어 UI 적용" },
      { type: "fix", text: "뉴스레터 구독 폼 이메일 유효성 검사 개선" },
    ],
  },
  {
    version: "2.4.0",
    date: "2026-02-05",
    title: "Metric Analyzer & Workbench Improvements",
    description: "메트릭 분석기의 MA 크로스 감지, 워크벤치 위젯 시스템이 개선되었습니다.",
    highlights: false,
    changes: [
      { type: "feature", text: "Metric Analyzer: MA 크로스 감지 및 Forward Returns 분석" },
      { type: "feature", text: "Workbench: 위젯 추가/제거, localStorage 저장 기능" },
      { type: "improvement", text: "차트 로딩 속도 40% 개선 (lazy loading 적용)" },
      { type: "improvement", text: "DCA 시뮬레이션 Dynamic DCA 전략 추가" },
      { type: "fix", text: "경제 캘린더 시간대 이슈 수정" },
      { type: "fix", text: "모바일 Safari 차트 렌더링 결함 해결" },
    ],
  },
  {
    version: "2.3.0",
    date: "2026-01-22",
    title: "Crypto Treasuries & ETF Tracking",
    description: "기업 비트코인 보유량 추적과 ETF 자금 흐름 모니터링이 추가되었습니다.",
    highlights: false,
    changes: [
      { type: "feature", text: "크립토 Treasuries 페이지: 기업/ETF BTC 보유량 추적" },
      { type: "feature", text: "Bitcoin ETF 트래커: AUM 및 자금 흐름 데이터" },
      { type: "improvement", text: "히트맵 커스텀 타임프레임 및 섹터 필터링 지원" },
      { type: "fix", text: "특정 알트코인 시가총액 계산 오류 수정" },
    ],
  },
  {
    version: "2.2.0",
    date: "2026-01-08",
    title: "Modern Portfolio Theory Tool",
    description: "몬테카를로 시뮬레이션 기반 효율적 프론티어 시각화 도구가 추가되었습니다.",
    highlights: false,
    changes: [
      { type: "feature", text: "MPT 도구: 효율적 프론티어 시각화 (Monte Carlo 50K 시뮬레이션)" },
      { type: "feature", text: "자산 간 상관관계 매트릭스 표시" },
      { type: "improvement", text: "전체 페이지 모바일 반응형 개선" },
      { type: "improvement", text: "다크 모드 대비 개선" },
      { type: "fix", text: "스크리너 음수 퍼센트 정렬 오류 수정" },
    ],
  },
  {
    version: "2.1.0",
    date: "2025-12-18",
    title: "Exit Strategies & Risk Assessment",
    description: "출구 전략 도구와 가중 리스크 평가 시스템이 추가되었습니다.",
    highlights: false,
    changes: [
      { type: "feature", text: "Exit Strategies: 커스텀 래더 설정 및 수익 계산" },
      { type: "feature", text: "Weighted Risk Assessment: 온체인 지표 가중치 커스터마이징" },
      { type: "improvement", text: "차트 사이드바 사용자 설정 기억 기능" },
      { type: "fix", text: "인디케이터 대시보드 데이터 갱신 이슈 수정" },
    ],
  },
  {
    version: "2.0.0",
    date: "2025-12-01",
    title: "Platform 2.0 - Complete Redesign",
    description: "플랫폼 전체가 새로운 디자인과 아키텍처로 재구축되었습니다.",
    highlights: false,
    changes: [
      { type: "feature", text: "완전히 새로운 UI 디자인 (모던 투자 플랫폼 컨셉)" },
      { type: "feature", text: "새로운 네비게이션: 사이드바 + 메가 메뉴" },
      { type: "feature", text: "차트 라이브러리: 100+ 크립토, 매크로, TradFi 차트" },
      { type: "feature", text: "프리미엄 콘텐츠: 리서치 스터디 + 영상 라이브러리" },
      { type: "improvement", text: "Next.js App Router 기반 성능 최적화" },
      { type: "improvement", text: "API 캐싱 및 레이트 리밋 관리 시스템" },
    ],
  },
  {
    version: "1.5.0",
    date: "2025-11-15",
    title: "Trading Bot Dashboard & Backtest",
    description: "트레이딩 봇 성과 대시보드와 백테스트 시뮬레이터가 추가되었습니다.",
    highlights: false,
    changes: [
      { type: "feature", text: "봇 성과 대시보드: 4개 전략 실시간 모니터링" },
      { type: "feature", text: "백테스트 시뮬레이터: 6개 전략 비교 분석" },
      { type: "improvement", text: "대시보드 자동 갱신 주기 개선" },
      { type: "fix", text: "스파크라인 차트 다크 모드 색상 수정" },
    ],
  },
  {
    version: "1.0.0",
    date: "2025-10-01",
    title: "Initial Release",
    description: "Cowen Platform의 첫 번째 공식 릴리즈입니다.",
    highlights: false,
    changes: [
      { type: "feature", text: "대시보드: 자산 테이블, 리스크 게이지, 매크로 차트" },
      { type: "feature", text: "CoinGecko + FRED API 연동" },
      { type: "feature", text: "다크/라이트 모드 지원" },
      { type: "feature", text: "기본 차트 인프라 구축" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ChangeIcon({ type }: { type: string }) {
  switch (type) {
    case "feature":
      return <Sparkles className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />;
    case "improvement":
      return <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />;
    case "fix":
      return <Bug className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />;
    default:
      return null;
  }
}

function ChangeLabel({ type }: { type: string }) {
  const config: Record<string, { color: string; label: string }> = {
    feature: { color: "bg-green-500/10 text-green-500", label: "기능" },
    improvement: { color: "bg-blue-500/10 text-blue-500", label: "개선" },
    fix: { color: "bg-yellow-500/10 text-yellow-500", label: "수정" },
  };
  const { color, label } = config[type] || { color: "bg-muted text-muted-foreground", label: type };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ReleaseNotesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "feature" | "improvement" | "fix">("all");
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set([RELEASES[0].version])
  );

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  };

  const expandAll = () => setExpandedVersions(new Set(filtered.map((r) => r.version)));
  const collapseAll = () => setExpandedVersions(new Set());

  const filtered = useMemo(() => {
    let list = [...RELEASES];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.version.includes(q) ||
          r.changes.some((c) => c.text.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== "all") {
      list = list
        .map((r) => ({
          ...r,
          changes: r.changes.filter((c) => c.type === typeFilter),
        }))
        .filter((r) => r.changes.length > 0);
    }

    return list;
  }, [search, typeFilter]);

  // Stats
  const totalFeatures = RELEASES.reduce(
    (sum, r) => sum + r.changes.filter((c) => c.type === "feature").length,
    0
  );
  const totalImprovements = RELEASES.reduce(
    (sum, r) => sum + r.changes.filter((c) => c.type === "improvement").length,
    0
  );
  const totalFixes = RELEASES.reduce(
    (sum, r) => sum + r.changes.filter((c) => c.type === "fix").length,
    0
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">릴리즈 노트</h1>
        </div>
        <p className="text-muted-foreground">
          플랫폼 업데이트, 새 기능, 개선 사항, 버그 수정 내역
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Rocket className="h-3.5 w-3.5" />
            <span className="text-xs">릴리즈</span>
          </div>
          <p className="text-lg font-bold">{RELEASES.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-xs">기능</span>
          </div>
          <p className="text-lg font-bold text-green-500">{totalFeatures}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-xs">개선</span>
          </div>
          <p className="text-lg font-bold text-blue-500">{totalImprovements}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
            <Bug className="h-3.5 w-3.5" />
            <span className="text-xs">수정</span>
          </div>
          <p className="text-lg font-bold text-yellow-500">{totalFixes}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="버전 또는 기능 검색..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "feature", "improvement", "fix"] as const).map((t) => {
            const labels = { all: "전체", feature: "기능", improvement: "개선", fix: "수정" };
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            모두 펼치기
          </button>
          <span className="text-muted-foreground">/</span>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            모두 접기
          </button>
        </div>
      </div>

      {/* Releases */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((release) => {
            const isExpanded = expandedVersions.has(release.version);
            return (
              <div
                key={release.version}
                className={`rounded-lg border bg-card overflow-hidden transition-all ${
                  release.highlights
                    ? "border-primary/40 ring-1 ring-primary/10"
                    : "border-border"
                }`}
              >
                {/* Release Header */}
                <button
                  onClick={() => toggleVersion(release.version)}
                  className="w-full flex items-center gap-3 p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        <Hash className="h-3 w-3" /> v{release.version}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(release.date).toLocaleDateString("ko-KR")}
                      </span>
                      {release.highlights && (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500">
                          최신
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({release.changes.length}개 변경)
                      </span>
                    </div>
                    <h2 className="text-base font-semibold">{release.title}</h2>
                    {!isExpanded && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {release.description}
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

                {/* Expanded Changes */}
                {isExpanded && (
                  <div className="border-t border-border px-5 pb-5 pt-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      {release.description}
                    </p>
                    <div className="space-y-2.5">
                      {release.changes.map((change, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <ChangeIcon type={change.type} />
                          <div className="flex-1 flex flex-wrap items-center gap-2">
                            <ChangeLabel type={change.type} />
                            <span className="text-sm">{change.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline visual */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        첫 릴리즈: v1.0.0 (2025년 10월) &rarr; 최신: v{RELEASES[0].version} (
        {new Date(RELEASES[0].date).toLocaleDateString("ko-KR")})
      </div>
    </div>
  );
}
