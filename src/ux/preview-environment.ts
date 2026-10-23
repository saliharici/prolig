/**
 * UX-01's representative panel gallery belongs to local/isolated Preview only.
 * Never infer application authorization from this UI gate.
 */
export function isUx01PreviewHostname(hostname: string): boolean {
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^prolig-[a-z0-9-]+-salih22\.vercel\.app$/i.test(hostname);
}

export function allowUx01DesignPreview(): boolean {
  return typeof window !== 'undefined' && isUx01PreviewHostname(window.location.hostname);
}
