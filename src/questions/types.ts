export type QuestionStatus = 'TASLAK' | 'INCELEMEDE' | 'REVIZYON' | 'ONAYLANDI' | 'REDDEDILDI';

export interface ApiQuestion {
  id: number;
  content: string;
  imageUrl: string | null;
  objectiveCode: string | null;
  grade: string | null;
  difficulty: string | null;
  options: string[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  status: QuestionStatus;
  editorNote: string | null;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  author: {
    id: number;
    fullName: string;
    branchName: string | null;
  } | null;
  project: {
    id: number;
    title: string;
    code: string;
  } | null;
}

export interface CreateQuestionInput {
  content: string;
  grade: string;
  options: string[];
  correctAnswer: string;
  projectId: number | null;
  objectiveCode?: string | null;
  difficulty?: string | null;
  explanation?: string | null;
}

export interface PatchQuestionInput {
  content?: string;
  grade?: string | null;
  objectiveCode?: string | null;
  difficulty?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  projectId?: number | null;
}

export type QuestionWorkflowAction = 'submit' | 'approve' | 'request_revision' | 'reject';
