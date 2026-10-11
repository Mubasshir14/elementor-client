import Link from 'next/link';
import { ArrowRight, Inbox } from 'lucide-react';

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-4 text-slate-500">
        <Inbox className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn-primary">
          {actionLabel} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
