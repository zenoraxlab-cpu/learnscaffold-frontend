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
   GET ANALYSIS STATUS
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

  let json: any;

  try {
    json = await res.json();
  } catch (e) {
    console.error("JSON parse error:", e);
    throw new Error("Invalid JSON from backend");
  }

  console.log("RAW PLAN RESPONSE:", JSON.stringify(json, null, 2));

  /* Normalize plan.days */
  let normalizedDays: any[] = [];

  if (Array.isArray(json.plan)) {
    normalizedDays = json.plan;
  } else if (json.plan && Array.isArray(json.plan.days)) {
    normalizedDays = json.plan.days;
  } else if (json.plan && typeof json.plan === "object") {
    normalizedDays = Object.values(json.plan);
  }

  if (!Array.isArray(normalizedDays)) {
    throw new Error("Invalid plan structure");
  }

  json.plan = { days: normalizedDays };

  return json;
}

/* ---------------------------------------------------------
   DOWNLOAD PDF (FIXED)
--------------------------------------------------------- */
export async function downloadPlanPdf(
  fileId: string,
  text: string,
  language: string
) {
  const res = await fetch(`${API_URL}/plan/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_id: fileId,
      text,
      language,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("PDF ERROR:", txt);
    throw new Error("PDF generation failed");
  }

  return res.blob();
}
