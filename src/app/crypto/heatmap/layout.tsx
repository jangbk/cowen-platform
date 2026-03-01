import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto Heatmap",
  description: "암호화폐 히트맵 - 시가총액 기반 시각화",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
