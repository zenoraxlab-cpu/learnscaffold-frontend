'use client';

import React from 'react';
import type { AnalysisBlock, PlanBlock, PlanDay } from '@/types/studyplan';

interface Props {
  analysis: AnalysisBlock | null | undefined;
  plan: PlanBlock | null | undefined;
}

export default function StudyPlanViewer({ analysis, plan }: Props) {
  // SAFETY CHECKS — never crash
  if (!analysis) {
    return (
      <div className="text-sm text-slate-400">
        No analysis data available.
      </div>
    );
  }

  if (!plan || !Array.isArray(plan.days)) {
    return (
      <div className="text-sm text-slate-400">
        No valid plan data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document meta */}
      <div className="rounded-xl bg-slate-800/40 p-4 text-sm">
        <p>
          <span className="text-sky-300">Document type:</span>{' '}
          {analysis.document_type || 'unknown'}
        </p>

        <p>
          <span className="text-sky-300">Level:</span>{' '}
          {analysis.level || 'unknown'}
        </p>

        {Array.isArray(analysis.main_topics) && (
          <p>
            <span className="text-sky-300">Main topics:</span>{' '}
            {analysis.main_topics.join(', ')}
          </p>
        )}
      </div>

      {/* Days list */}
      <div className="space-y-4">
        {plan.days.map((day: PlanDay) => (
          <div
            key={day.day_number}
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-4"
          >
            <h3 className="text-base font-semibold text-emerald-300">
              Day {day.day_number}: {day.title}
            </h3>

            {day.source_pages && day.source_pages.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Pages: {day.source_pages.join(', ')}
              </p>
            )}

            {day.goals && day.goals.length > 0 && (
              <div className="mt-3">
                <p className="text-xs uppercase text-sky-300">Goals</p>
                <ul className="list-disc pl-5 text-sm">
                  {day.goals.map((g, idx) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

            {day.theory && (
              <div className="mt-3">
                <p className="text-xs uppercase text-sky-300">Theory</p>
                <p className="text-sm whitespace-pre-line">{day.theory}</p>
              </div>
            )}

            {day.practice && day.practice.length > 0 && (
              <div className="mt-3">
                <p className="text-xs uppercase text-sky-300">Practice</p>
                <ul className="list-disc pl-5 text-sm">
                  {day.practice.map((task, idx) => (
                    <li key={idx}>{task}</li>
                  ))}
                </ul>
              </div>
            )}

            {day.summary && (
              <div className="mt-3">
                <p className="text-xs uppercase text-sky-300">Daily summary</p>
                <p className="text-sm whitespace-pre-line">{day.summary}</p>
              </div>
            )}

            {day.quiz && day.quiz.length > 0 && (
              <div className="mt-3">
                <p className="text-xs uppercase text-sky-300">Review questions</p>
                <ul className="list-disc pl-5 text-sm">
                  {day.quiz.map((q, idx) => (
                    <li key={idx}>
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
    </div>
  );
}
