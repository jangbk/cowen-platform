import { Search, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <span className="text-[120px] font-bold text-muted/50 leading-none select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <Search className="h-12 w-12 text-primary/50" />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" />
          대시보드
        </Link>
        <Link
          href="/charts"
          className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          차트
        </Link>
      </div>

      {/* Quick Links */}
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Screener", href: "/crypto/screener" },
          { label: "Heatmap", href: "/crypto/heatmap" },
          { label: "Tools", href: "/tools/dca-simulation" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border px-4 py-3 text-sm hover:border-primary/50 hover:bg-muted transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
