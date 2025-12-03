'use client';

import { useDots } from './useDots';

export default function ProgressBar({
  progress,
  status,
}: {
  progress: number;
  status?: string | null;
}) {
  const dots = useDots();
  const pct = Math.min(100, Math.max(0, progress));

  // Добавляем точки только если статус содержит слово "Extract"
  const animatedStatus =
    status && (status.includes('Extract') || status.includes('Analyz'))
      ? `${status}${dots}`
      : status;

  return (
    <div className="w-full">
      {animatedStatus && (
        <div className="mb-1 text-[11px] text-slate-400">
          {animatedStatus} {pct > 0 ? `· ${pct}%` : ''}
        </div>
      )}

      <div className="h-2 w-full rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
