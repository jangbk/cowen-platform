"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudyDetailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/content/studies");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
      <p>리다이렉트 중...</p>
    </div>
  );
}
