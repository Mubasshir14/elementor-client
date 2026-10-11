import { AppLayout } from '@/components/layout/AppLayout';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Account</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Settings</h2>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card space-y-5">
            <h3 className="text-xl font-semibold text-slate-900">Profile</h3>
            <div>
              <label className="label">Full name</label>
              <input className="input" defaultValue="Design Team" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" defaultValue="team@example.com" />
            </div>
          </section>

          <section className="card space-y-5">
            <h3 className="text-xl font-semibold text-slate-900">Platform preferences</h3>
            <div>
              <label className="label">Default source type</label>
              <select className="input" defaultValue="zip">
                <option value="zip">React/Next.js ZIP</option>
                <option value="screenshot">Screenshot</option>
                <option value="design-file">Design file</option>
              </select>
            </div>
            <div>
              <label className="label">Default target</label>
              <select className="input" defaultValue="elementor-pro">
                <option value="elementor-pro">Elementor Pro</option>
                <option value="elementor-free">Elementor Free</option>
              </select>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
