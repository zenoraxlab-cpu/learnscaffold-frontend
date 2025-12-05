'use client';

import { useState, useEffect } from 'react';
import {
  uploadStudyFile,
  analyze,
  getAnalysisStatus,
  generatePlan,
  downloadPlanPdf,
} from '@/lib/api';

import FileDropzone from '@/components/FileDropzone';
import LanguageSelector from '@/components/LanguageSelector';
import ProgressBar from '@/components/ProgressBar';
import StudyPlanViewer from '@/components/StudyPlanViewer';
import { useDots } from '@/hooks/useDots';

import type {
  StudyPlanResponse,
  AnalysisBlock,
  PlanBlock,
  PlanDay,
} from '@/types/studyplan';

/* ---------------------------------------------------------
   FRONTEND PROGRESS MAP
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
  ready: 100,
  error: 100,
};

const STATUS_LABELS: Record<string, string> = {
  uploading: 'Uploading file…',
  uploaded: 'File uploaded',
  analyzing: 'Analyzing…',
  extracting: 'Extracting pages…',
  extracting_pages: 'Extracting pages…',
  extracting_text: 'Extracting text…',
  text_extracting: 'Extracting text…',
  cleaning: 'Cleaning text…',
  chunking: 'Chunking content…',
  classifying: 'Classifying document…',
  structure: 'Extracting structure…',
  ready: 'Analysis complete',
  error: 'Error',
};

/* ---------------------------------------------------------
   MAIN PAGE COMPONENT
--------------------------------------------------------- */

export default function Page() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisBlock | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [planLanguage, setPlanLanguage] = useState<string>('en');

  const [isBusy, setIsBusy] = useState(false);
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [editableText, setEditableText] = useState('');

  const [isDownloading, setIsDownloading] = useState(false);
  const dots = useDots(status);

  /* ---------------------------------------------------------
     POLLING ANALYSIS
  --------------------------------------------------------- */

  useEffect(() => {
    if (!fileId) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    if (status && status !== 'ready' && status !== 'error') {
      timer = setInterval(async () => {
        try {
          const st = await getAnalysisStatus(fileId);
          if (!st) return;

          const { status: s } = st;

          setStatus(s);
          setProgress(STATUS_PROGRESS_MAP[s] ?? 0);

          if (s === 'ready' || s === 'error') {
            if (timer) clearInterval(timer);
          }
        } catch (err) {
          console.error('Polling failed', err);
        }
      }, 1200);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [fileId, status]);

  /* ---------------------------------------------------------
     UPLOAD HANDLER
  --------------------------------------------------------- */

  async function handleUpload(file: File) {
    setStatus('uploading');
    setProgress(5);

    try {
      const resp = await uploadStudyFile(file);
      setFileId(resp.file_id);

      setStatus('uploaded');
      setProgress(10);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  /* ---------------------------------------------------------
     START ANALYSIS
  --------------------------------------------------------- */

  async function handleAnalyze() {
    if (!fileId) return;

    setStatus('analyzing');
    setProgress(20);

    try {
      const resp = await analyze(fileId);

      if (!resp || !resp.analysis) {
        setStatus('error');
        return;
      }

      setAnalysis({
        ...resp.analysis,
        document_language: resp.analysis.document_language || 'en',
      });

      setPlanLanguage(
        resp.analysis.document_language === 'en'
          ? 'en'
          : 'en'
      );
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  /* ---------------------------------------------------------
     GENERATE LEARNING PLAN
  --------------------------------------------------------- */

  async function handleGenerate() {
    if (!fileId || !analysis) return;

    setIsBusy(true);
    setStatus('generating');
    setProgress(0);

    const days = analysis.recommended_days || 10;

    try {
      const resp = await generatePlan(
        fileId,
        days,
        planLanguage
      );

      if (!resp || !resp.plan) {
        setStatus('error');
        setIsBusy(false);
        return;
      }

      setPlan(resp);
      setEditableText(resp.plan_text || '');
      setStatus('ready');
      setProgress(100);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }

    setIsBusy(false);
  }

  /* ---------------------------------------------------------
     DOWNLOAD PDF
  --------------------------------------------------------- */

  async function handleDownloadPdf() {
    if (!editableText.trim() || !fileId || !plan) return;
    setIsDownloading(true);

    try {
      const blob = await downloadPlanPdf(editableText, fileId, plan.days);

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'study-plan.pdf';
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }

    setIsDownloading(false);
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-white">
      <h1 className="text-3xl font-bold">LearnScaffold — AI Study Plan Generator</h1>

      {/* Upload */}
      <section className="mt-8">
        <FileDropzone onFileUpload={handleUpload} />
      </section>

      {/* Analyze button */}
      {fileId && !analysis && (
        <button
          onClick={handleAnalyze}
          className="mt-6 rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-900"
        >
          Start analysis
        </button>
      )}

      {/* Progress */}
      {status && status !== 'ready' && status !== 'error' && (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/80">
            {STATUS_LABELS[status] || status} {dots}
          </p>
          <ProgressBar progress={progress} />
        </section>
      )}

      {/* Analysis result */}
      {analysis && (
        <section className="mt-8 rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-6">
          <h2 className="text-lg font-semibold">Document analysis</h2>

          <p className="mt-2 text-sm">
            Document type: <strong>{analysis.document_type}</strong>
          </p>

          <p className="mt-2 text-sm">
            Level: <strong>{analysis.level}</strong>
          </p>

          <p className="mt-2 text-sm">
            Recommended days: <strong>{analysis.recommended_days}</strong>
          </p>

          <LanguageSelector
            value={planLanguage}
            original={analysis.document_language || 'en'}
            onChange={(v) => setPlanLanguage(v)}
          />

          <button
            onClick={handleGenerate}
            disabled={isBusy}
            className="mt-4 rounded-full bg-white px-4 py-2 font-semibold text-slate-900"
          >
            Generate Study Plan
          </button>
        </section>
      )}

      {/* Final Plan */}
      {plan && (
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Final learning plan</h2>

          <div className="mt-4 rounded-2xl bg-black/20 p-4">
            <StudyPlanViewer plan={{ days: plan.plan?.days || [] }} />
          </div>

          <textarea
            className="mt-4 h-72 w-full rounded-xl bg-white p-4 text-black"
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
          />

          <button
            onClick={handleDownloadPdf}
            disabled={!editableText.trim() || isDownloading}
            className="mt-4 rounded-full bg-emerald-400 px-4 py-2 font-semibold text-slate-900"
          >
            {isDownloading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </section>
      )}
    </main>
  );
}
