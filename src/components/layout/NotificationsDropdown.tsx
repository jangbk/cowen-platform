"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Bot, TrendingUp, Info, Check, RefreshCw, AlertTriangle } from "lucide-react";

interface Notification {
  id: string;
  icon: "bot" | "price" | "system";
  title: string;
  time: string;
  rawTime: number; // for sorting
  read: boolean;
}

interface BotTrade {
  time: string;
  type: string;
  price: string;
  qty: string;
  pnl: string;
}

interface BotStrategy {
  id: string;
  name: string;
  exchange: string;
  status: string;
  totalReturn: number;
  currentValue: number;
  initialCapital: number;
  totalTrades: number;
  recentTrades: BotTrade[];
  _live?: boolean;
}

interface SummaryResponse {
  strategies: BotStrategy[];
  timestamp: string;
}

const ICON_MAP = {
  bot: Bot,
  price: TrendingUp,
  system: Info,
};

function parseTradeTime(timeStr: string): Date {
  // Handle both "2026-01-25 14:30" and ISO formats
  if (timeStr.includes("T")) return new Date(timeStr);
  return new Date(timeStr.replace(" ", "T") + ":00");
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) return "방금 전";

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return `${Math.floor(diffDay / 30)}개월 전`;
}

function buildDemoNotifications(): Notification[] {
  const now = Date.now();
  return [
    {
      id: "demo-1",
      icon: "bot",
      title: "Seykota EMA Bot: 매수 체결 ₩97,150,000 × 0.003600",
      time: "3분 전",
      rawTime: now - 3 * 60_000,
      read: false,
    },
    {
      id: "demo-2",
      icon: "bot",
      title: "PTJ 200MA Bot: 매도 체결 ₩97,450,000 × 0.002100 (+32,400)",
      time: "18분 전",
      rawTime: now - 18 * 60_000,
      read: false,
    },
    {
      id: "demo-3",
      icon: "bot",
      title: "KIS RSI/MACD Bot: 매수 체결 삼성전자 ₩58,200 × 10주",
      time: "1시간 전",
      rawTime: now - 60 * 60_000,
      read: false,
    },
    {
      id: "demo-4",
      icon: "price",
      title: "Seykota EMA Bot: 총 수익률 +2.8% (5건 거래)",
      time: "현재",
      rawTime: now - 61 * 60_000,
      read: true,
    },
    {
      id: "demo-5",
      icon: "bot",
      title: "PTJ 200MA Bot: 매수 체결 ₩96,800,000 × 0.002100",
      time: "5시간 전",
      rawTime: now - 5 * 3600_000,
      read: true,
    },
    {
      id: "demo-6",
      icon: "price",
      title: "KIS RSI/MACD Bot: 총 수익률 +1.2% (12건 거래)",
      time: "현재",
      rawTime: now - 5 * 3600_000 - 1,
      read: true,
    },
    {
      id: "demo-7",
      icon: "bot",
      title: "Seykota EMA Bot: 매도 체결 ₩98,200,000 × 0.003200 (+48,700)",
      time: "1일 전",
      rawTime: now - 26 * 3600_000,
      read: true,
    },
  ];
}

function buildNotifications(strategies: BotStrategy[]): Notification[] {
  const notifications: Notification[] = [];
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  for (const bot of strategies) {
    // 최근 거래 → 알림 변환 (봇당 최대 3건)
    for (const trade of bot.recentTrades.slice(0, 3)) {
      const tradeDate = parseTradeTime(trade.time);
      const isBuy = trade.type === "Buy";
      const pnlText = !isBuy && trade.pnl !== "-" ? ` (${trade.pnl})` : "";

      notifications.push({
        id: `${bot.id}-${trade.time}-${trade.type}`,
        icon: "bot",
        title: `${bot.name}: ${isBuy ? "매수" : "매도"} ₩${trade.price}${pnlText}`,
        time: timeAgo(tradeDate),
        rawTime: tradeDate.getTime(),
        read: tradeDate.getTime() < oneDayAgo,
      });
    }

    // 봇 성과 요약 (실제 거래가 있고 라이브인 경우만)
    if (bot._live && bot.totalTrades > 0) {
      const sign = bot.totalReturn >= 0 ? "+" : "";
      notifications.push({
        id: `${bot.id}-summary`,
        icon: "price",
        title: `${bot.name}: 총 수익률 ${sign}${bot.totalReturn}% (${bot.totalTrades}건 거래)`,
        time: "현재",
        rawTime: Date.now() - 1, // show near top but below recent trades
        read: true,
      });
    }

    // 봇 오프라인 경고 (API 연결 실패)
    if (bot._live === false) {
      notifications.push({
        id: `${bot.id}-offline`,
        icon: "system",
        title: `${bot.name}: API 연결 실패 — 데모 데이터 표시 중`,
        time: "현재",
        rawTime: Date.now(),
        read: false,
      });
    }
  }

  // 최신순 정렬
  notifications.sort((a, b) => b.rawTime - a.rawTime);
  return notifications;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [demoMode, setDemoMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/bots/summary");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SummaryResponse = await res.json();
      const items = buildNotifications(data.strategies);
      setNotifications(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알림을 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드 + 60초 간격 자동 갱신
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // 읽지 않은 알림 수 (사용자가 "모두 읽음" 누른 것 반영)
  const unreadCount = notifications.filter(
    (n) => !n.read && !readIds.has(n.id)
  ).length;

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  function isUnread(n: Notification) {
    return !n.read && !readIds.has(n.id);
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 hover:bg-muted transition-colors"
        aria-label="알림"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5 text-foreground" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-border bg-card shadow-xl animate-fade-in"
          role="menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">알림</h3>
              <button
                onClick={fetchNotifications}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="새로고침"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
            </div>
            {demoMode ? (
              <button
                onClick={() => {
                  setDemoMode(false);
                  setNotifications([]);
                  fetchNotifications();
                }}
                className="text-xs text-yellow-600 hover:underline"
              >
                데모 종료
              </button>
            ) : unreadCount > 0 ? (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Check className="h-3 w-3" aria-hidden="true" />
                모두 읽음
              </button>
            ) : null}
          </div>

          {/* Notification list */}
          <div className="max-h-[320px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">봇 데이터 로딩 중...</span>
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="text-xs text-primary hover:underline"
                >
                  다시 시도
                </button>
              </div>
            ) : notifications.length === 0 && !demoMode ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <p className="text-sm text-muted-foreground">
                  새로운 알림이 없습니다
                </p>
                <button
                  onClick={() => {
                    setDemoMode(true);
                    setNotifications(buildDemoNotifications());
                    setReadIds(new Set());
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  데모 데이터 보기
                </button>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_MAP[n.icon];
                const unread = isUnread(n);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      unread ? "bg-primary/5" : ""
                    }`}
                    role="menuitem"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        unread
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          unread ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p>
                    </div>
                    {unread && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="읽지 않음" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
