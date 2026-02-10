export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-surface-200 rounded w-64 mb-2" />
        <div className="h-4 bg-surface-100 rounded w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-5 bg-surface-200 rounded w-40 mb-3" />
            <div className="h-4 bg-surface-100 rounded w-full mb-2" />
            <div className="h-4 bg-surface-100 rounded w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-6 bg-surface-200 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-4 bg-surface-100 rounded flex-1" />
                  <div className="h-4 bg-surface-100 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
