import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { QueryProvider } from "@/components/layout/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import Breadcrumb from "@/components/ui/Breadcrumb";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["700", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "BK INVESTMENT - Investment Analysis Platform",
    template: "%s | BK INVESTMENT",
  },
  description:
    "Comprehensive investment analysis platform covering crypto, macro economics, traditional finance, and quantitative tools.",
  keywords: [
    "crypto",
    "bitcoin",
    "ethereum",
    "investment",
    "analysis",
    "portfolio",
    "macro",
    "on-chain",
  ],
  authors: [{ name: "BK INVESTMENT" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "BK INVESTMENT",
    title: "BK INVESTMENT - Investment Analysis Platform",
    description:
      "크립토, 매크로, 전통 금융을 아우르는 종합 투자 분석 플랫폼",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              {/* Skip to content for keyboard users */}
              <a href="#main-content" className="skip-to-content">
                본문으로 건너뛰기
              </a>

              <Header />

              <Breadcrumb />

              <main id="main-content" className="mx-auto max-w-[1600px] min-h-[calc(100vh-3.5rem)]" role="main">
                {children}
              </main>

              <Footer />
              <ScrollToTop />
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
