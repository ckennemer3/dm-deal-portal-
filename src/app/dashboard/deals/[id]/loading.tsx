export default function DealDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-surface-200 rounded w-48 mb-2" />
          <div className="h-4 bg-surface-100 rounded w-80" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-brand-100 rounded w-48" />
          <div className="h-10 bg-surface-200 rounded w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6">
              <div className="h-5 bg-surface-200 rounded w-40 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-surface-100 rounded w-full" />
                <div className="h-4 bg-surface-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6">
              <div className="h-5 bg-surface-200 rounded w-32 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-surface-100 rounded w-full" />
                <div className="h-4 bg-surface-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
