import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-24">
        <div className="max-w-xl">
          <span className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            Design-to-Elementor
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
            Turn design sources into Elementor-ready builds.
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Upload a React or Next.js ZIP, screenshots, or a supported design source, configure the target, and let the backend handle conversion, validation, and export.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              Access dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/projects/new" className="btn-secondary">
              Start new project
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-600">
            {[
              'React/Next.js ZIP upload',
              'Screenshot-assisted conversion',
              'Elementor Free/Pro output',
            ].map((feature) => (
              <div key={feature} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-300">Pipeline</span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300">Ready</span>
            </div>
            <div className="mt-6 space-y-5">
              {[
                ['Source upload', 'React ZIP + screenshots', 'Complete'],
                ['Conversion settings', 'Elementor Pro / WordPress', 'Configured'],
                ['Processing', 'Backend validation in progress', 'Queued'],
              ].map(([label, detail, status]) => (
                <div key={label} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-300">{label}</p>
                      <p className="mt-1 text-sm font-medium text-white">{detail}</p>
                    </div>
                    <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-200">{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: 'Upload any supported source',
            description: 'ZIP archives, screenshots, and supported design-spec inputs feed the backend pipeline without exposing unsafe code to the browser.',
          },
          {
            icon: ShieldCheck,
            title: 'Secure review process',
            description: 'Conversion diagnostics, alerts, and artifact downloads stay tied to backend-validated permissions and session state.',
          },
          {
            icon: CheckCircle2,
            title: 'Operational visibility',
            description: 'Track stage history, warnings, and export readiness from one dashboard without guessing at conversion status.',
          },
        ].map(({ icon: Icon, title, description }) => (
          <article key={title} className="card">
            <div className="inline-flex rounded-xl bg-brand-50 p-3 text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6">{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
