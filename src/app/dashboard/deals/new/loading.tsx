export default function NewDealLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      <div>
        <div className="h-8 bg-surface-200 rounded w-72 mb-2" />
        <div className="h-4 bg-surface-100 rounded w-96" />
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-surface-200" />
            <div className="h-3 bg-surface-100 rounded w-16 hidden md:block" />
            {i < 7 && <div className="flex-1 h-0.5 bg-surface-200" />}
          </div>
        ))}
      </div>
      <div className="card p-6 min-h-[400px]">
        <div className="h-6 bg-surface-200 rounded w-40 mb-2" />
        <div className="h-4 bg-surface-100 rounded w-64 mb-8" />
        <div className="space-y-4">
          <div className="h-10 bg-surface-100 rounded w-full" />
          <div className="h-10 bg-surface-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
