const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://learnscaffold-backend.onrender.com";

/* ---------------------------------------------------------
   Helper: unified fetch with JSON parsing
--------------------------------------------------------- */
async function jsonFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed: ${res.status} ${text}`);
  }

  return res.json();
}

/* ---------------------------------------------------------
   1. UPLOAD FILE
--------------------------------------------------------- */
export async function uploadStudyFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  return res.json();
}

/* ---------------------------------------------------------
   2. ANALYZE FILE
--------------------------------------------------------- */
export async function analyze(fileId: string) {
  return jsonFetch(`${API_URL}/analyze/?file_id=${encodeURIComponent(fileId)}`, {
    method: "POST",
  });
}

/* ---------------------------------------------------------
   3. GENERATE LEARNING PLAN
--------------------------------------------------------- */
export async function generatePlan(
  fileId: string,
  days: number,
  language: string
) {
  return jsonFetch(
    `${API_URL}/studyplan/study?file_id=${encodeURIComponent(
      fileId
    )}&days=${encodeURIComponent(String(days))}&lang=${encodeURIComponent(
      language
    )}`,
    { method: "POST" }
  );
}

/* ---------------------------------------------------------
   4. DOWNLOAD PDF
--------------------------------------------------------- */
export async function downloadPlanPdf(
  text: string,
  fileId: string,
  days: number
): Promise<Blob> {
  const res = await fetch(`${API_URL}/plan/pdf/${fileId}?days=${days}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`PDF download failed: ${res.status} ${msg}`);
  }

  return res.blob();
}

/* ---------------------------------------------------------
   5. GET ANALYSIS STATUS
--------------------------------------------------------- */
export async function getAnalysisStatus(fileId: string) {
  return jsonFetch(`${API_URL}/analyze/status/${encodeURIComponent(fileId)}`);
}
