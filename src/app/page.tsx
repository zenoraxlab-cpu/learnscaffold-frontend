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
  extracting_text: 50,
  text_extracting: 50,
  cleaning: 60,
  chunking: 70,
  classifying: 80,
  structure: 90,
  building_structure: 90,
  ocr_running: 25,
  ocr_extracting: 40,
  ocr_complete: 55,
  ready: 100,
  error: 100,
};

/* ---------------------------------------------------------
   HUMAN-READABLE LABELS
--------------------------------------------------------- */

const STATUS_LABELS: Record<string, string> = {
  uploading: 'Uploading...',
  uploaded: 'File uploaded',
  analyzing: 'Analyzing document...',
  extracting: 'Extracting pages...',
  extracting_pages: 'Extracting pages...',
  extracting_text: 'Extracting text...',
  text_extracting: 'Extracting text...',
  cleaning: 'Cleaning text...',
  chunking: 'Splitting into chunks...',
  classifying: 'Classifying...',
  structure: 'Extracting structure...',
  building_structure: 'Extracting structure...',
  ocr_running: 'Running OCR...',
  ocr_extracting: 'Running OCR...',
  ocr_complete: 'OCR completed',
  ready: 'Analysis completed',
  error: 'Error',
};

/* ---------------------------------------------------------
   FINAL PLAN SECTION PROPS
--------------------------------------------------------- */

interface FinalPlanSectionProps {
  plan: StudyPlanResponse;
  analysis: AnalysisBlock | null;
  editableText: string;
  setEditableText: (text: string) => void;
  isBusy: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  fileId: string | null;
}

/* ---------------------------------------------------------
   FINAL PLAN SECTION
--------------------------------------------------------- */

function FinalPlanSection({
  plan,
  analysis,
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
          <StudyPlanViewer
            plan={{ days: plan?.plan?.days || [] }}
            analysis={analysis}
          />
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
   MAIN PAGE
--------------------------------------------------------- */

export default function HomePage() {
  const dots = useDots();

  const [fileId, setFileId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisBlock | null>(null);
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [days, setDays] = useState<number>(10);
  const [planLanguage, setPlanLanguage] = useState<string>('en');

  const [editableText, setEditableText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const progress = status ? STATUS_PROGRESS_MAP[status] || 0 : 0;
  const statusLabel = status ? STATUS_LABELS[status] || status : '';

  /* ---------------------------------------------------------
     POLLING
  --------------------------------------------------------- */

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (
      status === 'analyzing' ||
      status === 'extracting' ||
      status === 'ocr_running'
    ) {
      timer = setInterval(async () => {
        if (!fileId) return;
        const s = await getAnalysisStatus(fileId);
        if (s?.status) {
          setStatus(s.status);
          if (s.status === 'ready') clearInterval(timer!);
        }
      }, 1500);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, fileId]);

  /* ---------------------------------------------------------
     UPLOAD
  --------------------------------------------------------- */

  async function handleUpload(file: File) {
    setStatus('uploading');
    const res = await uploadStudyFile(file);
    setFileId(res.file_id);
    setStatus('uploaded');
    setAnalysis(null);
    setPlan(null);
    setEditableText('');
  }

  /* ---------------------------------------------------------
     ANALYZE
  --------------------------------------------------------- */

  async function handleAnalyze() {
    if (!fileId) return;
    setIsBusy(true);
    setStatus('analyzing');

    const res = await analyze(fileId);

    setAnalysis(res.analysis || null);
    setDays(res.analysis?.recommended_days || 10);

    if (res.analysis?.document_language) {
      setPlanLanguage(res.analysis.document_language === 'en' ? 'en' : 'en');
    }

    setIsBusy(false);
  }

  /* ---------------------------------------------------------
     GENERATE PLAN
  --------------------------------------------------------- */

  async function handleGeneratePlan() {
    if (!fileId) return;
    setIsBusy(true);

    const result = await generatePlan(fileId, days, planLanguage);

    setPlan(result);
    setEditableText(result?.text || '');

    setIsBusy(false);
  }

  /* ---------------------------------------------------------
     DOWNLOAD PDF
  --------------------------------------------------------- */

  async function handleDownloadPdf() {
    if (!fileId || !editableText.trim()) return;

    setIsDownloading(true);
    const pdf = await downloadPlanPdf(editableText, fileId, days);

    const url = URL.createObjectURL(pdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study_plan.pdf';
    a.click();

    setIsDownloading(false);
  }

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 pt-10">
      <h1 className="text-3xl font-bold">LearnScaffold</h1>

      <section className="mt-6">
        <FileDropzone onFileSelected={handleUpload} />
      </section>

      {status && status !== 'ready' && status !== 'error' && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/80">{statusLabel} {dots}</p>
          <ProgressBar progress={progress} />
        </section>
      )}

      {analysis && (
        <section className="mt-6 rounded-3xl border border-blue-500/30 bg-blue-950/30 p-6">
          <h2 className="text-lg font-semibold">Document analysis</h2>

          <p className="mt-3 text-sm text-white/80">
            <strong>Document type:</strong> {analysis.document_type}
          </p>

          <p className="mt-2 text-sm text-white/80">
            <strong>Main topics:</strong>{' '}
            {analysis.main_topics?.join(', ') || '—'}
          </p>

          <p className="mt-2 text-sm text-white/80">
            <strong>Recommended days:</strong>{' '}
            {analysis.recommended_days || 10}
          </p>

          <div className="mt-4">
            <LanguageSelector
              value={planLanguage}
              original={analysis.document_language || 'en'}
              onChange={setPlanLanguage}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isBusy}
            className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Continue analysis
          </button>

          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isBusy}
            className="mt-4 ml-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Generate learning plan
          </button>
        </section>
      )}

      {plan && (
        <FinalPlanSection
          plan={plan}
          analysis={analysis}
          editableText={editableText}
          setEditableText={setEditableText}
          isBusy={isBusy}
          isDownloading={isDownloading}
          onDownload={handleDownloadPdf}
          fileId={fileId}
        />
      )}
    </main>
  );
}
