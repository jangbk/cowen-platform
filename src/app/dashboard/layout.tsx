import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "투자 대시보드 - 실시간 시세, 리스크, 매크로 지표 모니터링",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
