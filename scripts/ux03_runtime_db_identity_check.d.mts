/** Types for the operator-only ESM probe; no production API or route is exposed. */
export interface IdentityReport {
  production_runtime: boolean;
  deployed_sha_matches: boolean;
  deployment_identity_matches: boolean;
  approved_neon_endpoint: boolean;
  approved_database_name: boolean;
  read_only_database_connection: boolean;
  connected_database_matches: boolean;
  MATCH: boolean;
}
export const EXPECTED: Readonly<{
  deploymentId: string; deploymentUrl: string; projectId: string; sha: string;
  neonProjectId: string; neonBranchId: string; database: string; directHost: string;
}>;
export function checkRuntimeIdentity(options?: {
  env?: Record<string, string | undefined>;
  Client?: new (options: unknown) => {
    connect(): Promise<void>;
    query(sql: string): Promise<{rows: Array<{db?: string}>}>;
    end(): Promise<void>;
  };
}): Promise<IdentityReport>;
