export interface Profile {
  id: string;
  display_name: string;
  university: string | null;
  major: string | null;
  department_preset: string | null;
  preferred_provider: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  professor: string | null;
  semester: string;
  color: string | null;
  department_preset: string | null;
  system_context: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfessorProfile {
  id: string;
  course_id: string;
  name: string;
  research_areas: string[];
  academic_stance: string | null;
  key_topics: string[];
  papers_analyzed: number;
  raw_analysis: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  course_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  page_count: number | null;
  chunk_count: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  course_id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  metadata: Record<string, unknown> | null;
  token_count: number;
}

export interface Conversation {
  id: string;
  course_id: string;
  user_id: string;
  title: string | null;
  template_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider: string | null;
  model: string | null;
  tokens_used: { input: number; output: number } | null;
  context_chunks: string[] | null;
  created_at: string;
}

export interface CourseMemory {
  id: string;
  course_id: string;
  memory_type: 'concept' | 'summary' | 'key_term' | 'weak_area' | 'user_note';
  content: string;
  source_conversation_id: string | null;
  importance: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  system_prompt: string;
  user_prompt_template: string;
  category: 'study' | 'writing' | 'review' | 'quiz' | 'explain';
  variables: TemplateVariable[];
  department_tags: string[] | null;
  is_system: boolean;
  user_id: string | null;
  sort_order: number;
}

export interface TemplateVariable {
  name: string;
  label_ko: string;
  type: 'text' | 'number' | 'select';
  required: boolean;
  options?: string[];
}

export interface ApiKey {
  id: string;
  user_id: string;
  provider: string;
  encrypted_key: string;
  key_hint: string;
  is_valid: boolean;
  created_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  question_count: number;
  score: number | null;
  total: number | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_type: 'multiple_choice' | 'short_answer';
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  sort_order: number;
}

export interface FlashcardDeck {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  created_at: string;
}

export interface DepartmentPreset {
  id: string;
  name_ko: string;
  name_en: string;
  base_system_prompt: string;
  terminology_hints: string | null;
  recommended_templates: string[] | null;
}
