"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { Search, Star, ChevronDown, FolderClosed, FolderOpen } from "lucide-react";
import {
  CHART_CATALOG,
  getCategoriesForSection,
} from "@/data/chart-catalog";

export default function ChartsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"crypto" | "macro" | "tradfi">(
    () => {
      if (pathname.includes("/charts/macro")) return "macro";
      if (pathname.includes("/charts/tradfi")) return "tradfi";
      return "crypto";
    }
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const categories = getCategoriesForSection(activeTab);

  const filteredCharts = useMemo(() => {
    const sectionCharts = CHART_CATALOG.filter(
      (c) => c.section === activeTab
    );
    if (!searchQuery.trim()) return sectionCharts;
    const q = searchQuery.toLowerCase();
    return sectionCharts.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [activeTab, searchQuery]);

  const favoriteCharts = CHART_CATALOG.filter((c) => favorites.has(c.id));

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto p-4">
          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {(["crypto", "macro", "tradfi"] as const).map((tab) => (
              <Link
                key={tab}
                href={`/charts/${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab === "tradfi"
                  ? "TradFi"
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="차트 검색..."
              className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Favorites */}
          {favoriteCharts.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 flex items-center gap-1 text-xs font-bold text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                즐겨찾기
              </p>
              {favoriteCharts.map((chart) => (
                <Link
                  key={chart.id}
                  href={`/charts/${chart.id}`}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors ${
                    pathname === `/charts/${chart.id}`
                      ? "bg-muted font-medium"
                      : ""
                  }`}
                >
                  <span className="truncate">{chart.title}</span>
                  <Star
                    className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400 cursor-pointer"
                    onClick={(e) => toggleFavorite(chart.id, e)}
                  />
                </Link>
              ))}
              <div className="my-3 border-b border-border" />
            </div>
          )}

          {/* Categories with charts */}
          {searchQuery ? (
            // Show flat filtered results
            <div className="space-y-0.5">
              <p className="mb-2 text-xs text-muted-foreground">
                {filteredCharts.length}개 결과
              </p>
              {filteredCharts.map((chart) => (
                <Link
                  key={chart.id}
                  href={`/charts/${chart.id}`}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors ${
                    pathname === `/charts/${chart.id}`
                      ? "bg-muted font-medium"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block truncate">{chart.title}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {chart.category}
                    </span>
                  </div>
                  <Star
                    className={`h-3 w-3 shrink-0 cursor-pointer ${
                      favorites.has(chart.id)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30 hover:text-muted-foreground"
                    }`}
                    onClick={(e) => toggleFavorite(chart.id, e)}
                  />
                </Link>
              ))}
            </div>
          ) : (
            // Show categorized tree
            <div className="space-y-1">
              {categories.map((cat) => {
                const chartsInCat = filteredCharts.filter(
                  (c) => c.category === cat
                );
                const isExpanded = expandedCategories.has(cat);
                return (
                  <div key={cat}>
                    {/* ── Category header ── */}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-[11px] font-bold tracking-wide transition-colors text-left ${
                        isExpanded
                          ? "bg-primary/10 text-primary dark:bg-primary/15"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {isExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <FolderClosed className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="flex-1 min-w-0 text-left uppercase">
                        {cat} ({chartsInCat.length})
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 shrink-0 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {/* ── Child items with left indent line ── */}
                    {isExpanded && (
                      <div className="ml-[11px] border-l-2 border-border/60 pl-0 mt-0.5 mb-1">
                        {chartsInCat.map((chart) => (
                          <Link
                            key={chart.id}
                            href={`/charts/${chart.id}`}
                            className={`group flex w-full items-center justify-between rounded-r-md py-1.5 pl-3 pr-2 text-[13px] transition-colors ${
                              pathname === `/charts/${chart.id}`
                                ? "bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px] pl-[14px]"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <span className="truncate">{chart.title}</span>
                            <Star
                              className={`h-3 w-3 shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity ${
                                favorites.has(chart.id)
                                  ? "!opacity-100 fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground/40 hover:text-yellow-400"
                              }`}
                              onClick={(e) => toggleFavorite(chart.id, e)}
                            />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart count */}
          <div className="mt-4 pt-3 border-t border-border text-center text-[10px] text-muted-foreground">
            {CHART_CATALOG.filter((c) => c.section === activeTab).length} charts
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
