export type ProjectStatus = 'Taslak' | 'Planlama' | 'Devam_Ediyor' | 'Kontrol' | 'Tamamlandi' | 'Arsiv';
export type ProjectPriority = 'Dusuk' | 'Normal' | 'Yuksek' | 'Acil';

export interface ApiProject {
  id: number;
  title: string;
  code: string;
  projectType: string;
  progress: number;
  deadline: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  targetGrade: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  branch: { id: number; name: string };
  authors: Array<{
    id: number;
    fullName: string;
    authorProfileId: number;
    province: { id: number; name: string; region: string };
  }>;
}
