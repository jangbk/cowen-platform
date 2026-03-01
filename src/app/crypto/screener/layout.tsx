import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto Screener",
  description: "암호화폐 스크리너 - 실시간 가격, 변동률, 시가총액 비교",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
