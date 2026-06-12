export default function ActivityLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-surface-200 rounded w-48" />
        <div className="h-4 bg-surface-100 rounded w-72 mt-2" />
      </div>
      <div className="card divide-y divide-surface-100">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-4 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-surface-200 mt-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-200 rounded w-64" />
              <div className="h-4 bg-surface-100 rounded w-96 max-w-full" />
              <div className="h-3 bg-surface-100 rounded w-32" />
            </div>
            <div className="h-6 bg-surface-100 rounded-full w-28 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
