export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse" role="status" aria-label="페이지 로딩 중">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-muted" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="h-32 rounded-md bg-muted" />
            <div className="h-4 w-3/4 rounded-md bg-muted" />
            <div className="h-3 w-1/2 rounded-md bg-muted" />
          </div>
        ))}
      </div>

      <span className="sr-only">로딩 중...</span>
    </div>
  );
}
