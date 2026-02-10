export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-surface-200 rounded w-48 mb-2" />
      <div className="flex gap-4 border-b border-surface-200 pb-2">
        {['Users', 'Teams', 'Offices'].map((tab) => (
          <div key={tab} className="h-8 bg-surface-100 rounded w-20" />
        ))}
      </div>
      <div className="card p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-surface-200" />
              <div className="h-4 bg-surface-100 rounded flex-1" />
              <div className="h-6 bg-surface-100 rounded-full w-24" />
              <div className="h-4 bg-surface-100 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
