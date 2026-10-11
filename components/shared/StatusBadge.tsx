import clsx from 'clsx';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
        {
          'bg-slate-100 text-slate-700': tone === 'neutral',
          'bg-emerald-100 text-emerald-700': tone === 'success',
          'bg-amber-100 text-amber-700': tone === 'warning',
          'bg-rose-100 text-rose-700': tone === 'error',
          'bg-brand-100 text-brand-700': tone === 'info',
        },
      )}
    >
      {label}
    </span>
  );
}
