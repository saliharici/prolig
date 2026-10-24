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

/** Server-ordered page of ActivityLog records; nextCursor is null at the end. */
export interface AuditLogPage extends AuditLogResponse {
  nextCursor: number | null;
}
