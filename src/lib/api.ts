const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://learnscaffold-backend.onrender.com";

/* ---------------------------------------------------------
   UPLOAD FILE
--------------------------------------------------------- */

export async function uploadStudyFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/upload/`, {
    method: "POST",
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Analyze failed (${res.status}): ${txt}`);
  }

  return res.json();
}

/* ---------------------------------------------------------
   POLL STATUS
--------------------------------------------------------- */

export async function getAnalysisStatus(fileId: string) {
  const res = await fetch(`${API_URL}/analyze/status/${fileId}`);

  if (!res.ok) {
    throw new Error("Failed to get analysis status");
  }

  return res.json();
}

/* ---------------------------------------------------------
   GENERATE LEARNING PLAN
--------------------------------------------------------- */

export async function generatePlan(
  fileId: string,
  days: number,
  language: string
) {
  const res = await fetch(`${API_URL}/generate/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  const json = await res.json();

  // ---------------------------------------------------------
  // SAFETY CHECK: Validate backend response structure
  // ---------------------------------------------------------
  if (!json || typeof json !== "object") {
    console.error("Invalid generatePlan response (not an object):", json);
    throw new Error("Invalid plan response: not an object");
  }

  if (!json.plan || !Array.isArray(json.plan.days)) {
    console.error("Invalid plan.days structure:", json);
    throw new Error("Invalid plan structure: missing 'plan.days'");
  }

  if (!json.analysis || !json.analysis.document_type) {
    console.error("Invalid analysis structure:", json);
    throw new Error("Invalid analysis structure: missing document_type");
  }

  return json;
}

/* ---------------------------------------------------------
   DOWNLOAD PDF
--------------------------------------------------------- */

export async function downloadPlanPdf(
  text: string,
  fileId: string,
  days: number
) {
  const res = await fetch(`${API_URL}/plan/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id: fileId,
      days,
      text,
    }),
  });

  if (!res.ok) {
    throw new Error("PDF generation failed");
  }

  return res.blob();
}
