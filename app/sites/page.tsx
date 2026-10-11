import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/shared/EmptyState';

const sites: Array<{ id: string; name: string; url: string; status: string }> = [];

export default function SitesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">WordPress</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Connected sites</h2>
        </div>

        {sites.length === 0 ? (
          <EmptyState
            title="No connected WordPress sites"
            description="When a site is connected, it will appear here for secure publishing and deployment checks."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sites.map((site) => (
              <div key={site.id} className="card">
                <p className="text-xl font-semibold text-slate-900">{site.name}</p>
                <p className="mt-2 text-sm text-slate-600">{site.url}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-slate-500">{site.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
