export interface ApiAuditLog {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  logs: ApiAuditLog[];
}
