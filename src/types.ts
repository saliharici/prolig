// Shared TypeScript types for PRO LİG platform

export type RoleCode = 
  | 'SUPER_ADMIN'
  | 'GENEL_KOORDINATOR'
  | 'IL_KOORDINATORU'
  | 'EDITOR'
  | 'YAZAR'
  | 'MUHASEBE'
  | 'YONETICI';

export type UserRole = RoleCode;

export type AuthorStatus = 'Aktif' | 'Pasif' | 'Beklemede' | 'Arşiv' | string;
export type ProjectStatus = 'Taslak' | 'Planlama' | 'Devam Ediyor' | 'Kontrol' | 'Tamamlandı' | 'Arşiv' | string;
export type TaskStatus = 'Bekliyor' | 'Yapılacak' | 'Devam Ediyor' | 'Kontrol Bekliyor' | 'Kontrol' | 'Tamamlandı' | 'Gecikti' | string;
export type PriorityLevel = 'Düşük' | 'Normal' | 'Yüksek' | 'Acil' | string;
export type PaymentStatus = 'Bekliyor' | 'Beklemede' | 'Onaylandı' | 'Ödendi' | 'İptal' | string;

export interface Role {
  id: number;
  code: RoleCode;
  name: string;
  description: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role_code: RoleCode;
  role_name?: string;
  province_id?: number;
  province_name?: string;
  avatar_url?: string;
  phone?: string;
  status: string;
  created_at: string;
}

export interface Province {
  id: number;
  code: string;
  name: string;
  region: string;
  author_count?: number;
  active_author_count?: number;
}

export interface District {
  id: number;
  province_id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
  category: string;
  color: string;
  author_count?: number;
}

export interface Institution {
  id: number;
  name: string;
  province_id: number;
  type: string;
}

export interface Author {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_photo?: string;
  province_id: number;
  province_name?: string;
  district_id?: number;
  district_name?: string;
  branch_id: number;
  branch_name?: string;
  institution_id?: number;
  institution_name?: string;
  title?: string;
  experience_years?: number;
  status: AuthorStatus;
  notes?: string;
  biography?: string;
  iban?: string;
  assigned_projects_count?: number;
  completed_tasks_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: number;
  title: string;
  code?: string;
  project_type?: string;
  coordinator_id?: number;
  coordinator_name?: string;
  progress?: number;
  deadline?: string;
  target_end_date?: string;
  status: ProjectStatus;
  priority?: PriorityLevel;
  target_grade?: string;
  branch_id?: number;
  branch_name?: string;
  description?: string;
  authors_count?: number;
  authors?: { id: number; name: string; branch: string; photo?: string }[];
  tasks_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  assigned_to_author_id?: number;
  assigned_author_id?: number;
  assigned_author_name?: string;
  assigned_author_photo?: string;
  author_first_name?: string;
  author_last_name?: string;
  author_branch_name?: string;
  assigned_coordinator_id?: number;
  assigned_coordinator_name?: string;
  project_id: number;
  project_title?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  start_date?: string;
  due_date: string;
  completion_date?: string;
  created_at?: string;
}

export interface Payment {
  id: number;
  author_id: number;
  author_name?: string;
  author_first_name?: string;
  author_last_name?: string;
  author_branch_name?: string;
  author_province_name?: string;
  author_iban?: string;
  project_id?: number;
  project_title?: string;
  contract_no?: string;
  amount: number;
  currency?: string;
  payment_type?: string;
  status: PaymentStatus;
  payment_date?: string;
  invoice_no?: string;
  description?: string;
  notes?: string;
  created_at?: string;
}

export interface FileRecord {
  id: number;
  filename?: string;
  file_name?: string;
  file_size: number | string;
  file_type: string;
  file_url: string;
  uploader_name?: string;
  project_id?: number;
  project_title?: string;
  author_id?: number;
  author_name?: string;
  category?: string;
  created_at?: string;
  upload_date?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  sender_name?: string;
  receiver_id?: number;
  receiver_name?: string;
  recipient_id?: number;
  subject: string;
  body: string;
  is_read?: boolean;
  is_archived?: boolean;
  created_at?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority?: PriorityLevel;
  audience?: string;
  published_at?: string;
  is_archived?: boolean;
  created_by?: string;
  created_at?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'task' | 'project' | 'payment' | 'message' | 'system' | string;
  link?: string;
  is_read: boolean;
  created_at?: string;
}

export interface ActivityLog {
  id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: string;
  created_at: string;
}

export interface DashboardStats {
  totalAuthors: number;
  totalProvinces: number;
  activeProjects: number;
  completedProjects: number;
  activeAuthors: number;
  totalPaymentsAmount: number;
  completedTasksRate: number;
  upcomingDeadlines: {
    id: number;
    title: string;
    project_title: string;
    deadline: string;
    remaining_days: number;
    priority: PriorityLevel;
    status: string;
  }[];
  provinceDistribution: {
    province_name: string;
    province_id: number;
    author_count: number;
    percentage: number;
  }[];
  branchDistribution: {
    branch_name: string;
    color: string;
    author_count: number;
    percentage: number;
  }[];
  recentAuthors: Author[];
}
