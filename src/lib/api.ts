// ---------------------------------------------------------
// API BASE URL
// ---------------------------------------------------------
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/* ---------------------------------------------------------
   UPLOAD FILE
--------------------------------------------------------- */
export async function uploadStudyFile(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/upload/`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }

  return res.json();
}

/* ---------------------------------------------------------
   START ANALYSIS
--------------------------------------------------------- */
export async function analyze(fileId: string) {
  const res = await fetch(`${API_URL}/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Analyze failed (${res.status}): ${txt}`);
  }

  return res.json();
}

/* ---------------------------------------------------------
   GET ANALYSIS STATUS
--------------------------------------------------------- */
export async function getAnalysisStatus(fileId: string, language: string) {
  const res = await fetch(
    `${API_URL}/analyze/status/${fileId}?language=${language}`,
  );

  if (!res.ok) {
    throw new Error('Failed to get analysis status');
  }

  return res.json();
}

/* ---------------------------------------------------------
   GENERATE LEARNING PLAN — ИСПРАВЛЕНО: правильный путь
--------------------------------------------------------- */
export async function generatePlan(
  fileId: string,
  days: number,
  language: string,
) {
  const res = await fetch(`${API_URL}/generate/generate`, {
    // ← было /generate/, стало /generate/generate
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      days,
      language,
    }),
  });

  if (res.status === 200) {
    const json = await res.json();

    if (json.status === 'delayed') {
      return {
        status: 'delayed',
        message:
          'Your file requires extended processing. We will email you when it is ready.',
      };
    }

    return normalizePlanResponse(json);
  }

  if (res.status === 404) {
    return {
      status: 'delayed',
      message:
        'Your file is still being processed. We will email you when the analysis is ready.',
    };
  }

  const txt = await res.text();
  throw new Error(`Generate failed (${res.status}): ${txt}`);
}

/* ---------------------------------------------------------
   NORMALIZE PLAN
--------------------------------------------------------- */
function normalizePlanResponse(json: any) {
  if (!json.plan) {
    console.error("Missing 'plan' in backend response:", json);
    throw new Error('Backend did not return a learning plan');
  }

  let normalizedDays: any[] = [];

  if (Array.isArray(json.plan)) {
    normalizedDays = json.plan;
  } else if (json.plan && Array.isArray(json.plan.days)) {
    normalizedDays = json.plan.days;
  } else if (json.plan && typeof json.plan === 'object') {
    const values = Object.values(json.plan);
    if (values.length > 0 && typeof values[0] === 'object') {
      normalizedDays = values;
    }
  }

  if (!Array.isArray(normalizedDays)) {
    console.error('Invalid plan.days structure:', json.plan);
    throw new Error('Invalid plan structure: cannot extract days array');
  }

  json.plan = { days: normalizedDays };
  return json;
}

/* ---------------------------------------------------------
   DOWNLOAD PDF
--------------------------------------------------------- */
export async function downloadPlanPdf(
  text: string,
  fileId: string,
  days: number,
) {
  const res = await fetch(`${API_URL}/plan/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      days,
      text,
    }),
  });

  if (!res.ok) {
    throw new Error('PDF generation failed');
  }

  return res.blob();
}
