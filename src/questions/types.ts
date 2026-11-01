import type { QuestionTypeFields } from '../../shared/question-contract';
export type { QuestionType } from '../../shared/question-contract';
export type QuestionStatus = 'TASLAK' | 'INCELEMEDE' | 'REVIZYON' | 'ONAYLANDI' | 'REDDEDILDI';

export type QuestionAssetPlacement = 'STEM' | 'OPTION_A' | 'OPTION_B' | 'OPTION_C' | 'OPTION_D' | 'OPTION_E' | 'EXPLANATION';
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

export interface ApiQuestion extends QuestionTypeFields {
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
  isPersonal?: boolean;
  personalSubject?: string | null;
  personalTopic?: string | null;
  /** Optional in legacy question fixtures; API returns taskId when available. */
  taskId?: number | null;
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

export interface CreateQuestionInput extends QuestionTypeFields {
  taskId?: number | null;
  isPersonal?: boolean;
  personalSubject?: string | null;
  personalTopic?: string | null;
  content: string;
  grade: string;
  options: string[];
  correctAnswer: string | null;
  projectId: number | null;
  objectiveCode?: string | null;
  difficulty?: string | null;
  explanation?: string | null;
  assets?: QuestionAssetInput[];
}

export interface PatchQuestionInput extends QuestionTypeFields {
  /** Mandatory for PATCH: last server question revision observed by the author. */
  expectedUpdatedAt: string;
  personalSubject?: string | null;
  personalTopic?: string | null;
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
