import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backtest Simulator",
  description: "백테스트 시뮬레이터 - 자동매매 전략 성과 분석",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
