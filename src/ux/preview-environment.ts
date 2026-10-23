/**
 * UX-01 design gallery is a representative Preview-only surface, never a login
 * or authorization bypass. Production deployments cannot opt in by hostname.
 */
type DeploymentTarget = 'preview' | 'production' | 'local-dev' | 'unknown';
declare const __PROLIG_DEPLOYMENT_TARGET__: DeploymentTarget;

export function isUx01PreviewHostname(hostname: string, target: DeploymentTarget): boolean {
  if (target === 'local-dev') {
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  if (target !== 'preview') return false;
  return /^prolig-[a-z0-9-]+-salih22\.vercel\.app$/i.test(hostname);
}

export function allowUx01DesignPreview(): boolean {
  return typeof window !== 'undefined' &&
    isUx01PreviewHostname(window.location.hostname, __PROLIG_DEPLOYMENT_TARGET__);
}
