export type AuthorStatus = 'Aktif' | 'Pasif' | 'Beklemede' | 'Arsiv';

export interface ApiAuthor {
  id: number;
  userId: number;
  fullName: string;
  title: string;
  experienceYears: number;
  status: AuthorStatus;
  branch: { id: number; name: string };
  province: { id: number; name: string; region: string };
  district: { id: number; name: string } | null;
  institution: { id: number; name: string; type: string } | null;
  activeProjectCount: number;
  projectGrades: string[];
}
