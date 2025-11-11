import { ReactNode } from 'react';

type ActionCardProps = {
  title: string;
  description: string;
  actions: ReactNode;
};

export function ActionCard({ title, description, actions }: ActionCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-white/70 mt-2 max-w-xl">{description}</p>
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </div>
  );
}
