import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Daily",
  description: "주식 일간 리포트 - 한미 주식 데일리 분석",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
