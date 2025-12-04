// force-rebuild-2025-12-05-01
// cache-bust-2025-12-05

'use client';

import { useState, useEffect } from 'react';
import { useDots } from '@/hooks/useDots';
import FileDropzone from '@/components/FileDropzone';
import LanguageSelector from '@/components/LanguageSelector';

import {
  uploadStudyFile,
  analyze,
  generatePlan,
  downloadPlanPdf,
  getAnalysisStatus,
} from '@/lib/api';

import StudyPlanViewer from '@/components/StudyPlanViewer';
import ProgressBar from '@/components/ProgressBar';
import type {
  StudyPlanResponse,
  AnalysisBlock,
  PlanBlock,
} from '@/types/studyplan';

/* ---------------------------------------------------------
   BACKEND STATUS → PROGRESS MAP
--------------------------------------------------------- */

const STATUS_PROGRESS_MAP: Record<string, number> = {
  uploading: 5,
  uploaded: 10,
  analyzing: 20,
  extracting: 35,
  extracting_pages: 35,
  text_extracting: 50,
  extracting_text: 50,
  cleaning: 60,
  chunking: 70,
  classifying: 80,
  structure: 90,
  building_structure: 90,
  ready: 100,
  error: 100,
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  uploading: 'Uploading file',
  uploaded: 'File uploaded',
  analyzing: 'Analyzing document',
  extracting: 'Extracting pages',
  extracting_pages: 'Extracting pages',
  text_extracting: 'Extracting text',
  extracting_text: 'Extracting text',
  cleaning: 'Cleaning text',
  chunking: 'Chunking structure',
  classifying: 'Classifying sections',
  structure: 'Building structure',
  building_structure: 'Building structure',
  ready: 'Analysis ready',
  error: 'Error',
};

/* ---------------------------------------------------------
   MAIN PAGE
--------------------------------------------------------- */

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'analyzing' | 'generating' | 'ready' | 'error'
  >('idle');

  const [error, setError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisBlock | null>(null);
  const [recommendedDays, setRecommendedDays] = useState<number | null>(null);
  const [days, setDays] = useState<number>(7);

  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [editableText, setEditableText] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [planLanguage, setPlanLanguage] = useState<string>('en');

  const isBusy =
    status === 'uploading' ||
    status === 'analyzing' ||
    status === 'generating';

  /* ---------------------------------------------------------
     GENERATION TIMER (FIXED CLEANUP)
  --------------------------------------------------------- */

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    if (status === 'generating') {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => {
      if (timer !== null) {
        clearInterval(timer);
      }
    };
  }, [status]);

  /* ---------------------------------------------------------
     POLLING BACKEND STATUS (FIXED CLEANUP)
  --------------------------------------------------------- */

  useEffect(() => {
    if (!fileId || status !== 'analyzing') return;

    const slowPhases = ['extracting', 'extracting_text', 'classifying'];
    const pollInterval = slowPhases.includes(analysisStatus || '')
      ? 3000
      : 2000;

    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;

      try {
        const st = await getAnalysisStatus(fileId);

        if (st?.status) {
          setAnalysisStatus(st.status);

          if (STATUS_PROGRESS_MAP[st.status] !== undefined) {
            setAnalysisProgress((prev) =>
              Math.max(prev, STATUS_PROGRESS_MAP[st.status]),
            );
          }
        }

        if (st?.status === 'ready') {
          clearInterval(interval);
          setStatus('idle');
        }

        if (st?.status === 'error') {
          clearInterval(interval);
          setStatus('error');
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fileId, status, analysisStatus]);

  /* ---------------------------------------------------------
     SOFT PROGRESS BAR (FIXED CLEANUP)
  --------------------------------------------------------- */

  useEffect(() => {
    if (status !== 'analyzing') return;

    setAnalysisProgress((prev) => (prev < 5 ? 5 : prev));

    const timer = setInterval(() => {
      setAnalysisProgress((prev) => {
        const key = analysisStatus;
        const target =
          key && STATUS_PROGRESS_MAP[key] !== undefined
            ? STATUS_PROGRESS_MAP[key]
            : prev;

        if (target > prev) return target;
        if (!key || target < 85) return Math.min(prev + 2, 85);

        return prev;
      });
    }, 700);

    return () => {
      clearInterval(timer);
    };
  }, [status, analysisStatus]);

  /* ---------------------------------------------------------
     FILE UPLOAD & ANALYSIS
  --------------------------------------------------------- */

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);

    // Clear previous state
    setError(null);
    setPlan(null);
    setAnalysis(null);
    setFileId(null);
    setEditableText('');
    setRecommendedDays(null);
    setDays(7);
    setAnalysisStatus(null);
    setAnalysisProgress(0);
    setPlanLanguage('en');
    setStatus('idle');

    (async () => {
      try {
        setStatus('uploading');
        setAnalysisStatus('uploading');
        setAnalysisProgress(STATUS_PROGRESS_MAP.uploading);

        const uploadRes = await uploadStudyFile(file);
        setFileId(uploadRes.file_id);

        setAnalysisStatus('uploaded');
        setAnalysisProgress(STATUS_PROGRESS_MAP.uploaded);

        setStatus('analyzing');

        const res = await analyze(uploadRes.file_id);

        if (!res?.analysis || !res.analysis.document_type) {
          throw new Error('Malformed analysis data');
        }

        setAnalysis(res.analysis);

        const rec =
          res.analysis.recommended_days && res.analysis.recommended_days > 0
            ? res.analysis.recommended_days
            : 7;

        setRecommendedDays(rec);
        setDays(rec);

        setStatus('idle');
      } catch (err) {
        console.error(err);
        setError('Error during analysis');
        setStatus('error');
      }
    })();
  };

  /* ---------------------------------------------------------
     GENERATE PLAN — FIXED (VALIDATION + NO CRASH)
  --------------------------------------------------------- */

  const handleGenerate = async () => {
    if (!fileId) return;

    try {
      setError(null);
      setStatus('generating');

      const generated = await generatePlan(fileId, days, planLanguage);

      if (
        !generated ||
        !generated.plan ||
        !Array.isArray(generated.plan.days)
      ) {
        console.error('Invalid plan structure:', generated);
        setStatus('error');
        return;
      }

      setPlan(generated);
      setEditableText(planToText(generated));

      setStatus('ready');
    } catch (err) {
      console.error(err);
      setError('Error generating plan');
      setStatus('error');
    }
  };

  /* ---------------------------------------------------------
     PDF DOWNLOAD
  --------------------------------------------------------- */

  const handleDownloadPdf = async () => {
    if (!editableText.trim() || !fileId) return;

    try {
      setIsDownloading(true);

      const blob = await downloadPlanPdf(editableText, fileId, days);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `learnscaffold-plan-${days}-days.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Error downloading PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  /* ---------------------------------------------------------
     UI LABELS
  --------------------------------------------------------- */

  const dots = useDots();
  const statusKey = analysisStatus || status || 'idle';
  const baseLabel = STATUS_LABELS[statusKey] || statusKey;
  const showDots = !['ready', 'error', 'idle'].includes(statusKey);
  const uiLabel = showDots ? `${baseLabel}${dots}` : baseLabel;

  /* ---------------------------------------------------------
     UI COMPOSITION
  --------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">
            LearnScaffold <span className="text-xs text-slate-400">MVP</span>
          </div>
          <div className="text-xs text-slate-400">Test interface · v0.8</div>
        </header>

        <Stepper selectedFile={selectedFile} analysis={analysis} plan={plan} />

        <UploadSection
          status={status}
          analysisStatus={analysisStatus}
          analysisProgress={analysisProgress}
          error={error}
          fileId={fileId}
          isBusy={isBusy}
          handleFileSelected={handleFileSelected}
          uiLabel={uiLabel}
        />

        {analysis && (
          <AnalysisSection
            analysis={analysis}
            recommendedDays={recommendedDays}
            setDays={setDays}
            days={days}
            planLanguage={planLanguage}
            setPlanLanguage={setPlanLanguage}
            status={status}
            fileId={fileId}
            isBusy={isBusy}
            onGenerate={handleGenerate}
            generationProgress={Math.min(
              0.95,
              elapsedSeconds / Math.max(20, days * 5),
            )}
            remainingSeconds={Math.max(
              0,
              Math.round(Math.max(20, days * 5) - elapsedSeconds),
            )}
          />
        )}

        {plan && plan.plan && Array.isArray(plan.plan.days) && (
          <FinalPlanSection
            plan={plan}
            editableText={editableText}
            setEditableText={setEditableText}
            isBusy={isBusy}
            isDownloading={isDownloading}
            onDownload={handleDownloadPdf}
            fileId={fileId}
          />
        )}

        <footer className="mt-auto pt-8 text-xs text-slate-500">
          © {new Date().getFullYear()} LearnScaffold. Internal prototype.
        </footer>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------
   SUPPORTING UI COMPONENTS  
--------------------------------------------------------- */

interface StepperProps {
  selectedFile: File | null;
  analysis: AnalysisBlock | null;
  plan: StudyPlanResponse | null;
}

function Stepper({ selectedFile, analysis, plan }: StepperProps) {
  return (
    <div className="mb-6 flex items-center gap-3 text-xs text-slate-300">
      <StepBadge active number={1} label="Upload file" />
      <StepLine active={!!selectedFile} />
      <StepBadge active={!!analysis} number={2} label="Analysis & settings" />
      <StepLine active={!!plan} />
      <StepBadge active={!!plan} number={3} label="Learning plan" />
    </div>
  );
}

interface UploadSectionProps {
  status: string;
  analysisStatus: string | null;
  analysisProgress: number;
  error: string | null;
  fileId: string | null;
  isBusy: boolean;
  handleFileSelected: (file: File) => void;
  uiLabel: string;
}

function UploadSection({
  status,
  analysisStatus,
  analysisProgress,
  error,
  fileId,
  isBusy,
  handleFileSelected,
  uiLabel,
}: UploadSectionProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
      <h1 className="text-2xl font-semibold tracking-tight">
        Upload a textbook or video
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        After upload, the file will be automatically analyzed.
      </p>

      <div className="mt-6">
        <FileDropzone onFileSelected={isBusy ? undefined : handleFileSelected} />
      </div>

      {(status === 'uploading' || status === 'analyzing') && (
        <div className="mt-4">
          <ProgressBar progress={analysisProgress} status={uiLabel} />
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {fileId && (
        <p className="mt-2 text-[11px] text-slate-500">
          File ID: <span className="font-mono">{fileId}</span>
        </p>
      )}
    </section>
  );
}

interface AnalysisSectionProps {
  analysis: AnalysisBlock;
  recommendedDays: number | null;
  setDays: (value: number) => void;
  days: number;
  planLanguage: string;
  setPlanLanguage: (lang: string) => void;
  status: string;
  fileId: string | null;
  isBusy: boolean;
  onGenerate: () => void;
  generationProgress: number;
  remainingSeconds: number;
}

function AnalysisSection({
  analysis,
  recommendedDays,
  setDays,
  days,
  planLanguage,
  setPlanLanguage,
  status,
  fileId,
  isBusy,
  onGenerate,
  generationProgress,
  remainingSeconds,
}: AnalysisSectionProps) {
  const dots = useDots();

  return (
    <section className="mt-6 rounded-3xl border border-sky-500/30 bg-sky-950/30 p-6">
      <p className="text-xs uppercase tracking-wide text-sky-300/80">
        Document analysis
      </p>
      <h2 className="mt-1 text-lg font-semibold">Learning plan settings</h2>

      <div className="mt-3 grid gap-4 text-sm text-slate-100 md:grid-cols-2">
        <div>
          <LabelBlock title="Document type">{analysis.document_type}</LabelBlock>
          <LabelBlock title="Level">{analysis.level}</LabelBlock>

          {analysis.main_topics?.length > 0 && (
            <LabelBlock title="Main topics">
              {analysis.main_topics.join(', ')}
            </LabelBlock>
          )}
        </div>

        <div>
          <LabelBlock title="Recommended number of days">
            {recommendedDays
              ? `${recommendedDays} days (model estimate)`
              : 'no estimate — using default'}
          </LabelBlock>

          <div className="mt-4 text-[11px] uppercase tracking-wide text-sky-300/80">
            Lessons count
          </div>

          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) =>
                setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))
              }
              className="w-20 rounded-full border border-sky-400 bg-slate-950 px-3 py-1 text-sm text-slate-50 outline-none focus:border-emerald-400"
            />
            <span className="text-xs text-slate-300">days</span>
          </div>

          <div className="mt-6">
            <LabelBlock title="Plan language" />
            <LanguageSelector
              value={planLanguage}
              onChange={(lang) => setPlanLanguage(lang)}
            />
          </div>

          {status === 'generating' && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Generating learning plan{dots}</span>
                <span>
                  {remainingSeconds > 0
                    ? `${remainingSeconds}s left`
                    : 'finalizing…'}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.round(generationProgress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {analysis.summary && (
        <LabelBlock title="Short description" className="mt-4">
          {analysis.summary}
        </LabelBlock>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!fileId || isBusy}
          className={[
            'rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wide',
            !fileId || isBusy
              ? 'cursor-not-allowed border border-slate-600 bg-slate-800 text-slate-500'
              : 'border border-emerald-400 bg-emerald-500 text-slate-950 hover:bg-emerald-400',
          ].join(' ')}
        >
          {status === 'generating' ? `Generating${dots}` : 'Generate learning plan'}
        </button>
      </div>
    </section>
  );
}

interface FinalPlanSectionProps {
  plan: StudyPlanResponse;
  editableText: string;
  setEditableText: (text: string) => void;
  isBusy: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  fileId: string | null;
}

function FinalPlanSection({
  plan,
  editableText,
  setEditableText,
  isBusy,
  isDownloading,
  onDownload,
  fileId,
}: FinalPlanSectionProps) {
  return (
    <>
      <section className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-6">
        <p className="text-xs uppercase tracking-wide text-emerald-300/80">
          Final plan
        </p>

        <h2 className="mt-1 text-lg font-semibold">Day-by-day structure</h2>

        <div className="mt-4 rounded-2xl bg-black/20 p-4">
          <StudyPlanViewer analysis={plan.analysis} plan={plan.plan} />
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-base font-semibold">Editable learning plan text</h2>

        <textarea
          className="mt-3 h-80 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          value={editableText}
          onChange={(e) => setEditableText(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDownload}
            disabled={
              !editableText.trim() || !fileId || isBusy || isDownloading
            }
            className={[
              'rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wide',
              !editableText.trim() || !fileId || isBusy || isDownloading
                ? 'cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-500'
                : 'border-emerald-500 bg-emerald-500 text-slate-950 hover:bg-emerald-400',
            ].join(' ')}
          >
            {isDownloading ? 'Generating PDF...' : 'Download PDF'}
          </button>

          <p className="text-[11px] text-slate-500">
            PDF is generated from this text (including your edits)
          </p>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------
   COMMON UI BLOCKS
--------------------------------------------------------- */

interface LabelBlockProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

function LabelBlock({ title, children, className = '' }: LabelBlockProps) {
  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-wide text-sky-300/80">
        {title}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

interface StepBadgeProps {
  active: boolean;
  number: number;
  label: string;
}

function StepBadge({ active, number, label }: StepBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
          active
            ? 'border-emerald-400 bg-emerald-500 text-slate-950'
            : 'border-slate-600 bg-slate-900 text-slate-400',
        ].join(' ')}
      >
        {number}
      </div>
      <span className={active ? 'text-xs text-slate-100' : 'text-xs text-slate-500'}>
        {label}
      </span>
    </div>
  );
}

interface StepLineProps {
  active: boolean;
}

function StepLine({ active }: StepLineProps) {
  return (
    <div
      className={
        'h-px flex-1 rounded-full ' +
        (active ? 'bg-emerald-400/80' : 'bg-slate-700')
      }
    />
  );
}

/* ---------------------------------------------------------
   PLAN → TEXT (FIXED practice line)
--------------------------------------------------------- */

function formatPagesForText(pages?: number[]): string | null {
  if (!pages || pages.length === 0) return null;

  const minPage = Math.min(...pages);
  const maxPage = Math.max(...pages);

  if (minPage === maxPage) return `p. ${minPage}`;
  return `pp. ${minPage}–${maxPage}`;
}

function planToText(plan: StudyPlanResponse): string {
  const lines: string[] = [];

  lines.push(`Learning plan · ${plan.days} days`);
  lines.push(`File ID: ${plan.file_id}`);
  lines.push('');

  lines.push(
    `Document type: ${plan.analysis.document_type}, level: ${plan.analysis.level}`
  );

  if (plan.analysis.main_topics?.length) {
    lines.push(`Main topics: ${plan.analysis.main_topics.join(', ')}`);
  }

  if (plan.analysis.summary) {
    lines.push('');
    lines.push(plan.analysis.summary);
  }

  lines.push('');

  for (const day of plan.plan.days) {
    lines.push(`Day ${day.day_number}. ${day.title}`);

    const pagesLabel = formatPagesForText(day.source_pages);
    if (pagesLabel) lines.push(`Pages: ${pagesLabel}`);
    lines.push('');

    if (day.goals?.length) {
      lines.push('Goals');
      day.goals.forEach((g) => lines.push(`- ${g}`));
      lines.push('');
    }

    if (day.theory) {
      lines.push('Theory');
      lines.push(day.theory);
      lines.push('');
    }

    if (day.practice?.length) {
      lines.push('Practice');
      day.practice.forEach((p) => lines.push(`- ${p}`)); // FIXED
      lines.push('');
    }

    if (day.summary) {
      lines.push('Daily summary');
      lines.push(day.summary);
      lines.push('');
    }

    if (day.quiz?.length) {
      lines.push('Review questions');
      day.quiz.forEach((q) => {
        lines.push(`Question: ${q.q}`);
        lines.push(`Answer: ${q.a}`);
        lines.push('');
      });
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
