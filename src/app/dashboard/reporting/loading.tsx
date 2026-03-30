/**
 * Loading skeleton for the reporting page.
 * Shown during server re-renders (filter changes, tab switches).
 */
export default function ReportingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-32 bg-surface-200 rounded" />
        <div className="h-4 w-64 bg-surface-200 rounded mt-2" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-end gap-3 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`filter-${i}`} className="space-y-1.5">
            <div className="h-3 w-16 bg-surface-200 rounded" />
            <div className="h-9 w-40 bg-surface-200 rounded-md" />
          </div>
        ))}
      </div>

      {/* Tab nav skeleton */}
      <div className="flex gap-6 border-b border-surface-200 pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`tab-${i}`} className="h-4 w-24 bg-surface-200 rounded" />
        ))}
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`kpi-${i}`} className="rounded-lg border border-surface-200 bg-white p-4">
            <div className="h-3 w-20 bg-surface-200 rounded" />
            <div className="h-8 w-16 bg-surface-200 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Chart area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-surface-200 bg-white p-4 h-72" />
        <div className="rounded-lg border border-surface-200 bg-white p-4 h-72" />
      </div>
    </div>
  );
}
