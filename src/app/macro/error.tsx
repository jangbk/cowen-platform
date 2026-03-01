"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
      <p className="text-sm text-muted-foreground mb-4">{error.message || "페이지를 불러오는 중 문제가 발생했습니다."}</p>
      <button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        다시 시도
      </button>
    </div>
  );
}
