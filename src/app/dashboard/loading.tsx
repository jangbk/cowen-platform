export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 animate-pulse" role="status" aria-label="대시보드 로딩 중">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Table skeleton */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="h-6 w-40 rounded-md bg-muted mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-8 rounded bg-muted" />
                  <div className="h-6 w-6 rounded-full bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="ml-auto h-4 w-16 rounded bg-muted" />
                  <div className="h-4 w-12 rounded bg-muted" />
                  <div className="h-4 w-12 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                  <div className="h-8 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>

          {/* Gauge skeletons */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="h-5 w-40 rounded bg-muted mb-4" />
              <div className="h-40 rounded bg-muted" />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="h-5 w-40 rounded bg-muted mb-4" />
              <div className="h-40 rounded bg-muted" />
            </div>
          </div>

          {/* Chart skeletons */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="h-5 w-32 rounded bg-muted mb-2" />
              <div className="h-[200px] rounded bg-muted" />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="h-5 w-32 rounded bg-muted mb-2" />
              <div className="h-[200px] rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="h-5 w-24 rounded bg-muted mb-3" />
            <div className="aspect-video rounded bg-muted" />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="h-5 w-28 rounded bg-muted mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">대시보드 로딩 중...</span>
    </div>
  );
}
