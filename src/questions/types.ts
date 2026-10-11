export type QuestionStatus = 'TASLAK' | 'INCELEMEDE' | 'REVIZYON' | 'ONAYLANDI' | 'REDDEDILDI';

export type QuestionAssetPlacement = 'STEM' | 'OPTION_A' | 'OPTION_B' | 'OPTION_C' | 'OPTION_D' | 'EXPLANATION';
export type QuestionAssetType = 'IMAGE' | 'VIDEO_URL' | 'LINK';

export interface QuestionAssetInput {
  id?: number;
  placement: QuestionAssetPlacement;
  assetType: QuestionAssetType;
  url: string;
  title?: string | null;
  altText?: string | null;
  sortOrder?: number;
}

export interface ApiQuestionAsset extends QuestionAssetInput {
  id: number;
  questionId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiQuestion {
  id: number;
  content: string;
  imageUrl: string | null;
  assets?: ApiQuestionAsset[];
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
    roleCode?: string;
    branchName?: string | null;
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
  assets?: QuestionAssetInput[];
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
  assets?: QuestionAssetInput[];
}

export type QuestionWorkflowAction = 'submit' | 'approve' | 'request_revision' | 'reject';
