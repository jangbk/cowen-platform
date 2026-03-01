"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Youtube,
  Send,
  BookOpen,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,
  Target,
  Shield,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Database,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// ─── Types ───────────────────────────────────────────────────────
interface VideoSummary {
  id: string;
  videoUrl: string;
  videoId: string;
  title: string;
  channel: string;
  date: string;
  thumbnailUrl: string;
  summary: string;
  investmentGuide: string;
  keyPoints: string[];
  tags: string[];
  savedToNotion: boolean;
  notionUrl?: string;
}

// ─── Initial Data (Bitcoin: Dubious Speculation) ────────────────
const INITIAL_SUMMARIES: VideoSummary[] = [
  {
    id: "1",
    videoUrl: "https://youtu.be/eAzoXY1GfIo",
    videoId: "eAzoXY1GfIo",
    title: "Bitcoin: Dubious Speculation",
    channel: "JangBK",
    date: "2026-02-06",
    thumbnailUrl: "https://img.youtube.com/vi/eAzoXY1GfIo/maxresdefault.jpg",
    summary: `비트코인이 고점 대비 약 50% 하락한 현 시점에서, 과거 베어마켓 사이클(2014, 2018, 2019, 2022)과 비교 분석을 진행합니다.

핵심 메시지: "베어마켓은 불과 베어 모두를 바보로 만든다(Bear markets make fools of both bulls and bears)."

비트코인은 2026년 2월 6일 저점을 형성했으며, 이는 2018년에도 정확히 같은 날짜에 저점이 발생한 것과 일치합니다. 과거 사이클 패턴을 보면:
- 2018년: 2월 저점 → 3월 반등(고점) → 4월 재하락 → 여름 최종 저점
- 2022년: 1월 저점 → 반등 → 여름 최종 저점
- 2019년: 52% 하락 후 20% 반등 → 팬데믹까지 횡보
- 2014년: 2월 저점 → 3월 초 낮은 고점(lower high) → 10월 최종 저점

이번 사이클에서도 비트코인이 50% 하락 후 반등하고 있으며, 약 1개월 내 낮은 고점(lower high)이 3월 초에 형성될 가능성이 높습니다. 20% 반등 시 70K~73K 수준에 도달할 수 있습니다.

향후 2~3개월간 높은 변동성이 예상되며, 여름에는 변동성이 크게 감소할 것으로 보입니다. Q4에 변동성이 다시 증가하며 다음 사이클이 시작될 수 있습니다.

또한 과거 매 사이클마다 불장에서 잘못된 사업 결정을 내린 기업들이 베어마켓에서 드러난다고 경고합니다(2022년의 FTX 사례처럼). 현재도 고점에서 레버리지를 과도하게 사용한 비트코인 재무회사(treasury company)들이 잠재적 리스크로 존재합니다.`,
    investmentGuide: `1. 단기 전략 (2~4주)
현재 50% 하락 후 카운터 트렌드 랠리 구간. 과거 패턴에 따르면 며칠~몇 주간 반등 가능하나, 3월 초에 낮은 고점(lower high) 형성 후 재하락 가능성이 높음. 단기 트레이딩은 소규모로, 손실 관리 철저히.

2. 중기 전략 (1~6개월)
- 4~5월 추가 하락 가능성 주시 (2번째 저점)
- 여름(7~8월)에는 변동성 급감 예상 → 관망 또는 분할 매수 구간
- 패닉 셀 금지: 대규모 캐피튤레이션 시 매수 기회로 활용

3. 장기 전략 (6~12개월)
- 최종 바닥: 10월이 가장 유력 (1차 후보), 5월이 2차 후보
- S&P 500이 4월 저점을 하회할 경우 비트코인 추가 하락 유발 가능
- Q4 변동성 증가 시 다음 강세장 시작 신호

4. 리스크 관리
- 올해의 목표: "생존" - 무리한 스윙 트레이딩으로 자산을 잃지 않는 것
- 카운터 트렌드 랠리에 속지 말 것 (2022년 5월의 사례)
- 숨겨진 기업 리스크 주시: 레버리지 과다 사용 비트코인 재무회사들 (원가 100K 이상)
- 포지션 크기를 보수적으로 유지

5. 4년 사이클
- S&P 500도 1958~1982년까지 약 4년 주기 반복
- 사이클은 결국 깨지지만, 확률은 사이클 쪽에 있음
- 사이클이 깨질 때는 아무도 예상하지 못할 때`,
    keyPoints: [
      "베어마켓은 불(bulls)과 베어(bears) 모두를 바보로 만든다",
      "비트코인 50% 하락 후 '결정론적 약세(deterministically bearish)' 관점은 비합리적",
      "2월 저점 → 3월 초 낮은 고점(lower high) 패턴이 2014, 2018, 2022년 반복",
      "20% 반등 시 70K~73K 도달 가능 (2019년 패턴과 유사)",
      "향후 2~3개월 높은 변동성, 여름 저변동성, Q4 변동성 재증가",
      "최종 바닥: 10월(1순위), 5월(2순위)",
      "S&P 500이 하락하면 비트코인 추가 하락 유발 (리스크 커브 상위)",
      "불장에서 잘못된 결정을 내린 미확인 기업들이 올해 베어마켓에서 드러날 것",
      "올해의 투자 목표: '생존' - 자산 보전이 최우선",
      "공포&탐욕 지수 극도 저점 → 과거 패턴상 소규모 반등 후 재하락",
    ],
    tags: [
      "Bitcoin",
      "Bear Market",
      "Cycle Analysis",
      "JangBK",
      "Risk Management",
    ],
    savedToNotion: false,
  },
];

// ─── LocalStorage Key ───────────────────────────────────────────
const STORAGE_KEY = "video-summaries";

function loadSummaries(): VideoSummary[] {
  if (typeof window === "undefined") return INITIAL_SUMMARIES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as VideoSummary[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return INITIAL_SUMMARIES;
}

// ─── Component ──────────────────────────────────────────────────
export default function VideoSummariesPage() {
  const [summaries, setSummaries] = useState<VideoSummary[]>(INITIAL_SUMMARIES);
  const [hydrated, setHydrated] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notionStatus, setNotionStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [notionMessage, setNotionMessage] = useState("");
  const [loadingStep, setLoadingStep] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const { toast } = useToast();

  // Load from localStorage first, then sync from Notion
  useEffect(() => {
    const local = loadSummaries();
    setSummaries(local);
    setExpandedId(local[0]?.id || null);
    setHydrated(true);

    // Notion에서 불러오기 (기기 간 동기화)
    fetch("/api/notion/summaries")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ok" && data.summaries?.length > 0) {
          const notionItems: VideoSummary[] = data.summaries;
          // Notion에 있는 URL 목록
          const notionUrls = new Set(notionItems.map((s) => s.videoUrl));
          // localStorage에만 있는 항목 (Notion에 없는 것)
          const localOnly = local.filter(
            (s) => s.videoUrl && !notionUrls.has(s.videoUrl)
          );
          // Notion 데이터 + localStorage 전용 데이터 병합
          const merged = [...notionItems, ...localOnly];
          setSummaries(merged);
          setExpandedId(merged[0]?.id || null);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        /* Notion 로드 실패 시 localStorage 데이터 유지 */
      });
  }, []);

  // Save to localStorage whenever summaries change
  const saveSummaries = useCallback((data: VideoSummary[]) => {
    setSummaries(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* storage full, ignore */ }
  }, []);

  // 새 요약을 Notion에 자동 저장 (백그라운드)
  const autoSaveToNotion = useCallback(
    async (summary: VideoSummary) => {
      try {
        const res = await fetch("/api/notion/save-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: summary.title,
            videoUrl: summary.videoUrl,
            channel: summary.channel,
            publishedDate: summary.date,
            summary: summary.summary,
            investmentGuide: summary.investmentGuide,
            keyPoints: summary.keyPoints,
            tags: summary.tags,
          }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          // Notion 저장 성공 → 상태 업데이트
          setSummaries((prev) => {
            const updated = prev.map((s) =>
              s.id === summary.id
                ? { ...s, savedToNotion: true, notionUrl: data.notionUrl }
                : s
            );
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch { /* ignore */ }
            return updated;
          });
        }
      } catch {
        // Notion 저장 실패 — localStorage에는 이미 저장됨
      }
    },
    []
  );

  // 모든 로컬 요약을 Notion에 일괄 동기화
  const handleSyncAllToNotion = async () => {
    const unsaved = summaries.filter((s) => !s.savedToNotion);
    if (unsaved.length === 0) {
      toast("success", "모든 요약이 이미 Notion에 저장되어 있습니다.");
      return;
    }

    setSyncingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unsaved.length; i++) {
      const s = unsaved[i];
      setSyncProgress(`${i + 1}/${unsaved.length} 동기화 중: ${s.title.slice(0, 30)}...`);

      try {
        const res = await fetch("/api/notion/save-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: s.title,
            videoUrl: s.videoUrl,
            channel: s.channel,
            publishedDate: s.date,
            summary: s.summary,
            investmentGuide: s.investmentGuide,
            keyPoints: s.keyPoints,
            tags: s.tags,
          }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          successCount++;
          setSummaries((prev) => {
            const updated = prev.map((item) =>
              item.id === s.id
                ? { ...item, savedToNotion: true, notionUrl: data.notionUrl }
                : item
            );
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch { /* ignore */ }
            return updated;
          });
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      // Notion API 속도 제한 방지 (3 req/s)
      if (i < unsaved.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    setSyncingAll(false);
    setSyncProgress("");
    if (failCount === 0) {
      toast("success", `${successCount}개 요약을 Notion에 저장했습니다.`);
    } else {
      toast("error", `${successCount}개 성공, ${failCount}개 실패`);
    }
  };

  const handleAddVideo = async () => {
    if (!youtubeUrl.trim()) return;
    setIsLoading(true);
    setLoadingStep("영상 정보 가져오는 중...");

    try {
      // Step 1: Fetch video metadata + transcript
      const response = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await response.json();

      if (data.status !== "ok") {
        toast("error", `영상 정보를 가져올 수 없습니다: ${data.message}`);
        setIsLoading(false);
        setLoadingStep("");
        return;
      }

      const newId = Date.now().toString();

      // Step 2: If transcript exists, generate AI summary
      if (data.transcript) {
        setLoadingStep("AI가 영상을 분석하고 요약 중... (30초~1분 소요)");

        const summaryResponse = await fetch("/api/youtube/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: data.transcript,
            title: data.title,
            channel: data.channel,
          }),
        });

        const summaryData = await summaryResponse.json();

        if (summaryData.status === "ok") {
          const newSummary: VideoSummary = {
            id: newId,
            videoUrl: youtubeUrl,
            videoId: data.videoId,
            title: data.title,
            channel: data.channel,
            date: new Date().toISOString().split("T")[0],
            thumbnailUrl: data.thumbnailUrl,
            summary: summaryData.summary,
            investmentGuide: summaryData.investmentGuide,
            keyPoints: summaryData.keyPoints,
            tags: summaryData.tags,
            savedToNotion: false,
          };

          saveSummaries([newSummary, ...summaries]);
          setYoutubeUrl("");
          setExpandedId(newId);
          // Notion에 자동 저장 (백그라운드)
          autoSaveToNotion(newSummary);
        } else {
          // AI summarization failed - show transcript as fallback
          const newSummary: VideoSummary = {
            id: newId,
            videoUrl: youtubeUrl,
            videoId: data.videoId,
            title: data.title,
            channel: data.channel,
            date: new Date().toISOString().split("T")[0],
            thumbnailUrl: data.thumbnailUrl,
            summary: `[AI 요약 실패: ${summaryData.message}]\n\n--- 원본 트랜스크립트 ---\n${data.transcript.slice(0, 3000)}${data.transcript.length > 3000 ? "..." : ""}`,
            investmentGuide: "AI 요약이 실패했습니다. ANTHROPIC_API_KEY를 .env.local에 설정해주세요.",
            keyPoints: ["트랜스크립트는 가져왔으나 AI 요약에 실패했습니다"],
            tags: [data.channel],
            savedToNotion: false,
          };

          saveSummaries([newSummary, ...summaries]);
          setYoutubeUrl("");
          setExpandedId(newId);
          autoSaveToNotion(newSummary);
        }
      } else {
        // No transcript available
        const newSummary: VideoSummary = {
          id: newId,
          videoUrl: youtubeUrl,
          videoId: data.videoId,
          title: data.title,
          channel: data.channel,
          date: new Date().toISOString().split("T")[0],
          thumbnailUrl: data.thumbnailUrl,
          summary: data.message || "트랜스크립트를 가져올 수 없습니다. 자막이 없는 영상일 수 있습니다.",
          investmentGuide: "트랜스크립트 없이는 투자 가이드를 생성할 수 없습니다.",
          keyPoints: ["자막이 없는 영상입니다"],
          tags: [data.channel],
          savedToNotion: false,
        };

        saveSummaries([newSummary, ...summaries]);
        setYoutubeUrl("");
        setExpandedId(newId);
        autoSaveToNotion(newSummary);
      }
    } catch {
      toast("error", "영상 정보를 가져오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleSaveToNotion = async (summary: VideoSummary) => {
    setNotionStatus("saving");
    setNotionMessage("");

    try {
      const response = await fetch("/api/notion/save-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: summary.title,
          videoUrl: summary.videoUrl,
          channel: summary.channel,
          publishedDate: summary.date,
          summary: summary.summary,
          investmentGuide: summary.investmentGuide,
          keyPoints: summary.keyPoints,
          tags: summary.tags,
        }),
      });

      const data = await response.json();

      if (data.status === "ok") {
        setNotionStatus("saved");
        setNotionMessage("Notion에 저장되었습니다!");
        saveSummaries(
          summaries.map((s) =>
            s.id === summary.id
              ? { ...s, savedToNotion: true, notionUrl: data.notionUrl }
              : s
          )
        );
      } else {
        setNotionStatus("error");
        setNotionMessage(data.message || "저장 실패");
      }
    } catch {
      setNotionStatus("error");
      setNotionMessage("Notion API 연결에 실패했습니다.");
    }
  };

  const handleCopyToClipboard = async (summary: VideoSummary) => {
    const text = `# ${summary.title}
채널: ${summary.channel}
날짜: ${summary.date}
URL: ${summary.videoUrl}

## 영상 요약
${summary.summary}

## 투자 가이드
${summary.investmentGuide}

## 핵심 포인트
${summary.keyPoints.map((p) => `- ${p}`).join("\n")}

## 태그
${summary.tags.join(", ")}`;

    await navigator.clipboard.writeText(text);
    setCopiedId(summary.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteConfirm = (id: string) => {
    saveSummaries(summaries.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
    toast("success", "요약이 삭제되었습니다.");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">영상 요약 & 투자가이드</h1>
        </div>
        <p className="text-muted-foreground">
          YouTube 투자 영상을 요약하고 투자 가이드를 정리하여 Notion에
          저장합니다.
        </p>
      </div>

      {/* YouTube URL Input */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Youtube className="h-5 w-5 text-red-500" />
          <h2 className="font-semibold">새 영상 추가</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube URL을 입력하세요 (예: https://youtu.be/xxxxx)"
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={(e) => e.key === "Enter" && handleAddVideo()}
          />
          <button
            onClick={handleAddVideo}
            disabled={isLoading || !youtubeUrl.trim()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading ? "분석 중..." : "요약 생성"}
          </button>
        </div>

        {/* Loading step indicator */}
        {isLoading && loadingStep && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            {loadingStep}
          </div>
        )}

        {/* Notion status banner */}
        {notionStatus !== "idle" && (
          <div
            className={`mt-3 rounded-lg px-4 py-2 text-sm ${
              notionStatus === "saving"
                ? "bg-blue-500/10 text-blue-600"
                : notionStatus === "saved"
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
            }`}
          >
            {notionStatus === "saving" && (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Notion에 저장 중...
              </span>
            )}
            {notionStatus === "saved" && notionMessage}
            {notionStatus === "error" && notionMessage}
          </div>
        )}
      </div>

      {/* Summary Count + Sync Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">
          총 {summaries.length}개의 영상 요약
          {hydrated && summaries.filter((s) => !s.savedToNotion).length > 0 && (
            <span className="ml-2 text-orange-500">
              ({summaries.filter((s) => !s.savedToNotion).length}개 미동기화)
            </span>
          )}
        </span>
        {hydrated && summaries.filter((s) => !s.savedToNotion).length > 0 && (
          <button
            onClick={handleSyncAllToNotion}
            disabled={syncingAll}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {syncingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {syncingAll ? "동기화 중..." : "모두 Notion에 동기화"}
          </button>
        )}
      </div>
      {syncingAll && syncProgress && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {syncProgress}
        </div>
      )}

      {/* Summary Cards */}
      <div className="space-y-4">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            {/* Card Header (always visible) */}
            <button
              onClick={() =>
                setExpandedId(expandedId === summary.id ? null : summary.id)
              }
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
            >
              {/* Thumbnail */}
              <div className="hidden sm:block w-32 h-20 rounded-md bg-slate-800 overflow-hidden flex-shrink-0">
                <img
                  src={summary.thumbnailUrl}
                  alt={summary.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{summary.channel}</span>
                  <span>&middot;</span>
                  <span>{summary.date}</span>
                  {summary.savedToNotion && (
                    <>
                      <span>&middot;</span>
                      <span className="text-green-600 flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        Notion 저장됨
                      </span>
                    </>
                  )}
                </div>
                <h3 className="font-semibold truncate">{summary.title}</h3>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {summary.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Expand toggle */}
              <div className="flex-shrink-0">
                {expandedId === summary.id ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedId === summary.id && (
              <div className="border-t border-border p-4 space-y-6">
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSaveToNotion(summary)}
                    disabled={notionStatus === "saving"}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Database className="h-4 w-4" />
                    {summary.savedToNotion
                      ? "Notion에 다시 저장"
                      : "Notion에 저장"}
                  </button>
                  <button
                    onClick={() => handleCopyToClipboard(summary)}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    {copiedId === summary.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedId === summary.id ? "복사됨!" : "클립보드 복사"}
                  </button>
                  <a
                    href={summary.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    원본 영상
                  </a>
                  {summary.notionUrl && (
                    <a
                      href={summary.notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-500/10 transition-colors"
                    >
                      <Database className="h-4 w-4" />
                      Notion에서 보기
                    </a>
                  )}
                  {deletingId === summary.id ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-sm text-muted-foreground">삭제하시겠습니까?</span>
                      <button
                        onClick={() => handleDeleteConfirm(summary.id)}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(summary.id)}
                      className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  )}
                </div>

                {/* Summary Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-lg">영상 요약</h4>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">
                    {summary.summary}
                  </div>
                </div>

                {/* Investment Guide Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-yellow-500" />
                    <h4 className="font-semibold text-lg">투자 가이드</h4>
                  </div>
                  <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4 text-sm leading-relaxed whitespace-pre-line">
                    {summary.investmentGuide}
                  </div>
                </div>

                {/* Key Points */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <h4 className="font-semibold text-lg">핵심 포인트</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {summary.keyPoints.map((point, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm"
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline & Price Targets */}
                {summary.id === "1" && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <h4 className="font-semibold text-lg">
                        타임라인 전망
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <TimelineCard
                        period="2월"
                        label="현재"
                        description="50% 하락 후 저점 형성. 카운터 트렌드 랠리 시작 가능"
                        icon={
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        }
                        color="red"
                      />
                      <TimelineCard
                        period="3월 초"
                        label="주의"
                        description="낮은 고점(Lower High) 형성 예상. 반등 시 70K~73K 도달 가능"
                        icon={
                          <TrendingUp className="h-4 w-4 text-yellow-500" />
                        }
                        color="yellow"
                      />
                      <TimelineCard
                        period="4~5월"
                        label="위험"
                        description="2차 저점 가능성. 만약 조기 바닥이면 5월. S&P 500 동향 주시"
                        icon={
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        }
                        color="orange"
                      />
                      <TimelineCard
                        period="7~10월"
                        label="관망"
                        description="여름 저변동성 → Q4 변동성 급증. 10월 최종 바닥 가능성"
                        icon={
                          <Shield className="h-4 w-4 text-green-500" />
                        }
                        color="green"
                      />
                    </div>
                  </div>
                )}

                {/* Cycle Comparison Table */}
                {summary.id === "1" && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="h-5 w-5 text-purple-500" />
                      <h4 className="font-semibold text-lg">
                        과거 사이클 비교
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 font-semibold">
                              사이클
                            </th>
                            <th className="text-right p-3 font-semibold">
                              고점→저점 하락폭
                            </th>
                            <th className="text-right p-3 font-semibold">
                              하락 기간
                            </th>
                            <th className="text-right p-3 font-semibold">
                              2월 저점
                            </th>
                            <th className="text-right p-3 font-semibold">
                              3월 고점
                            </th>
                            <th className="text-right p-3 font-semibold">
                              최종 저점
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border/50 hover:bg-muted/50">
                            <td className="p-3 font-medium">2014</td>
                            <td className="p-3 text-right text-red-500">
                              -50%+
                            </td>
                            <td className="p-3 text-right">~1년</td>
                            <td className="p-3 text-right">2월 10일</td>
                            <td className="p-3 text-right">3월 3일</td>
                            <td className="p-3 text-right">10월</td>
                          </tr>
                          <tr className="border-b border-border/50 hover:bg-muted/50">
                            <td className="p-3 font-medium">2018</td>
                            <td className="p-3 text-right text-red-500">
                              -70%
                            </td>
                            <td className="p-3 text-right">51주</td>
                            <td className="p-3 text-right">2월 6일</td>
                            <td className="p-3 text-right">3월 5일</td>
                            <td className="p-3 text-right">12월</td>
                          </tr>
                          <tr className="border-b border-border/50 hover:bg-muted/50">
                            <td className="p-3 font-medium">2019</td>
                            <td className="p-3 text-right text-red-500">
                              -52%
                            </td>
                            <td className="p-3 text-right">수개월</td>
                            <td className="p-3 text-right">-</td>
                            <td className="p-3 text-right">-</td>
                            <td className="p-3 text-right">3월</td>
                          </tr>
                          <tr className="border-b border-border/50 hover:bg-muted/50">
                            <td className="p-3 font-medium">2022</td>
                            <td className="p-3 text-right text-red-500">
                              -63%
                            </td>
                            <td className="p-3 text-right">183일</td>
                            <td className="p-3 text-right">1월 (유사)</td>
                            <td className="p-3 text-right">3월 2일</td>
                            <td className="p-3 text-right">11월</td>
                          </tr>
                          <tr className="bg-primary/5 font-semibold">
                            <td className="p-3">2026 (현재)</td>
                            <td className="p-3 text-right text-red-500">
                              -50%
                            </td>
                            <td className="p-3 text-right">123일</td>
                            <td className="p-3 text-right text-primary">
                              2월 6일
                            </td>
                            <td className="p-3 text-right text-yellow-500">
                              3월 초 (예상)
                            </td>
                            <td className="p-3 text-right text-orange-500">
                              10월? 5월?
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notion Setup Guide */}
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Notion 연동 설정 가이드
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            <a
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Notion Integrations
            </a>
            에서 새 Integration을 생성합니다.
          </li>
          <li>
            Notion 데이터베이스를 생성하고 다음 속성을 추가합니다:
            <ul className="ml-6 mt-1 space-y-1 list-disc">
              <li>
                <code className="bg-muted px-1 rounded">Name</code> (Title)
              </li>
              <li>
                <code className="bg-muted px-1 rounded">URL</code> (URL)
              </li>
              <li>
                <code className="bg-muted px-1 rounded">Channel</code> (Rich
                Text)
              </li>
              <li>
                <code className="bg-muted px-1 rounded">Date</code> (Date)
              </li>
              <li>
                <code className="bg-muted px-1 rounded">Tags</code> (Multi
                Select)
              </li>
            </ul>
          </li>
          <li>데이터베이스에 Integration을 연결합니다 (Share → Invite).</li>
          <li>
            <code className="bg-muted px-1 rounded">.env.local</code> 파일에
            키를 추가합니다:
            <pre className="mt-1 bg-muted rounded-lg p-3 text-xs overflow-x-auto">
              {`NOTION_API_KEY=ntn_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
            </pre>
          </li>
        </ol>
      </div>
    </div>
  );
}

// ─── Sub Components ─────────────────────────────────────────────
function TimelineCard({
  period,
  label,
  description,
  icon,
  color,
}: {
  period: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: "border-red-500/30 bg-red-500/5",
    yellow: "border-yellow-500/30 bg-yellow-500/5",
    orange: "border-orange-500/30 bg-orange-500/5",
    green: "border-green-500/30 bg-green-500/5",
  };

  return (
    <div
      className={`rounded-lg border p-3 ${colorClasses[color] || "border-border"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{period}</span>
        <span className="flex items-center gap-1 text-xs">
          {icon}
          {label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
