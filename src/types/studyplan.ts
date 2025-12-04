// ===============================================
// Core types for LearnScaffold study plan API
// ===============================================

// Pages in the original textbook that contain this day's material
export type SourcePages = number[];

// Single quiz item for a day
export type QuizItem = {
  q: string;
  a: string;
};

// One day in the generated learning plan
export type PlanDay = {
  day_number: number;         // always required
  title?: string;             // may be missing depending on LLM output
  source_pages?: SourcePages;
  goals?: string[];
  theory?: string;
  practice?: string[];
  summary?: string;
  quiz?: QuizItem[];
};

// Container for all days
export type PlanBlock = {
  days: PlanDay[];            // always an array; must exist
};

// Document-level analysis returned by backend
export type AnalysisBlock = {
  document_type: string;      // required
  level?: string;             // optional — backend may omit
  main_topics: string[];      // required, but can be empty array
  summary?: string;
  recommended_days?: number;
  language?: string;          // added: backend may return detected language
};

// Full response from learning plan generation
export type StudyPlanResponse = {
  status: string;
  file_id: string;
  days: number;
  analysis: AnalysisBlock;     // must contain document_type + main_topics
  structure?: unknown[];       // optional — backend may omit
  plan: PlanBlock;             // required { days: [...] }
};
