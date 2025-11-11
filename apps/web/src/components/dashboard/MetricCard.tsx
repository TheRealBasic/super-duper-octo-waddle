import { ReactNode } from 'react';

type MetricCardProps = {
  label: string;
  value: ReactNode;
  trendLabel?: string;
  trendValue?: string;
};

export function MetricCard({ label, value, trendLabel, trendValue }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 text-white shadow-lg">
      <p className="text-sm uppercase tracking-widest text-white/40">{label}</p>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      {trendLabel && trendValue && (
        <p className="mt-4 text-xs text-white/60">
          {trendLabel}: <span className="text-white">{trendValue}</span>
        </p>
      )}
    </div>
  );
}
