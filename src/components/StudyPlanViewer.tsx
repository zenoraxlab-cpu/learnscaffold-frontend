"use client";

import React from "react";
import type { PlanDay } from "@/types/studyplan";

interface Props {
  plan: {
    days: PlanDay[];
  };
}

export default function StudyPlanViewer({ plan }: Props) {
  if (!plan || !Array.isArray(plan.days)) {
    return (
      <div className="text-sm text-red-300">
        Invalid plan structure
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plan.days.map((day, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <h3 className="font-semibold text-emerald-300">
            Day {day.day_number}: {day.title}
          </h3>

          {/* Goals */}
          {Array.isArray(day.goals) && day.goals.length > 0 && (
            <div className="mt-2">
              <p className="text-xs uppercase text-white/40">Goals</p>
              <ul className="ml-4 list-disc text-sm text-white/80">
                {day.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Theory */}
          {day.theory && (
            <div className="mt-2">
              <p className="text-xs uppercase text-white/40">Theory</p>
              <p className="text-sm text-white/80 whitespace-pre-line">
                {day.theory}
              </p>
            </div>
          )}

          {/* Practice */}
          {Array.isArray(day.practice) && day.practice.length > 0 && (
            <div className="mt-2">
              <p className="text-xs uppercase text-white/40">Practice</p>
              <ul className="ml-4 list-disc text-sm text-white/80">
                {day.practice.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          {day.summary && (
            <div className="mt-2">
              <p className="text-xs uppercase text-white/40">Summary</p>
              <p className="text-sm text-white/80 whitespace-pre-line">
                {day.summary}
              </p>
            </div>
          )}

          {/* Quiz */}
          {Array.isArray(day.quiz) && day.quiz.length > 0 && (
            <div className="mt-2">
              <p className="text-xs uppercase text-white/40">Quiz</p>
              <ul className="ml-4 list-disc text-sm text-white/80">
                {day.quiz.map((q, i) => (
                  <li key={i}>
                    <strong>{q.q}</strong>
                    <br />
                    {q.a}
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
