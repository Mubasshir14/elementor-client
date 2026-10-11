import Link from 'next/link';
import { ArrowLeft, Download, ShieldAlert } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/shared/EmptyState';

const review = { warnings: 1, unsupportedFeatures: ['CSS pagination effects'], outputSummary: 'Elementor package ready for download.' };

export default function ConversionReviewPage({ params }: { params: { conversionId: string } }) {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/conversions/${params.conversionId}`} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Review</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Conversion validation</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Validation results</h3>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Warnings: {review.warnings}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {review.unsupportedFeatures.map((item) => (
                  <li key={item} className="list-disc pl-5">{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card">
            <h3 className="text-xl font-semibold text-slate-900">Artifact summary</h3>
            <p className="mt-3 text-sm text-slate-600">{review.outputSummary}</p>
            <button className="btn-primary mt-5">
              <Download className="mr-2 h-4 w-4" /> Download package
            </button>
          </section>
        </div>

        <EmptyState title="No validated artifact available" description="Once the backend generates the output package, it will be displayed here for review and export." />
      </div>
    </AppLayout>
  );
}
