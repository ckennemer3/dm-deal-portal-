export default function DealsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-surface-200 rounded w-32" />
        <div className="h-10 bg-brand-100 rounded w-36" />
      </div>
      <div className="card divide-y divide-surface-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-5 bg-surface-200 rounded w-32" />
            <div className="h-4 bg-surface-100 rounded w-48 flex-1" />
            <div className="h-6 bg-surface-100 rounded-full w-28" />
            <div className="h-4 bg-surface-100 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
