// force rebuild 2025-12-08

'use client';

import { useState, useEffect } from 'react';
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
import type { StudyPlanResponse } from '@/types/studyplan';

/* ---------------------------------------------------------
   USER-FRIENDLY ERROR
--------------------------------------------------------- */
const USER_FRIENDLY_ERROR =
  'This document requires extended manual processing. You will receive the result by email.';

/* ---------------------------------------------------------
   UNIVERSAL ERROR POPUP (toast)
--------------------------------------------------------- */
const ErrorPopup = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-start gap-3 max-w-xs text-sm">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white font-bold text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

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
  const [delayedMessage, setDelayedMessage] = useState<string | null>(null);

  const [fileId, setFileId] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<any | null>(null);
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
    status === 'uploading' || status === 'analyzing' || status === 'generating';

  /* TIMER FOR GENERATING */
  useEffect(() => {
    let timer: any = null;

    if (status === 'generating') {
      setElapsedSeconds(0);
      timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      setElapsedSeconds(0);
    }

    return () => timer && clearInterval(timer);
  }, [status]);

  /* POLLING BACKEND STATUS */
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
        const st = await getAnalysisStatus(fileId, planLanguage);

        if (st?.status) {
          setAnalysisStatus(st.status);

          const mapped = STATUS_PROGRESS_MAP[st.status];
          if (mapped !== undefined) {
            setAnalysisProgress((prev) => Math.max(prev, mapped));
          }
        }

        if (st?.status === 'ready') {
          clearInterval(interval);
          setStatus('idle');
        }

        if (st?.status === 'error') {
          clearInterval(interval);
          setStatus('error');
          setError(USER_FRIENDLY_ERROR);
        }
      } catch {
        // тихо игнорируем
      }
    }, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fileId, status, analysisStatus, planLanguage]);

  /* SMOOTH PROGRESS BAR */
  useEffect(() => {
    if (status !== 'analyzing') return;

    setAnalysisProgress((p) => (p < 5 ? 5 : p));

    const timer = setInterval(() => {
      setAnalysisProgress((prev) => {
        const key = analysisStatus;
        const target = STATUS_PROGRESS_MAP[key || ''] ?? prev;

        if (target > prev) return target;
        if (!key || target < 85) return Math.min(prev + 2, 85);

        return prev;
      });
    }, 700);

    return () => clearInterval(timer);
  }, [status, analysisStatus]);

  /* FILE UPLOAD */
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);

    setError(null);
    setDelayedMessage(null);
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
        const analysisBlock = res.analysis ?? res;

        setAnalysis(analysisBlock);

        const rec =
          analysisBlock?.recommended_days && analysisBlock.recommended_days > 0
            ? analysisBlock.recommended_days
            : 7;

        setRecommendedDays(rec);
        setDays(rec);

        setStatus('idle');
      } catch (err) {
        console.error(err);
        setError(USER_FRIENDLY_ERROR);
        setStatus('error');
      }
    })();
  };

  /* GENERATE PLAN */
  const handleGenerate = async () => {
    if (!fileId) return;

    try {
      setError(null);
      setDelayedMessage(null);
      setStatus('generating');

      const generated = await generatePlan(fileId, days, planLanguage);

      if (generated.status === 'delayed') {
        setDelayedMessage(generated.message);
        setStatus('idle');
        return;
      }

      if (!generated.plan || !Array.isArray(generated.plan.days)) {
        console.error('Invalid plan structure:', generated);
        setError(USER_FRIENDLY_ERROR);
        setStatus('error');
        return;
      }

      setPlan(generated);
      setEditableText(planToText(generated));
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setError(USER_FRIENDLY_ERROR);
      setStatus('error');
    }
  };

  /* PDF DOWNLOAD */
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
      setError(USER_FRIENDLY_ERROR);
    } finally {
      setIsDownloading(false);
    }
  };

  /* UI LABELS */
  const statusKey = analysisStatus || status || 'idle';
  const uiLabel = STATUS_LABELS[statusKey] || statusKey;

  /* UI */
  return (
    <>
      <ErrorPopup message={error} onClose={() => setError(null)} />

      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
          {/* HEADER */}
          <header className="mb-8 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold tracking-tight">
                LearnScaffold{' '}
                <span className="text-xs text-slate-400">MVP</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                AI-powered study plan generator
              </div>
            </div>
            <div className="text-xs text-slate-400">Interface v0.9.0</div>
          </header>

          {/* CARD: UPLOAD + STATUS */}
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">
                  Upload a textbook or video
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  The file will be analyzed automatically. You will then
                  configure your learning plan and export it.
                </p>
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                  {uiLabel}
                </span>

                {status === 'generating' && (
                  <span className="mt-1 text-[10px] text-slate-500">
                    Generating… {elapsedSeconds}s
                  </span>
                )}

                {delayedMessage && (
                  <span className="mt-2 text-[11px] text-yellow-400 max-w-xs text-right">
                    {delayedMessage}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6">
              <FileDropzone
                onFileSelected={isBusy ? undefined : handleFileSelected}
              />
            </div>

            {(status === 'uploading' || status === 'analyzing') && (
              <div className="mt-4">
                <ProgressBar progress={analysisProgress} status={uiLabel} />
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              {fileId && (
                <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 font-mono">
                  File ID: {fileId}
                </span>
              )}

              {selectedFile && (
                <span className="truncate rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1">
                  {selectedFile.name}
                </span>
              )}
            </div>
          </section>

          {/* DOCUMENT SUMMARY + GENERATE SETTINGS */}
          {analysis && (
            <section className="mt-6 grid gap-4 md:grid-cols-2">
              {/* DOCUMENT SUMMARY */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="text-sm font-semibold tracking-wide text-slate-100">
                  DOCUMENT SUMMARY
                </h2>

                <dl className="mt-3 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Type</dt>
                    <dd className="text-right">
                      {analysis.document_type || '—'}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Language</dt>
                    <dd className="text-right">
                      {analysis.document_language || '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-400">Main topics</dt>
                    <dd className="mt-1 text-[11px] leading-snug">
                      {Array.isArray(analysis.main_topics) &&
                      analysis.main_topics.length > 0
                        ? analysis.main_topics.join(', ')
                        : '—'}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Recommended days</dt>
                    <dd className="text-right">
                      {recommendedDays ?? analysis.recommended_days ?? '—'}
                    </dd>
                  </div>

                  {analysis.pages && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">Pages detected</dt>
                      <dd className="text-right">{analysis.pages}</dd>
                    </div>
                  )}
                </dl>

                {analysis.summary && (
                  <div className="mt-4 rounded-2xl bg-slate-950/60 p-3 text-[11px] text-slate-300">
                    <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                      Short description
                    </div>
                    <p className="line-clamp-5 leading-snug">
                      {analysis.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* GENERATE SETTINGS */}
              <div className="rounded-3xl border border-emerald-600/40 bg-emerald-950/20 p-5">
                <h2 className="text-sm font-semibold tracking-wide text-emerald-300">
                  GENERATE LEARNING PLAN
                </h2>

                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs text-slate-300">Days</label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-50 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs text-slate-300">
                      Plan language
                    </label>
                    <div className="flex-1 text-right">
                      <LanguageSelector
                        value={planLanguage}
                        onChange={setPlanLanguage}
                        original={analysis.document_language}
                      />
                    </div>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Recommended days:{' '}
                    <span className="text-slate-200">
                      {recommendedDays ?? analysis.recommended_days ?? '—'}
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isBusy || !fileId}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'generating' ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border border-black border-b-transparent" />
                      Generating…
                    </>
                  ) : (
                    'Generate plan'
                  )}
                </button>

                {delayedMessage && (
                  <p className="mt-3 text-xs text-yellow-400">
                    {delayedMessage}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* STUDY PLAN RESULT */}
          {plan && (
            <section className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5">
              <StudyPlanViewer analysis={analysis} plan={plan.plan} />
            </section>
          )}

          {/* EDITOR + PDF */}
          {plan && (
            <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold tracking-wide text-slate-100">
                EDITABLE TEXT (EXPORT TO PDF)
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                You can modify the generated plan before exporting.
              </p>

              <textarea
                className="mt-3 h-72 w-full rounded-2xl bg-slate-950 p-4 text-xs text-slate-50 font-mono outline-none border border-slate-800 focus:border-emerald-500"
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
              />

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={handleDownloadPdf}
                  disabled={!editableText.trim() || isDownloading}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloading ? 'Generating PDF…' : 'Download PDF'}
                </button>
                <span className="text-[10px] text-slate-500">
                  PDF will be generated from the edited text.
                </span>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

/* ---------------------------------------------------------
   Helper
--------------------------------------------------------- */
function planToText(plan: StudyPlanResponse): string {
  if (!plan?.plan?.days) return '';

  const out: string[] = [];

  for (const day of plan.plan.days) {
    out.push(`Day ${day.day_number} — ${day.title}`);

    if (day.goals?.length) {
      out.push(`\nGOALS:`);
      for (const g of day.goals) out.push(`• ${g}`);
    }

    if (day.theory) {
      out.push(`\nTHEORY:\n${day.theory}`);
    }

    if (day.practice?.length) {
      out.push(`\nPRACTICE:`);
      for (const p of day.practice) out.push(`• ${p}`);
    }

    if (day.summary) {
      out.push(`\nSUMMARY:\n${day.summary}`);
    }

    if (day.quiz?.length) {
      out.push(`\nQUIZ:`);
      for (const qa of day.quiz) {
        out.push(`Q: ${qa.q}`);
        out.push(`A: ${qa.a}`);
        out.push('');
      }
    }

    out.push(`----------------------------------------\n`);
  }

  return out.join('\n');
}
