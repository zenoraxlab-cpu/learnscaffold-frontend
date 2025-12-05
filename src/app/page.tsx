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
   MAIN COMPONENT
--------------------------------------------------------- */

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'analyzing' | 'generating' | 'ready' | 'error'
  >('idle');

  const [error, setError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisBlock | null>(null);
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

  /* ---------------------------------------------------------
     TIMER
  --------------------------------------------------------- */

  useEffect(() => {
    if (status !== 'generating') return;
    setElapsedSeconds(0);

    const timer = setInterval(() => {
      setElapsedSeconds((x) => x + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  /* ---------------------------------------------------------
     POLLING STATUS
  --------------------------------------------------------- */

  useEffect(() => {
    if (!fileId || status !== 'analyzing') return;

    const interval = setInterval(async () => {
      try {
        const st = await getAnalysisStatus(fileId);

        if (st?.status) {
          setAnalysisStatus(st.status);

          if (STATUS_PROGRESS_MAP[st.status] !== undefined) {
            setAnalysisProgress((p) =>
              Math.max(p, STATUS_PROGRESS_MAP[st.status]),
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
      } catch (err) {
        console.error(err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fileId, status]);

  /* ---------------------------------------------------------
     SMOOTH PROGRESS BAR FILL
  --------------------------------------------------------- */

  useEffect(() => {
    if (status !== 'analyzing') return;

    const timer = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(prev + 2, 85));
    }, 700);

    return () => clearInterval(timer);
  }, [status]);

  /* ---------------------------------------------------------
     UPLOAD + ANALYSIS
  --------------------------------------------------------- */

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setPlan(null);
    setAnalysis(null);
    setFileId(null);
    setEditableText('');
    setAnalysisStatus('uploading');

    try {
      setStatus('uploading');
      setAnalysisProgress(5);

      const up = await uploadStudyFile(file);
      setFileId(up.file_id);

      setStatus('analyzing');
      setAnalysisStatus('uploaded');
      setAnalysisProgress(10);

      const res = await analyze(up.file_id);

      setAnalysis(res.analysis);
      setDays(res.analysis.recommended_days || 7);

      setStatus('idle');
    } catch (err) {
      console.error(err);
      setError('Error during analysis');
      setStatus('error');
    }
  };

  /* ---------------------------------------------------------
     GENERATE PLAN
  --------------------------------------------------------- */

  const handleGenerate = async () => {
    if (!fileId) return;

    try {
      setStatus('generating');
      setError(null);

      const generated = await generatePlan(fileId, days, planLanguage);

      if (!generated.plan?.days) throw new Error('Bad plan format');

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
     DOWNLOAD PDF
  --------------------------------------------------------- */

  const handleDownloadPdf = async () => {
    if (!editableText.trim() || !fileId) return;

    setIsDownloading(true);

    try {
      const blob = await downloadPlanPdf(editableText, fileId, days);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `learnscaffold-plan-${days}-days.pdf`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('PDF error');
    } finally {
      setIsDownloading(false);
    }
  };

  /* ---------------------------------------------------------
     STATUS LABEL (with dots)
  --------------------------------------------------------- */

  const dots = useDots();
  const baseLabel = STATUS_LABELS[analysisStatus || status] || '...';
  const uiLabel =
    ['idle', 'ready', 'error'].includes(status) ||
    (analysisStatus && ['ready', 'error'].includes(analysisStatus))
      ? baseLabel
      : baseLabel + dots;

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-8 flex justify-between text-sm">
          <strong>LearnScaffold MVP</strong>
          <span className="text-slate-400">v0.8.1</span>
        </header>

        {/* ================== UPLOAD ================== */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold">Upload a textbook or video</h1>

          <div className="mt-6">
            <FileDropzone
              onFileUpload={(file) => {
                if (!isBusy) handleFileSelected(file);
              }}
            />
          </div>

          {(status === 'uploading' || status === 'analyzing') && (
            <div className="mt-4">
              <ProgressBar progress={analysisProgress} status={uiLabel} />
            </div>
          )}

          {error && <p className="text-red-400 mt-3 text-xs">{error}</p>}
        </section>

        {/* ================== ANALYSIS ================== */}
        {analysis && (
          <section className="mt-6 rounded-3xl border border-sky-500/30 bg-sky-950/30 p-6">
            <h2 className="text-lg font-semibold">Learning plan settings</h2>

            <div className="mt-3">
              <p className="text-sm">Document type: {analysis.document_type}</p>
              <p className="text-sm">Level: {analysis.level}</p>
            </div>

            <div className="mt-4">
              <label className="text-xs uppercase text-slate-300">
                Lessons count
              </label>
              <input
                type="number"
                className="mt-1 w-20 rounded bg-slate-900 border px-3 py-1"
                value={days}
                min={1}
                max={90}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
              />
            </div>

            <div className="mt-4">
              <label className="text-xs uppercase text-slate-300">
                Plan language
              </label>
              <LanguageSelector
                value={planLanguage}
                original={analysis.language || "en"}
                onChange={(l) => setPlanLanguage(l)}
              />
            </div>

            <button
              className="mt-6 rounded-full border border-emerald-400 bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-900"
              disabled={isBusy || !fileId}
              onClick={handleGenerate}
            >
              Generate plan
            </button>
          </section>
        )}

        {/* ================== FINAL PLAN ================== */}
        {plan?.plan?.days && (
          <section className="mt-6">
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-6">
              <h2 className="text-lg font-semibold">Day-by-day structure</h2>
              <div className="mt-4 bg-black/20 rounded-2xl p-4">
                <StudyPlanViewer analysis={plan.analysis} plan={plan.plan} />
              </div>
            </div>

            <div className="mt-4 rounded-3xl border bg-white/5 p-6">
              <textarea
                className="w-full h-80 bg-white text-black p-4 rounded-xl"
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
              />

              <button
                className="mt-3 rounded-full bg-emerald-500 text-black px-4 py-2 text-xs font-bold"
                disabled={!editableText || !fileId || isDownloading}
                onClick={handleDownloadPdf}
              >
                {isDownloading ? 'Generating PDF…' : 'Download PDF'}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------
   PLAN → TEXT
--------------------------------------------------------- */

function formatPagesForText(pages?: number[]) {
  if (!pages?.length) return null;
  const min = Math.min(...pages);
  const max = Math.max(...pages);
  return min === max ? `p. ${min}` : `pp. ${min}–${max}`;
}

function planToText(plan: StudyPlanResponse): string {
  const out: string[] = [];

  out.push(`Learning plan · ${plan.days} days`);
  out.push('');

  for (const day of plan.plan.days) {
    out.push(`Day ${day.day_number}. ${day.title}`);

    const pages = formatPagesForText(day.source_pages);
    if (pages) out.push(`Pages: ${pages}`);

    if (day.goals) {
      out.push('');
      out.push('Goals');
      day.goals.forEach((g) => out.push(`- ${g}`));
    }

    if (day.theory) {
      out.push('');
      out.push('Theory');
      out.push(day.theory);
    }

    if (day.practice) {
      out.push('');
      out.push('Practice');
      day.practice.forEach((p) => out.push(`- ${p}`));
    }

    out.push('');
    out.push('---');
    out.push('');
  }

  return out.join('\n');
}
