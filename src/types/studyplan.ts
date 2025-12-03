// Core types for LearnScaffold study plan API

// Pages in the original textbook that contain this day's material
export type SourcePages = number[];

// Single quiz item for a day
export type QuizItem = {
  q: string;
  a: string;
};

// One day in the generated learning plan
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

// Container for all days
export type PlanBlock = {
  days: PlanDay[];
};

// Document-level analysis returned by backend
export type AnalysisBlock = {
  document_type: string;
  level: string;
  main_topics: string[];
  summary?: string;
  recommended_days?: number;
};

// Full response from /studyplan/study (learning plan generation)
export type StudyPlanResponse = {
  status: string;
  file_id: string;
  days: number;
  analysis: AnalysisBlock;
  structure: unknown[];
  plan: PlanBlock;
};
