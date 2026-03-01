"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, BarChart3 } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { CHART_CATALOG } from "@/data/chart-catalog";
import type { NavItem } from "@/lib/types";

interface SearchEntry {
  label: string;
  href: string;
  parent?: string;
  description?: string;
  type: "page" | "chart";
}

function flattenNavItems(items: NavItem[], parent?: string): SearchEntry[] {
  const result: SearchEntry[] = [];
  for (const item of items) {
    if (item.children) {
      result.push(...flattenNavItems(item.children, item.label));
    } else {
      result.push({ label: item.label, href: item.href, parent, type: "page" });
    }
  }
  return result;
}

const SECTION_LABELS: Record<string, string> = {
  crypto: "Crypto",
  macro: "Macro",
  tradfi: "TradFi",
};

const ALL_ENTRIES: SearchEntry[] = [
  ...flattenNavItems(NAV_ITEMS),
  ...CHART_CATALOG.map((c) => ({
    label: c.title,
    href: `/charts/${c.id}`,
    parent: `${SECTION_LABELS[c.section]} › ${c.category}`,
    description: c.description,
    type: "chart" as const,
  })),
];

export function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const NAV_PAGES = useMemo(() => ALL_ENTRIES.filter((e) => e.type === "page"), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return NAV_PAGES;
    const q = query.toLowerCase();
    return ALL_ENTRIES.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.href.toLowerCase().includes(q) ||
        (p.parent && p.parent.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [query, NAV_PAGES]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay to ensure the modal is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-search-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % filtered.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            navigate(filtered[selectedIndex].href);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, navigate, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="페이지 검색">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-fade-in">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="페이지 검색..."
              className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              aria-label="검색어 입력"
              autoComplete="off"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2" role="listbox">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </p>
            ) : (
              filtered.map((entry, i) => {
                const Icon = entry.type === "chart" ? BarChart3 : FileText;
                return (
                  <button
                    key={entry.href}
                    data-search-item
                    role="option"
                    aria-selected={i === selectedIndex}
                    onClick={() => navigate(entry.href)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      i === selectedIndex
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium">{entry.label}</span>
                      {entry.parent && (
                        <span className="text-xs text-muted-foreground">{entry.parent}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">↑↓</kbd>
              탐색
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">↵</kbd>
              이동
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">esc</kbd>
              닫기
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
