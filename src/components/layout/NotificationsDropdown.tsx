"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Bot, TrendingUp, Info, Check } from "lucide-react";

interface Notification {
  id: string;
  icon: "bot" | "price" | "system";
  title: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    icon: "bot",
    title: "BTC 그리드 봇: 매수 체결 $97,450",
    time: "5분 전",
    read: false,
  },
  {
    id: "2",
    icon: "price",
    title: "ETH 가격 알림: $3,800 돌파",
    time: "23분 전",
    read: false,
  },
  {
    id: "3",
    icon: "system",
    title: "포트폴리오 리밸런싱 리포트 생성 완료",
    time: "1시간 전",
    read: false,
  },
  {
    id: "4",
    icon: "bot",
    title: "SOL DCA 봇: 주간 매수 완료 $185.20",
    time: "3시간 전",
    read: true,
  },
  {
    id: "5",
    icon: "system",
    title: "시스템 점검 완료 — 모든 서비스 정상",
    time: "1일 전",
    read: true,
  },
];

const ICON_MAP = {
  bot: Bot,
  price: TrendingUp,
  system: Info,
};

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
            <h3 className="text-sm font-semibold text-foreground">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Check className="h-3 w-3" aria-hidden="true" />
                모두 읽음
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                새로운 알림이 없습니다
              </p>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_MAP[n.icon];
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                    role="menuitem"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        !n.read
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug ${
                          !n.read ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p>
                    </div>
                    {!n.read && (
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
