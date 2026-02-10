export default function ReportingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-surface-200 rounded w-40" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-4 bg-surface-100 rounded w-24 mb-3" />
            <div className="h-8 bg-surface-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-5 bg-surface-200 rounded w-40 mb-4" />
            <div className="h-48 bg-surface-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
