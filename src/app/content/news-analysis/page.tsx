"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Newspaper,
  Send,
  BookOpen,
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  Trash2,
  Link,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Database,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

// ─── Types ───────────────────────────────────────────────────────
interface NewsAnalysis {
  id: string;
  title: string;
  source: "text" | "url";
  sourceUrl?: string;
  date: string;
  summary: string;
  investmentGuide: string;
  keyPoints: string[];
  sentiment: "bullish" | "bearish" | "neutral" | "mixed";
  affectedAssets: string[];
  tags: string[];
}

// ─── Sentiment Config ────────────────────────────────────────────
const SENTIMENT_CONFIG: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  bullish: { label: "강세", emoji: "\uD83D\uDFE2", color: "text-green-500 bg-green-500/10" },
  bearish: { label: "약세", emoji: "\uD83D\uDD34", color: "text-red-500 bg-red-500/10" },
  neutral: { label: "중립", emoji: "\uD83D\uDFE1", color: "text-yellow-500 bg-yellow-500/10" },
  mixed: { label: "혼재", emoji: "\u26AA", color: "text-gray-500 bg-gray-500/10" },
};

const SENTIMENT_ICON: Record<string, React.ReactNode> = {
  bullish: <TrendingUp className="h-4 w-4" />,
  bearish: <TrendingDown className="h-4 w-4" />,
  neutral: <Minus className="h-4 w-4" />,
  mixed: <HelpCircle className="h-4 w-4" />,
};

// ─── LocalStorage ────────────────────────────────────────────────
const STORAGE_KEY = "news-analyses";

function loadAnalyses(): NewsAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as NewsAnalysis[];
      if (parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

// ─── Component ──────────────────────────────────────────────────
export default function NewsAnalysisPage() {
  const [analyses, setAnalyses] = useState<NewsAnalysis[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "url">("text");
  const [titleInput, setTitleInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notionStatus, setNotionStatus] = useState<"idle" | "saving" | "saved">("idle");
  const { toast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadAnalyses();
    setAnalyses(loaded);
    if (loaded.length > 0) setExpandedId(loaded[0].id);
    setHydrated(true);
  }, []);

  // Save to localStorage
  const saveAnalyses = useCallback((data: NewsAnalysis[]) => {
    setAnalyses(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full, ignore */
    }
  }, []);

  const handleAnalyze = async () => {
    const isTextMode = activeTab === "text";

    if (isTextMode && !textInput.trim()) return;
    if (!isTextMode && !urlInput.trim()) return;

    setIsLoading(true);

    if (isTextMode) {
      setLoadingStep("AI가 기사를 분석 중... (30초~1분 소요)");
    } else {
      setLoadingStep("URL에서 기사를 가져오는 중...");
    }

    try {
      const body: Record<string, string> = {};

      if (isTextMode) {
        body.content = textInput;
        if (titleInput.trim()) body.title = titleInput;
      } else {
        body.url = urlInput;
      }

      const response = await fetch("/api/news/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.status !== "ok") {
        toast("error", `분석 실패: ${data.message}`);
        setIsLoading(false);
        setLoadingStep("");
        return;
      }

      const newId = Date.now().toString();
      const newAnalysis: NewsAnalysis = {
        id: newId,
        title:
          data.title ||
          titleInput ||
          (isTextMode
            ? textInput.slice(0, 60) + (textInput.length > 60 ? "..." : "")
            : urlInput),
        source: isTextMode ? "text" : "url",
        sourceUrl: isTextMode ? undefined : urlInput,
        date: new Date().toISOString().split("T")[0],
        summary: data.summary,
        investmentGuide: data.investmentGuide,
        keyPoints: data.keyPoints,
        sentiment: data.sentiment || "neutral",
        affectedAssets: data.affectedAssets || [],
        tags: data.tags || [],
      };

      setAnalyses((prev) => {
        const updated = [newAnalysis, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch { /* storage full */ }
        return updated;
      });
      setExpandedId(newId);

      // Clear inputs
      setTitleInput("");
      setTextInput("");
      setUrlInput("");
    } catch {
      toast("error", "뉴스 분석에 실패했습니다.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleCopyToClipboard = async (analysis: NewsAnalysis) => {
    const text = `# ${analysis.title}
날짜: ${analysis.date}
심리: ${SENTIMENT_CONFIG[analysis.sentiment]?.label || analysis.sentiment}
영향 자산: ${analysis.affectedAssets.join(", ")}

## 분석 요약
${analysis.summary}

## 투자 가이드
${analysis.investmentGuide}

## 핵심 포인트
${analysis.keyPoints.map((p) => `- ${p}`).join("\n")}

## 태그
${analysis.tags.join(", ")}`;

    await navigator.clipboard.writeText(text);
    setCopiedId(analysis.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteConfirm = (id: string) => {
    setAnalyses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
    toast("success", "분석이 삭제되었습니다.");
  };

  const handleSaveToNotion = async (analysis: NewsAnalysis) => {
    setNotionStatus("saving");
    try {
      const response = await fetch("/api/notion/save-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: analysis.title,
          videoUrl: analysis.sourceUrl || "",
          channel: "뉴스 분석",
          publishedDate: analysis.date,
          summary: analysis.summary,
          investmentGuide: analysis.investmentGuide,
          keyPoints: analysis.keyPoints,
          tags: analysis.tags,
        }),
      });
      const data = await response.json();
      if (data.status === "ok") {
        setNotionStatus("saved");
        toast("success", "Notion에 저장되었습니다!");
      } else {
        throw new Error(data.message || "저장 실패");
      }
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Notion 저장에 실패했습니다.");
      setNotionStatus("idle");
    }
  };

  if (!hydrated) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-40 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">뉴스 AI 분석 & 투자가이드</h1>
        </div>
        <p className="text-muted-foreground">
          경제뉴스, 신문기사, X(트위터) 글 등을 AI가 분석하고 투자 관점의
          가이드를 제공합니다.
        </p>
      </div>

      {/* Input Section */}
      <div className="rounded-lg border border-border bg-card p-4">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => setActiveTab("text")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "text"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            텍스트 붙여넣기
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "url"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link className="h-4 w-4" />
            URL 입력
          </button>
        </div>

        {/* Text Tab */}
        {activeTab === "text" && (
          <div className="space-y-3">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="기사 제목 (선택사항)"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="기사 본문을 붙여넣으세요..."
              rows={8}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            />
          </div>
        )}

        {/* URL Tab */}
        {activeTab === "url" && (
          <div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="뉴스 기사 URL을 입력하세요 (예: https://...)"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
        )}

        {/* Analyze Button */}
        <div className="mt-4">
          <button
            onClick={handleAnalyze}
            disabled={
              isLoading ||
              (activeTab === "text" ? !textInput.trim() : !urlInput.trim())
            }
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading ? "분석 중..." : "분석 시작"}
          </button>
        </div>

        {/* Loading step indicator */}
        {isLoading && loadingStep && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            {loadingStep}
          </div>
        )}
      </div>

      {/* Analysis Count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          총 {analyses.length}개의 뉴스 분석
        </span>
      </div>

      {/* Analysis Cards */}
      <div className="space-y-4">
        {analyses.map((analysis) => {
          const sentimentInfo =
            SENTIMENT_CONFIG[analysis.sentiment] || SENTIMENT_CONFIG.neutral;

          return (
            <div
              key={analysis.id}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* Card Header (always visible) */}
              <button
                onClick={() =>
                  setExpandedId(
                    expandedId === analysis.id ? null : analysis.id
                  )
                }
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                {/* Sentiment icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${sentimentInfo.color}`}
                >
                  {SENTIMENT_ICON[analysis.sentiment]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{analysis.date}</span>
                    <span>&middot;</span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${sentimentInfo.color}`}
                    >
                      {sentimentInfo.emoji} {sentimentInfo.label}
                    </span>
                    {analysis.source === "url" && analysis.sourceUrl && (
                      <>
                        <span>&middot;</span>
                        <span className="flex items-center gap-1">
                          <Link className="h-3 w-3" />
                          URL
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{analysis.title}</h3>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {analysis.affectedAssets.slice(0, 5).map((asset) => (
                      <span
                        key={asset}
                        className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium"
                      >
                        {asset}
                      </span>
                    ))}
                    {analysis.tags.slice(0, 3).map((tag) => (
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
                  {expandedId === analysis.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedId === analysis.id && (
                <div className="border-t border-border p-4 space-y-6">
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSaveToNotion(analysis)}
                      disabled={notionStatus === "saving"}
                      className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <Database className="h-4 w-4" />
                      {notionStatus === "saving" ? "저장 중..." : "Notion에 저장"}
                    </button>
                    <button
                      onClick={() => handleCopyToClipboard(analysis)}
                      className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      {copiedId === analysis.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedId === analysis.id ? "복사됨!" : "클립보드 복사"}
                    </button>
                    {analysis.sourceUrl && (
                      <a
                        href={analysis.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <Link className="h-4 w-4" />
                        원본 기사
                      </a>
                    )}
                    {deletingId === analysis.id ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-muted-foreground">삭제하시겠습니까?</span>
                        <button
                          onClick={() => handleDeleteConfirm(analysis.id)}
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
                        onClick={() => setDeletingId(analysis.id)}
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
                      <h4 className="font-semibold text-lg">분석 요약</h4>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">
                      {analysis.summary}
                    </div>
                  </div>

                  {/* Investment Guide Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-5 w-5 text-yellow-500" />
                      <h4 className="font-semibold text-lg">투자 가이드</h4>
                    </div>
                    <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4 text-sm leading-relaxed whitespace-pre-line">
                      {analysis.investmentGuide}
                    </div>
                  </div>

                  {/* Key Points */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <h4 className="font-semibold text-lg">핵심 포인트</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analysis.keyPoints.map((point, i) => (
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

                  {/* Affected Assets */}
                  {analysis.affectedAssets.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        <h4 className="font-semibold text-lg">영향 자산</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.affectedAssets.map((asset) => (
                          <span
                            key={asset}
                            className="rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-sm font-medium"
                          >
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                      {analysis.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-3 py-1 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {analyses.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">아직 분석된 뉴스가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            위 입력란에 뉴스 기사를 붙여넣거나 URL을 입력하여 AI 분석을 시작하세요.
          </p>
        </div>
      )}
    </div>
  );
}
