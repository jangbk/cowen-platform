"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, Bell, User, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { ThemeToggle } from "./ThemeToggle";
import type { NavItem } from "@/lib/types";

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="BK Cryptoverse 홈">
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
          <circle cx="20" cy="20" r="19" fill="#f7931a" />
          <text x="20" y="27" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#fff" fontFamily="Arial, sans-serif">₿</text>
        </svg>
      </div>
      <span className="hidden leading-tight sm:block font-[var(--font-orbitron)]">
        <span className="text-base font-black text-primary tracking-tight">BK</span>
        <br />
        <span className="text-[10px] font-bold text-foreground tracking-widest">
          CRYPTOVERSE
        </span>
      </span>
    </Link>
  );
}

function NavDropdown({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-md",
          isActive
            ? "text-primary"
            : "text-foreground hover:text-primary"
        )}
      >
        {item.label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && item.children && (
        <div
          className="absolute left-0 top-full z-50 mt-0.5 min-w-[200px] rounded-lg border border-border bg-card py-1.5 shadow-lg animate-fade-in"
          role="menu"
        >
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block px-4 py-2 text-sm text-card-foreground hover:bg-muted transition-colors"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="메인 네비게이션">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          pathname.startsWith(item.href + "/");

        if (item.children) {
          return (
            <NavDropdown key={item.href} item={item} isActive={isActive} />
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors rounded-md",
              isActive
                ? "text-primary bg-accent"
                : "text-foreground hover:text-primary"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border overflow-y-auto animate-slide-in-left">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Logo />
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-2" aria-label="모바일 네비게이션">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");

            if (item.children) {
              const isExpanded = expandedItem === item.href;
              return (
                <div key={item.href}>
                  <button
                    onClick={() =>
                      setExpandedItem(isExpanded ? null : item.href)
                    }
                    aria-expanded={isExpanded}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary bg-accent"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {isExpanded && (
                    <div className="ml-3 border-l border-border pl-3 py-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            pathname === child.href
                              ? "text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          aria-current={pathname === child.href ? "page" : undefined}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary bg-accent"
                    : "text-foreground hover:bg-muted"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md" role="banner">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 hover:bg-muted rounded-lg lg:hidden"
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Logo />
          <DesktopNav />

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-1">
            <button
              className="rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="검색"
            >
              <Search className="h-5 w-5 text-foreground" aria-hidden="true" />
            </button>
            <ThemeToggle />
            <button
              className="rounded-lg p-2 hover:bg-muted transition-colors hidden sm:inline-flex"
              aria-label="알림"
            >
              <Bell className="h-5 w-5 text-foreground" aria-hidden="true" />
            </button>
            <button
              className="rounded-lg p-2 hover:bg-muted transition-colors hidden sm:inline-flex"
              aria-label="프로필"
            >
              <User className="h-5 w-5 text-foreground" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
