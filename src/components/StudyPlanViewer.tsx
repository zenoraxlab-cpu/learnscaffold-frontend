'use client';

import React from 'react';

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
  analysis: any;
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Study Plan</h3>

        {analysis && (
          <p className="mt-1 text-xs text-slate-400">
            {analysis.document_type} · {analysis.level}
          </p>
        )}
      </div>

      {/* Day-by-day content */}
      {plan.days.map((day) => (
        <div
          key={day.day_number}
          className="rounded-xl border border-slate-600 bg-slate-900/30 p-4"
        >
          <h4 className="text-base font-semibold">
            Day {day.day_number}: {day.title}
          </h4>

          {/* Goals */}
          {day.goals?.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-300 uppercase">
                Goals
              </div>
              <ul className="list-disc ml-5 text-sm text-slate-200">
                {day.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Theory */}
          {day.theory && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-300 uppercase">
                Theory
              </div>
              <p className="text-sm text-slate-200 mt-1">{day.theory}</p>
            </div>
          )}

          {/* Practice */}
          {day.practice?.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-300 uppercase">
                Practice
              </div>
              <ul className="list-disc ml-5 text-sm text-slate-200">
                {day.practice.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          {day.summary && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-300 uppercase">
                Daily Summary
              </div>
              <p className="text-sm text-slate-200 mt-1">{day.summary}</p>
            </div>
          )}

          {/* Quiz */}
          {day.quiz?.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-300 uppercase">
                Quiz
              </div>
              <ul className="mt-1 text-sm text-slate-200 space-y-2">
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
        </div>
      ))}
    </div>
  );
}
