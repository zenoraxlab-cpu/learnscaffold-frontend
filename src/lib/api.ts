const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://learnscaffold-backend-ocr.onrender.com';

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
  const res = await fetch(`${API_URL}/analyze`, {
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
   GET STATUS
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
   GENERATE PLAN — корректная версия
--------------------------------------------------------- */
export async function generatePlan(
  fileId: string,
  days: number,
  language: string,
) {
  const res = await fetch(`${API_URL}/generate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      days,
      language,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Generate failed (${res.status}): ${txt}`);
  }

  const json: any = await res.json();

  console.log('RAW PLAN RESPONSE:', JSON.stringify(json, null, 2));

  /* ---------------------------------------------------------
     1. НЕ проверяем json.analysis — его НЕТ в этом endpoint
     (analysis приходит только из /analyze)
  --------------------------------------------------------- */

  /* ---------------------------------------------------------
     2. Нормализация структуры плана
  --------------------------------------------------------- */
  let normalizedDays: any[] = [];

  // Вариант: plan: [...]
  if (Array.isArray(json.plan)) {
    normalizedDays = json.plan;
  }

  // Вариант: plan: { days: [...] }
  else if (json.plan && Array.isArray(json.plan.days)) {
    normalizedDays = json.plan.days;
  }

  // Вариант: plan: {0:{},1:{}} → превращаем в массив
  else if (json.plan && typeof json.plan === 'object') {
    normalizedDays = Object.values(json.plan);
  }

  if (!Array.isArray(normalizedDays)) {
    console.error('Invalid plan format:', json);
    throw new Error('Plan format invalid: cannot extract days array');
  }

  // Итоговая структура, которую ожидает фронтенд
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
// rebuild hotfix 2025-12-07
