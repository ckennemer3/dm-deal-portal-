import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-brand-600 mb-4">404</div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Page not found</h1>
        <p className="text-surface-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary inline-flex items-center"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
