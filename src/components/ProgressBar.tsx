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

  // анимация точек только для extract/analyze
  const showDots =
    status && (status.includes('Extract') || status.includes('Analyz'));

  return (
    <div className="w-full">
      {status && (
        <div className="mb-1 text-[11px] text-slate-400 flex items-center gap-1">
          <span className="inline-block w-[180px] text-left truncate">
            {status}
          </span>

          {showDots && (
            <span className="inline-block w-[16px] text-left">{dots}</span>
          )}

          {pct > 0 && <span className="opacity-70">· {pct}%</span>}
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
