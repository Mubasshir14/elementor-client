import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">The page you requested could not be located.</p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
