import type { StudyPlanResponse, PlanDay } from '@/types/studyplan';

type Props = {
  plan: StudyPlanResponse;
};

export default function StudyPlanViewer({ plan }: Props) {
  return (
    <div className="space-y-4">
      {plan.plan.days.map((day) => (
        <DayCard key={day.day_number} day={day} />
      ))}
    </div>
  );
}

function DayCard({ day }: { day: PlanDay }) {
  const pagesLabel = formatPages(day.source_pages);

  const goals = day.goals ?? [];
  const practice = day.practice ?? [];
  const quiz = day.quiz ?? [];

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-50">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">
            Day {day.day_number}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-50">
            {day.title}
          </h3>
        </div>

        {pagesLabel && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Pages in textbook
            </p>
            <p className="mt-1 text-[11px] text-emerald-200">
              {pagesLabel}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Open these pages in the PDF
            </p>
          </div>
        )}
      </header>

      {goals.length > 0 && (
        <Section title="Goals">
          <ul className="list-disc space-y-1 pl-5">
            {goals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </Section>
      )}

      {day.theory && (
        <Section title="Theory">
          <p className="leading-relaxed text-slate-100/90">{day.theory}</p>
        </Section>
      )}

      {practice.length > 0 && (
        <Section title="Practice">
          <ul className="list-disc space-y-1 pl-5">
            {practice.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Section>
      )}

      {day.summary && (
        <Section title="Daily summary">
          <p className="leading-relaxed text-slate-100/90">{day.summary}</p>
        </Section>
      )}

      {quiz.length > 0 && (
        <Section title="Review questions">
          <ul className="space-y-1">
            {quiz.map((q, i) => (
              <li key={i}>
                <span className="font-semibold">Question:</span> {q.q}
                <br />
                <span className="font-semibold">Answer:</span> {q.a}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
        {title}
      </h4>
      <div className="mt-1 text-[13px] text-slate-100">{children}</div>
    </section>
  );
}

function formatPages(pages?: number[]): string | null {
  if (!pages || pages.length === 0) return null;

  const minPage = Math.min(...pages);
  const maxPage = Math.max(...pages);

  if (minPage === maxPage) {
    return `p. ${minPage}`;
  }

  return `pp. ${minPage}–${maxPage}`;
}
