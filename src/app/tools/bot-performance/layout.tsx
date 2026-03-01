import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bot Performance",
  description: "봇 성과 - 자동매매 봇 실시간 성과 추적",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
