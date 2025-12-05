'use client';

import { useState, useEffect } from 'react';
import { useDots } from '@/hooks/useDots';
import FileDropzone from '@/components/FileDropzone';
import LanguageSelector from '@/components/LanguageSelector';
import ProgressBar from '@/components/ProgressBar';
import StudyPlanViewer from '@/components/StudyPlanViewer';

import {
  uploadStudyFile,
  analyze,
  generatePlan,
  downloadPlanPdf,
  getAnalysisStatus,
} from '@/lib/api';

import type {
  StudyPlanResponse,
  AnalysisBlock,
  PlanDay,
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
  uploading: 'Uploading file',
  uploaded: 'Uploaded',
  analyzing: 'Analyzing document',
  extracting: 'Extracting PDF pages',
  extracting_pages: 'Processing pages',
  extracting_text: 'Extracting text',
  cleaning: 'Cleaning text',
  chunking: 'Splitting data',
  classifying: 'Classifying content',
  structure: 'Extracting structure',
  building_structure: 'Structuring model',
  ready: 'Analysis complete',
  error: 'Error',
};

/* ---------------------------------------------------------
    COMPONENT
--------------------------------------------------------- */

export default function HomePage() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisBlock | null>(null);
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);

  const [planLanguage, setPlanLanguage] = useState<string>('en');
  const [editableText, setEditableText] = useState<string>('');

  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const dots = useDots();

  /* ---------------------------------------------------------
      POLLING ANALYSIS
  --------------------------------------------------------- */
  useEffect(() => {
    if (!fileId || !status || status === 'ready' || status === 'error') return;

    const timer = setInterval(async () => {
      const resp = await getAnalysisStatus(fileId);
      if (!resp) return;

      setStatus(resp.status);

      const newProgress = STATUS_PROGRESS_MAP[resp.status] ?? progress;
      setProgress(newProgress);

      if (resp.status === 'ready') {
        clearInterval(timer);
        if (resp.analysis) {
          setAnalysis(resp.analysis);
        }
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [fileId, status]);

  /* ---------------------------------------------------------
      FILE UPLOAD
  --------------------------------------------------------- */
  async function handleUpload(file: File) {
    setIsBusy(true);
    setAnalysis(null);
    setPlan(null);
    setStatus('uploading');
    setProgress(STATUS_PROGRESS_MAP.uploading);

    try {
      const resp = await uploadStudyFile(file);
      setFileId(resp.file_id);

      setStatus('uploaded');
      setProgress(STATUS_PROGRESS_MAP.uploaded);

      const anResp = await analyze(resp.file_id);
      setStatus(anResp.status ?? 'analyzing');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setIsBusy(false);
    }
  }

  /* ---------------------------------------------------------
      GENERATE STUDY PLAN
  --------------------------------------------------------- */
  async function handleGenerate() {
    if (!fileId || !analysis) return;

    setIsBusy(true);
    setProgress(0);

    try {
      const resp = await generatePlan(fileId, analysis.recommended_days ?? 10, planLanguage);

      setPlan(resp);
      setEditableText(resp.full_text ?? '');
    } catch (err) {
      console.error(err);
      alert('Failed to generate plan');
    } finally {
      setIsBusy(false);
    }
  }

  /* ---------------------------------------------------------
      DOWNLOAD PDF
  --------------------------------------------------------- */
  async function handleDownloadPdf() {
    if (!fileId || !editableText.trim()) return;

    setIsDownloading(true);
    try {
      await downloadPlanPdf(fileId, editableText);
    } catch (err) {
      console.error(err);
      alert('PDF generation failed');
    } finally {
      setIsDownloading(false);
    }
  }

  /* ---------------------------------------------------------
      RENDER
  --------------------------------------------------------- */
  const statusLabel = status ? STATUS_LABELS[status] ?? status : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-center text-3xl font-bold tracking-tight text-white">
        AI Study Plan Generator
      </h1>

      {/* ------------------------------------ Upload Section */}
      <section className="mt-8">
        <FileDropzone disabled={isBusy} onFileUpload={handleUpload} />
      </section>

      {/* ------------------------------------ Progress Section */}
      {status && status !== 'ready' && status !== 'error' && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/80">
            {statusLabel} {dots}
          </p>
          <ProgressBar progress={progress} />
        </section>
      )}

      {/* ------------------------------------ Analysis Result */}
      {status === 'ready' && analysis && (
        <section className="mt-6 rounded-3xl border border-emerald-500/40 bg-emerald-900/20 p-6">
          <h2 className="text-xl font-semibold">Document analysis</h2>

          <p className="mt-2 text-white/80 text-sm">
            Document type: {analysis.document_type}
          </p>

          <p className="mt-1 text-white/80 text-sm">
            Recommended days: {analysis.recommended_days}
          </p>

          <div className="mt-3">
            <LanguageSelector
              value={planLanguage}
              original={analysis.document_language || 'en'}
              onChange={setPlanLanguage}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isBusy}
            className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-900 hover:bg-emerald-400"
          >
            Generate learning plan
          </button>
        </section>
      )}

      {/* ------------------------------------ Final Plan Section */}
      {plan && (
        <section className="mt-8 space-y-6">
          {/* Viewer */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-6">
            <h2 className="text-lg font-semibold">Day-by-day structure</h2>

            <div className="mt-4 rounded-2xl bg-black/20 p-4">
              <StudyPlanViewer plan={{ days: plan.plan?.days || [] }} />
            </div>
          </div>

          {/* Editable text */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-base font-semibold">Editable learning plan text</h2>

            <textarea
              className="mt-3 h-80 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900"
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
            />

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={handleDownloadPdf}
                disabled={!editableText.trim() || isDownloading}
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide bg-emerald-500 text-slate-900 hover:bg-emerald-400 disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isDownloading ? 'Generating PDF…' : 'Download PDF'}
              </button>

              <p className="text-xs text-slate-500">
                PDF is generated from this text
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
