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
