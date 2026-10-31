export type TaskStatus = 'Bekliyor' | 'Devam_Ediyor' | 'Kontrol_Bekliyor' | 'Tamamlandi' | 'Gecikti';
export type TaskPriority = 'Dusuk' | 'Normal' | 'Yuksek' | 'Acil';

export interface ApiTask {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  targetQuestionCount: number;
  production?: {
    target: number; written: number; submitted: number; revision: number;
    approved: number; rejected: number; percent: number | null;
  };
  isOverdue: boolean;
  startDate: string;
  dueDate: string;
  completionDate: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: number;
    title: string;
    code: string;
    targetGrade: string;
    branch: { id: number; name: string };
  };
  assignedAuthor: {
    id: number;
    authorProfileId: number;
    fullName: string;
    province: { id: number; name: string; region: string };
    branch: { id: number; name: string };
  } | null;
  assignedUser: {
    id: number;
    fullName: string;
    role: { code: string; name: string };
    province: { id: number; name: string; region: string } | null;
    assignedRegion: string | null;
  } | null;
  canManage: boolean;
  canUpdateStatus: boolean;
}

export interface CreateTaskInput {
  targetQuestionCount?: number;
  title: string;
  description?: string | null;
  projectId: number;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  assignedAuthorProfileId?: number | null;
  assignedUserId?: number | null;
}

export interface UpdateTaskInput {
  targetQuestionCount?: number;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  assignedAuthorProfileId?: number | null;
  assignedUserId?: number | null;
  status?: Exclude<TaskStatus, 'Gecikti'>;
}
