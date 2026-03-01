import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News Analysis",
  description: "뉴스 AI 분석 - 경제뉴스 투자가이드",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
