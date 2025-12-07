'use client';

import React from 'react';

function formatPages(pages: number[]) {
  if (!pages || pages.length === 0) return '';

  if (pages.length === 1) return `Page ${pages[0]}`;

  const sorted = [...pages].sort((a, b) => a - b);

  const isRange = sorted.every((p, i) =>
    i === 0 ? true : p === sorted[i - 1] + 1,
  );

  if (isRange) {
    return `Pages ${sorted[0]}–${sorted[sorted.length - 1]}`;
  }

  return `Pages ${sorted.join(', ')}`;
}

export interface PlanDay {
  day_number: number;
  title: string;
  goals?: string[];
  theory?: string;
  practice?: string[];
  summary?: string;
  quiz?: { q: string; a: string }[];
  source_pages?: number[];
}

export interface Props {
  analysis?: any | null;
  plan: {
    days: PlanDay[];
  };
}

export default function StudyPlanViewer({ plan, analysis }: Props) {
  if (!plan || !Array.isArray(plan.days)) {
    return (
      <div className="text-red-400 text-sm">
        Invalid plan structure — missing plan.days
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Study plan</h3>
          {analysis && (
            <p className="mt-1 text-xs text-slate-400">
              {analysis.document_type || 'Document'}
              {analysis.document_language
                ? ` · ${analysis.document_language}`
                : ''}
              {analysis.recommended_days
                ? ` · ${analysis.recommended_days} days`
                : ''}
            </p>
          )}
        </div>
      </div>

      {/* Days as cards */}
      <div className="grid gap-4 md:grid-cols-1">
        {plan.days.map((day) => (
          <article
            key={day.day_number}
            className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 md:p-5"
          >
            <header className="flex items-baseline justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/40">
                  Day {day.day_number}
                </span>
                <h4 className="text-sm font-semibold text-slate-50">
                  {day.title}
                </h4>
              </div>

              {Array.isArray(day.source_pages) &&
                day.source_pages.length > 0 && (
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatPages(day.source_pages)}
                  </span>
                )}
            </header>

            {/* Goals */}
            {Array.isArray(day.goals) && day.goals.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Goals
                </div>
                <ul className="mt-1 list-disc ml-5 text-[13px] text-slate-200 space-y-1">
                  {day.goals.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Theory */}
            {typeof day.theory === 'string' && day.theory.trim().length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Theory
                </div>
                <p className="mt-1 text-[13px] text-slate-200 leading-snug">
                  {day.theory}
                </p>
              </div>
            )}

            {/* Practice */}
            {Array.isArray(day.practice) && day.practice.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Practice
                </div>
                <ul className="mt-1 list-disc ml-5 text-[13px] text-slate-200 space-y-1">
                  {day.practice.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {typeof day.summary === 'string' &&
              day.summary.trim().length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Daily summary
                  </div>
                  <p className="mt-1 text-[13px] text-slate-200 leading-snug">
                    {day.summary}
                  </p>
                </div>
              )}

            {/* Quiz */}
            {Array.isArray(day.quiz) && day.quiz.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Quiz
                </div>
                <ul className="mt-1 text-[13px] text-slate-200 space-y-2">
                  {day.quiz.map((q, i) => (
                    <li key={i}>
                      <strong>Q:</strong> {q.q}
                      <br />
                      <strong>A:</strong> {q.a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
