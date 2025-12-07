// Core types for LearnScaffold study plan API

export type SourcePages = number[];

export type QuizItem = {
  q: string;
  a: string;
};

export type PlanDay = {
  day_number: number;
  title: string;
  source_pages?: SourcePages;
  goals?: string[];
  theory?: string;
  practice?: string[];
  summary?: string;
  quiz?: QuizItem[];
};

export type PlanBlock = {
  days: PlanDay[];
};

export type AnalysisBlock = {
  document_type: string;
  level?: string;
  main_topics: string[];
  summary?: string;
  recommended_days?: number;
  document_language?: string;
};

export type StudyPlanResponse = {
  status: string;
  file_id?: string;
  days?: number;

  // MUST BE OPTIONAL — generate() does NOT return them
  analysis?: AnalysisBlock;
  structure?: unknown[];

  plan: PlanBlock;
};
