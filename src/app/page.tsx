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
import type { StudyPlanResponse, AnalysisBlock } from '@/types/studyplan';

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

  /* TIMER */
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

  /* POLLING */
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
        }
      } catch {}
    }, pollInterval);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fileId, status, analysisStatus]);

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

  /* FILE UPLOAD + ANALYSIS */
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);

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

        /** BACKEND NOW RETURNS analysis DIRECTLY */
        const analysisBlock = res.analysis ?? res; // fallback if backend sends flat structure

        if (!analysisBlock.document_type) {
          console.error('Bad analysis:', res);
          throw new Error('Malformed analysis data');
        }

        setAnalysis(analysisBlock);

        const rec =
          analysisBlock.recommended_days && analysisBlock.recommended_days > 0
            ? analysisBlock.recommended_days
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

  /* GENERATE PLAN */
  const handleGenerate = async () => {
    if (!fileId) return;

    try {
      setError(null);
      setStatus('generating');

      const generated = await generatePlan(fileId, days, planLanguage);

      if (!generated.plan || !Array.isArray(generated.plan.days)) {
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

  /* PDF */
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

  /* UI LABELS */
  const dots = useDots();
  const statusKey = analysisStatus || status || 'idle';
  const baseLabel = STATUS_LABELS[statusKey] || statusKey;
  const showDots = !['ready', 'error', 'idle'].includes(statusKey);
  const uiLabel = showDots ? `${baseLabel}${dots}` : baseLabel;

  /* UI */
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">
            LearnScaffold <span className="text-xs text-slate-400">MVP</span>
          </div>
          <div className="text-xs text-slate-400">Interface v0.8.2</div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
          <h1 className="text-2xl font-semibold">Upload a textbook or video</h1>
          <p className="mt-2 text-sm text-slate-300">
            After upload, the file will be automatically analyzed.
          </p>

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

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

          {fileId && (
            <p className="mt-2 text-[11px] text-slate-500">
              File ID: <span className="font-mono">{fileId}</span>
            </p>
          )}
        </section>

        {analysis && (
          <section className="mt-6 rounded-3xl border border-sky-500/30 bg-sky-950/30 p-6">
            <h2 className="text-lg font-semibold">Learning plan settings</h2>

            <div className="mt-3 text-sm">
              <p>Document type: {analysis.document_type}</p>
              <p>Language: {analysis.document_language}</p>
              <p>Main topics: {(analysis.main_topics || []).join(', ')}</p>
              <p>Recommended days: {recommendedDays}</p>
            </div>

            <div className="mt-4">
              <label className="text-xs">Days</label>
              <input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="ml-3 rounded bg-slate-900 px-2"
              />
            </div>

            <div className="mt-4">
              <label className="text-xs">Plan language</label>
              <LanguageSelector
                value={planLanguage}
                onChange={setPlanLanguage}
                original={analysis.document_language}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isBusy || !fileId}
              className="mt-4 rounded bg-emerald-500 px-4 py-2 text-black"
            >
              {status === 'generating' ? 'Generating…' : 'Generate plan'}
            </button>
          </section>
        )}

        {plan && (
          <section className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-6">
            <StudyPlanViewer analysis={plan.analysis} plan={plan.plan} />
          </section>
        )}

        {plan && (
          <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-base font-semibold">Editable text</h2>

            <textarea
              className="mt-3 h-80 w-full rounded-2xl bg-white p-4 text-black"
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
            />

            <button
              onClick={handleDownloadPdf}
              disabled={!editableText.trim() || isDownloading}
              className="mt-3 rounded bg-emerald-500 px-4 py-2 text-black"
            >
              {isDownloading ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------
   Helper
--------------------------------------------------------- */

function planToText(plan: StudyPlanResponse): string {
  return JSON.stringify(plan, null, 2);
}
