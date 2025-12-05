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
  uploading: 'Uploading…',
  uploaded: 'Uploaded',
  analyzing: 'Analyzing…',
  extracting: 'Extracting…',
  extracting_pages: 'Extracting pages…',
  text_extracting: 'Extracting text…',
  extracting_text: 'Extracting text…',
  cleaning: 'Cleaning text…',
  chunking: 'Chunking…',
  classifying: 'Classifying…',
  structure: 'Extracting structure…',
  building_structure: 'Building structure…',
  ready: 'Ready for plan generation',
  error: 'Error',
};

/* ---------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */

export default function Page() {
  const dots = useDots();

  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisBlock | null>(null);
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);

  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);

  const [planLanguage, setPlanLanguage] = useState<string>('en');
  const [editableText, setEditableText] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  /* ---------------------------------------------------------
     POLLING STATUS
  --------------------------------------------------------- */

  function startPolling(id: string) {
    let timer: ReturnType<typeof setInterval> | null = null;

    timer = setInterval(async () => {
      try {
        const res = await getAnalysisStatus(id);
        if (!res?.status) return;

        const backendStatus = res.status.toLowerCase();
        setStatus(backendStatus);

        const mapped = STATUS_PROGRESS_MAP[backendStatus];
        if (mapped !== undefined) setProgress(mapped);

        if (backendStatus === 'error' || backendStatus === 'ready') {
          clearInterval(timer!);
          timer = null;

          if (backendStatus === 'error') {
            setIsBusy(false);
          }

          if (backendStatus === 'ready') {
            const result = await analyze(id);
            setAnalysis(result);
            setIsBusy(false);
          }
        }
      } catch (_) {}
    }, 1200);
  }

  /* ---------------------------------------------------------
     FILE UPLOAD
  --------------------------------------------------------- */

  async function handleUpload() {
    if (!file) return;

    setIsBusy(true);
    setStatus('uploading');
    setProgress(5);

    const res = await uploadStudyFile(file);

    if (!res?.file_id) {
      setStatus('error');
      setIsBusy(false);
      return;
    }

    setFileId(res.file_id);
    setStatus('uploaded');
    setProgress(10);
    startPolling(res.file_id);
  }

  /* ---------------------------------------------------------
     GENERATE PLAN
  --------------------------------------------------------- */

  async function handleGenerate() {
    if (!fileId || !analysis) return;

    setIsBusy(true);
    setStatus('generating');
    setProgress(0);

    const resp = await generatePlan({
      file_id: fileId,
      days: analysis.recommended_days || 10,
      language: planLanguage,
    });

    if (!resp || !resp.plan) {
      setStatus('error');
      setIsBusy(false);
      return;
    }

    setPlan(resp);
    setEditableText(resp.plan_text || '');
    setIsBusy(false);
  }

  /* ---------------------------------------------------------
     DOWNLOAD PDF
  --------------------------------------------------------- */

  async function handleDownload() {
    if (!fileId || !editableText.trim()) return;
    setIsDownloading(true);
    try {
      await downloadPlanPdf(fileId, editableText);
    } finally {
      setIsDownloading(false);
    }
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-white">
      <h1 className="text-center text-3xl font-bold">LearnScaffold</h1>
      <p className="mt-2 text-center text-sm text-white/70">
        AI-powered study plan generator
      </p>

      {/* Upload Section */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
        <FileDropzone file={file} setFile={setFile} />
        <button
          className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black"
          onClick={handleUpload}
          disabled={!file || isBusy}
        >
          {isBusy && status !== 'ready' ? 'Processing…' : 'Upload'}
        </button>
      </section>

      {/* Progress Section */}
      {status && status !== 'ready' && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/80">
            {STATUS_LABELS[status] || status} {dots}
          </p>
          <ProgressBar progress={progress} />
        </section>
      )}

      {/* Analysis Section */}
      {analysis && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-wide text-emerald-300/80">
            Document analysis
          </p>

          <h2 className="mt-1 text-lg font-semibold">{analysis.document_type}</h2>

          <p className="mt-3 text-sm text-white/70">
            {analysis.short_description}
          </p>

          <div className="mt-4">
            <p className="text-sm">
              Original language: {analysis.document_language}
            </p>

            <LanguageSelector
              value={planLanguage}
              original={analysis.document_language}
              onChange={(lang) => setPlanLanguage(lang)}
            />

            <button
              className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black"
              disabled={isBusy}
              onClick={handleGenerate}
            >
              Generate Study Plan
            </button>
          </div>
        </section>
      )}

      {/* Final Plan */}
      {plan && (
        <>
          <section className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-6">
            <p className="text-xs uppercase tracking-wide text-emerald-300/80">
              Final plan
            </p>

            <h2 className="mt-1 text-lg font-semibold">Day-by-day structure</h2>

            <div className="mt-4 rounded-2xl bg-black/20 p-4">
              <StudyPlanViewer plan={{ days: plan.plan?.days || [] }} />
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-base font-semibold">Editable learning plan text</h2>

            <textarea
              className="mt-3 h-80 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-900"
              value={editableText}
              onChange={(e) => setEditableText(e.target.value)}
            />

            <button
              className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black"
              disabled={!editableText.trim() || isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </section>
        </>
      )}
    </main>
  );
}
