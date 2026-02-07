import Link from "next/link";

const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Charts", href: "/charts" },
      { label: "Screener", href: "/crypto/screener" },
      { label: "Heatmap", href: "/crypto/heatmap" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "DCA Simulation", href: "/tools/dca-simulation" },
      { label: "Exit Strategies", href: "/tools/exit-strategies" },
      { label: "Portfolio Theory", href: "/tools/modern-portfolio-theory" },
      { label: "Workbench", href: "/tools/workbench" },
    ],
  },
  {
    title: "Content",
    links: [
      { label: "Studies", href: "/content/studies" },
      { label: "Premium Videos", href: "/content/premium-videos" },
      { label: "Newsletter", href: "/content/newsletter" },
      { label: "Release Notes", href: "/content/release-notes" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-12" role="contentinfo">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
                <circle cx="20" cy="20" r="18" fill="#3b82f6" />
                <path
                  d="M28 20a8 8 0 01-16 0 8 8 0 0112-6.93A12 12 0 0028 20z"
                  fill="#1e40af"
                />
              </svg>
              <span className="text-sm font-bold">
                <span className="text-primary">BK</span>{" "}
                <span className="text-muted-foreground">CRYPTOVERSE</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              크립토, 매크로, 전통 금융을 아우르는
              <br />
              종합 투자 분석 플랫폼
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BK Cryptoverse. All rights
            reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            투자 조언이 아닙니다. 투자 결정은 본인 책임입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
