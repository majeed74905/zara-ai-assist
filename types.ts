
export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export type ViewMode = 
  | 'chat' | 'student' | 'code' | 'live' | 'workspace' | 'settings' | 'exam' 
  | 'analytics' | 'planner' | 'mastery' | 'notes' | 'about' | 'builder'
  | 'dashboard' | 'life-os' | 'skills' | 'memory' | 'creative' | 'pricing' | 'video' | 'github';

export interface Attachment {
  id: string;
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export interface Source {
  title: string;
  uri: string;
}

// Added isOffline to Message interface
export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  sources?: Source[];
  timestamp: number;
  isError?: boolean;
  isStreaming?: boolean;
  isOffline?: boolean;
}

export interface GeneratedFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

export type VFS = Record<string, string>;

export interface AppProject {
  id: string;
  name: string;
  vfs: VFS;
  createdAt: number;
  updatedAt: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

export interface ChatConfig {
  model: string;
  useThinking: boolean;
  useGrounding: boolean;
  activePersonaId?: string;
  isEmotionalMode?: boolean;
}

export interface PersonalizationConfig {
  nickname: string;
  occupation: string;
  aboutYou: string;
  customInstructions: string;
  fontSize: 'small' | 'medium' | 'large';
  isVerifiedCreator?: boolean;
}

export interface SystemConfig {
  autoTheme: boolean;
  enableAnimations: boolean;
  density: 'comfortable' | 'compact';
  soundEffects: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AppFeedback {
  id: string;
  rating: number;
  category: string;
  text: string;
  timestamp: number;
}

export type MemoryCategory = 'fact' | 'preference' | 'project' | 'core' | 'emotional';

export interface MemoryNode {
  id: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  confidence: number;
  timestamp: number;
}

export interface DailyStats {
  date: string;
  messagesSent: number;
  minutesSpent: number;
  examsTaken: number;
}

export interface StudentConfig {
  topic: string;
  mode: 'summary' | 'mcq' | '5mark' | '20mark' | 'simple';
  mcqConfig?: { count: number; difficulty: string; };
  studyMaterial?: string;
  attachments?: Attachment[];
}

export interface Flashcard {
  front: string;
  back: string;
  mastered: boolean;
}

export interface FlashcardSet {
  id: string;
  topic: string;
  cards: Flashcard[];
  createdAt: number;
}

export interface StudyPlan {
  id: string;
  topic: string;
  weeklySchedule: any[];
  createdAt: number;
  startDate: string;
}

export interface ExamConfig {
  subject: string;
  examType: string;
  difficulty: string;
  language: string;
  questionCount: number;
  includeTheory: boolean;
  durationMinutes: number;
}

export interface ExamQuestion {
  id: number;
  type: string;
  text: string;
  options?: string[];
  correctAnswer: string;
  marks: number;
}

export interface ExamSession {
  id: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  answers: Record<number, any>;
  createdAt: number;
  completedAt?: number;
  isActive: boolean;
  totalScore?: number;
  maxScore?: number;
}

export interface MediaAction {
  action: 'PLAY_MEDIA';
  media_type: string;
  title: string;
  artist?: string;
  platform: string;
  url: string;
  query: string;
}

// Added Missing Exported Types
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export type GeminiModel = string;

export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
}

export type AppLanguage = string;
export type ExamType = string;
export type ExamDifficulty = string;

export interface ExamAnswer {
  questionId: number;
  userAnswer: string;
  isEvaluated: boolean;
  score: number;
  feedback?: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
}
