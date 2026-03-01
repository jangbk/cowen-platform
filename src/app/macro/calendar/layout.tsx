import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Economic Calendar",
  description: "경제 캘린더 - 주요 매크로 지표 발표 일정",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
