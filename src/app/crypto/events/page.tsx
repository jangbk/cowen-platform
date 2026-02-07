"use client";

import { useState } from "react";
import {
  Calendar,
  Bell,
  BellRing,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Star,
  Clock,
  TrendingUp,
  Zap,
  Globe,
  Coins,
  ArrowUpDown,
} from "lucide-react";

// Sample events data (will be replaced by CoinMarketCal API)
const SAMPLE_EVENTS = [
  {
    id: 1,
    title: "Bitcoin Halving Countdown",
    coin: "BTC",
    coinName: "Bitcoin",
    date: "2026-03-15",
    category: "Halving",
    importance: "high" as const,
    description:
      "Bitcoin block reward halving event. Historically significant price catalyst.",
    source: "CoinMarketCal",
    confidence: 95,
    notified: true,
  },
  {
    id: 2,
    title: "Ethereum Dencun Upgrade Phase 2",
    coin: "ETH",
    coinName: "Ethereum",
    date: "2026-02-20",
    category: "Hard Fork",
    importance: "high" as const,
    description:
      "Major network upgrade improving L2 scalability and reducing gas fees.",
    source: "CoinMarketCal",
    confidence: 88,
    notified: false,
  },
  {
    id: 3,
    title: "Solana Firedancer Mainnet Launch",
    coin: "SOL",
    coinName: "Solana",
    date: "2026-02-10",
    category: "Release",
    importance: "high" as const,
    description:
      "Jump Crypto's independent validator client goes live on mainnet.",
    source: "CoinMarketCal",
    confidence: 82,
    notified: true,
  },
  {
    id: 4,
    title: "XRP SEC Case Final Ruling",
    coin: "XRP",
    coinName: "XRP",
    date: "2026-02-14",
    category: "Regulation",
    importance: "high" as const,
    description: "Expected final ruling in the SEC vs Ripple case.",
    source: "CoinMarketCal",
    confidence: 70,
    notified: false,
  },
  {
    id: 5,
    title: "Cardano Voltaire Governance Vote",
    coin: "ADA",
    coinName: "Cardano",
    date: "2026-02-12",
    category: "Governance",
    importance: "medium" as const,
    description:
      "Community governance vote for treasury allocation proposals.",
    source: "CoinMarketCal",
    confidence: 90,
    notified: false,
  },
  {
    id: 6,
    title: "Chainlink CCIP v2.0",
    coin: "LINK",
    coinName: "Chainlink",
    date: "2026-02-18",
    category: "Release",
    importance: "medium" as const,
    description:
      "Cross-Chain Interoperability Protocol major upgrade with new features.",
    source: "CoinMarketCal",
    confidence: 85,
    notified: false,
  },
  {
    id: 7,
    title: "Polygon zkEVM Type 1 Upgrade",
    coin: "POL",
    coinName: "Polygon",
    date: "2026-02-25",
    category: "Release",
    importance: "medium" as const,
    description: "Full EVM equivalence achieved for Polygon zkEVM.",
    source: "CoinMarketCal",
    confidence: 78,
    notified: false,
  },
  {
    id: 8,
    title: "BUIDL Europe 2026 Conference",
    coin: "CRYPTO",
    coinName: "General",
    date: "2026-03-01",
    category: "Conference",
    importance: "low" as const,
    description:
      "Two-day technical conference for builders and founders in Europe.",
    source: "CoinMarketCal",
    confidence: 100,
    notified: false,
  },
  {
    id: 9,
    title: "Avalanche Subnet-EVM Upgrade",
    coin: "AVAX",
    coinName: "Avalanche",
    date: "2026-02-28",
    category: "Release",
    importance: "medium" as const,
    description: "Major upgrade to Subnet-EVM improving interoperability.",
    source: "CoinMarketCal",
    confidence: 75,
    notified: false,
  },
  {
    id: 10,
    title: "BNB Chain Quarterly Token Burn",
    coin: "BNB",
    coinName: "BNB",
    date: "2026-02-15",
    category: "Token Burn",
    importance: "medium" as const,
    description: "Scheduled quarterly BNB token burn event.",
    source: "CoinMarketCal",
    confidence: 95,
    notified: true,
  },
  {
    id: 11,
    title: "Tron USDD 2.0 Launch",
    coin: "TRX",
    coinName: "TRON",
    date: "2026-03-05",
    category: "Release",
    importance: "medium" as const,
    description:
      "New version of USDD stablecoin with improved collateralization.",
    source: "CoinMarketCal",
    confidence: 72,
    notified: false,
  },
  {
    id: 12,
    title: "US Crypto Regulation Bill Vote",
    coin: "CRYPTO",
    coinName: "General",
    date: "2026-03-10",
    category: "Regulation",
    importance: "high" as const,
    description:
      "US Congress vote on comprehensive cryptocurrency regulation framework.",
    source: "CoinMarketCal",
    confidence: 65,
    notified: true,
  },
];

const CATEGORIES = [
  "All",
  "Hard Fork",
  "Release",
  "Regulation",
  "Conference",
  "Token Burn",
  "Halving",
  "Governance",
  "Airdrop",
  "Partnership",
  "Exchange Listing",
];

const COINS_FILTER = [
  "All",
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "BNB",
  "LINK",
  "AVAX",
  "TRX",
  "POL",
];

function getImportanceColor(importance: string) {
  switch (importance) {
    case "high":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "low":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getImportanceDot(importance: string) {
  switch (importance) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Hard Fork":
    case "Release":
      return <Zap className="h-4 w-4" />;
    case "Regulation":
      return <Globe className="h-4 w-4" />;
    case "Token Burn":
    case "Halving":
      return <Coins className="h-4 w-4" />;
    case "Conference":
      return <Globe className="h-4 w-4" />;
    case "Governance":
      return <Star className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
}

function getConfidenceColor(score: number) {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getDaysUntil(dateStr: string) {
  const today = new Date();
  const eventDate = new Date(dateStr);
  const diff = Math.ceil(
    (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Past";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `D-${diff}`;
}

function getDaysUntilClass(dateStr: string) {
  const today = new Date();
  const eventDate = new Date(dateStr);
  const diff = Math.ceil(
    (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff <= 0) return "bg-red-500 text-white";
  if (diff <= 3) return "bg-orange-500 text-white";
  if (diff <= 7) return "bg-amber-500 text-white";
  return "bg-blue-500 text-white";
}

export default function CryptoEventsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCoin, setSelectedCoin] = useState("All");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [notifications, setNotifications] = useState<Record<number, boolean>>(
    Object.fromEntries(
      SAMPLE_EVENTS.filter((e) => e.notified).map((e) => [e.id, true])
    )
  );
  const [alertDays, setAlertDays] = useState(3);
  const [showAlertSettings, setShowAlertSettings] = useState(false);

  const filteredEvents = SAMPLE_EVENTS.filter((event) => {
    if (selectedCategory !== "All" && event.category !== selectedCategory)
      return false;
    if (selectedCoin !== "All" && event.coin !== selectedCoin) return false;
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const toggleNotification = (id: number) => {
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const upcomingCount = filteredEvents.filter((e) => {
    const diff = Math.ceil(
      (new Date(e.date).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff >= 0 && diff <= alertDays;
  }).length;

  // Calendar view helpers
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const calendarYear = calendarMonth.getFullYear();
  const calendarMo = calendarMonth.getMonth();
  const daysInMonth = new Date(calendarYear, calendarMo + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMo, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  function getEventsForDay(day: number) {
    const dateStr = `${calendarYear}-${String(calendarMo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date === dateStr);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Crypto Event Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            주요 암호화폐 이벤트 일정 및 알림 (CoinMarketCal 기반)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {upcomingCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <BellRing className="h-4 w-4" />
              {upcomingCount}건 임박
            </span>
          )}
          <button
            onClick={() => setShowAlertSettings(!showAlertSettings)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
            알림 설정
          </button>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              리스트
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              캘린더
            </button>
          </div>
        </div>
      </div>

      {/* Alert Settings Panel */}
      {showAlertSettings && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            알림 설정
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm text-muted-foreground">
                사전 알림 (일 전)
              </label>
              <select
                value={alertDays}
                onChange={(e) => setAlertDays(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value={1}>1일 전</option>
                <option value={2}>2일 전</option>
                <option value={3}>3일 전</option>
                <option value={5}>5일 전</option>
                <option value={7}>7일 전</option>
                <option value={14}>14일 전</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                알림 대상 중요도
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>모든 이벤트</option>
                <option>High + Medium</option>
                <option>High만</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">
                알림 방법
              </label>
              <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>브라우저 알림</option>
                <option>이메일</option>
                <option>Telegram</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          필터:
        </div>
        <select
          value={selectedCoin}
          onChange={(e) => setSelectedCoin(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          {COINS_FILTER.map((coin) => (
            <option key={coin} value={coin}>
              {coin === "All" ? "모든 코인" : coin}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "All" ? "전체" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Date badge */}
                  <div className="shrink-0 text-center">
                    <div
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${getDaysUntilClass(event.date)}`}
                    >
                      {getDaysUntil(event.date)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">
                        {event.coin}
                      </span>
                      <h3 className="font-semibold text-sm">{event.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {event.description}
                    </p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getImportanceColor(event.importance)}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getImportanceDot(event.importance)}`}
                        />
                        {event.importance === "high"
                          ? "중요"
                          : event.importance === "medium"
                            ? "보통"
                            : "낮음"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {getCategoryIcon(event.category)}
                        {event.category}
                      </span>
                      <span
                        className={`text-xs font-medium ${getConfidenceColor(event.confidence)}`}
                      >
                        신뢰도: {event.confidence}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notification toggle */}
                <button
                  onClick={() => toggleNotification(event.id)}
                  className={`shrink-0 rounded-lg p-2 transition-colors ${
                    notifications[event.id]
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                  title={
                    notifications[event.id] ? "알림 해제" : "알림 설정"
                  }
                >
                  {notifications[event.id] ? (
                    <BellRing className="h-5 w-5" />
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                선택한 필터에 해당하는 이벤트가 없습니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <button
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarYear, calendarMo - 1, 1)
                )
              }
              className="rounded-lg p-1.5 hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="font-semibold">
              {calendarMonth.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
              })}
            </h3>
            <button
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarYear, calendarMo + 1, 1)
                )
              }
              className="rounded-lg p-1.5 hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div
                key={day}
                className="border-b border-border px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day, idx) => {
              const events = day ? getEventsForDay(day) : [];
              const isToday =
                day === new Date().getDate() &&
                calendarMo === new Date().getMonth() &&
                calendarYear === new Date().getFullYear();

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                    day ? "hover:bg-muted/30" : "bg-muted/10"
                  }`}
                >
                  {day && (
                    <>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                          isToday
                            ? "bg-primary text-primary-foreground font-bold"
                            : ""
                        }`}
                      >
                        {day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {events.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`rounded px-1 py-0.5 text-[10px] font-medium truncate cursor-pointer ${getImportanceColor(event.importance)}`}
                            title={`${event.coin}: ${event.title}`}
                          >
                            {event.coin} {event.title.slice(0, 15)}...
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1">
                            +{events.length - 3}건
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source Attribution */}
      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Data source: CoinMarketCal API | 총 {filteredEvents.length}개
          이벤트
        </span>
        <a
          href="https://coinmarketcal.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          CoinMarketCal <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
