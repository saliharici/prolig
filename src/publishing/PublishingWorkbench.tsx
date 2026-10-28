import type { ApiQuestion } from '../questions/types';
import type { ApiProject } from '../projects/types';
import { PublishingWorkbenchV2 } from './PublishingWorkbenchV2';
import { PublishingWorkbenchV5 } from './PublishingWorkbenchV5';
export type PublishingWorkbenchProps={
  questions:ApiQuestion[];projects:ApiProject[];
  loading:boolean;error:string;onRefresh:()=>Promise<ApiQuestion[]>;
  initialProjectId?:number|null;
};
/** V5 is explicitly Preview-branch-only and cannot be activated by the existing Production V2 flag. */
export function v5PreviewEnabled(env:{VITE_VERCEL_ENV?:string;VITE_PUBLISHING_V5_PREVIEW?:string}):boolean {
  return env.VITE_VERCEL_ENV==='preview' && env.VITE_PUBLISHING_V5_PREVIEW==='true';
}
export function PublishingWorkbench(props:PublishingWorkbenchProps){
  const v5=v5PreviewEnabled(import.meta.env as unknown as {
    VITE_VERCEL_ENV?:string;VITE_PUBLISHING_V5_PREVIEW?:string;
  });
  return v5?<PublishingWorkbenchV5 {...props}/>:<PublishingWorkbenchV2 {...props}/>;
}
