/** Isolated V5 editor gate: Production V2 flag must never imply V5 enablement. */
export function v5PreviewEnabled(env:{
  VITE_VERCEL_ENV?:string;VITE_PUBLISHING_V5_PREVIEW?:string;
}):boolean {
  return env.VITE_VERCEL_ENV==='preview' && env.VITE_PUBLISHING_V5_PREVIEW==='true';
}
