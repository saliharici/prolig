export type ProjectStatus = 'Taslak' | 'Planlama' | 'Devam_Ediyor' | 'Kontrol' | 'Tamamlandi' | 'Arsiv';
export type ProjectPriority = 'Dusuk' | 'Normal' | 'Yuksek' | 'Acil';

export interface ApiProject {
  id: number;
  title: string;
  code: string;
  projectType: string;
  coordinatorId?: number | null;
  canManage?: boolean;
  progress: number;
  deadline: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  targetGrade: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  branch: { id: number; name: string };
  authors: Array<{
    id: number;
    fullName: string;
    authorProfileId: number;
    province: { id: number; name: string; region: string };
  }>;
}

export interface CreateProjectInput {
  title: string;
  code: string;
  projectType: string;
  deadline: string;
  priority: ProjectPriority;
  targetGrade: string;
  branchId: number;
  description?: string | null;
  authorProfileIds: number[];
}

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  progress?: number;
  status?: Exclude<ProjectStatus, 'Arsiv'>;
};
