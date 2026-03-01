import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DCA Simulation",
  description: "DCA 시뮬레이션 - 적립식 투자 수익률 분석",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
