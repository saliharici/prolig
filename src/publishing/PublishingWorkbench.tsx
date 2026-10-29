import type { ApiQuestion } from '../questions/types';
import type { ApiProject } from '../projects/types';
import { PublishingWorkbenchV2 } from './PublishingWorkbenchV2';
import { PublishingWorkbenchV5 } from './PublishingWorkbenchV5';
import { v5PreviewEnabled } from './publishing-v5-gate';
export type PublishingWorkbenchProps={
  questions:ApiQuestion[];projects:ApiProject[];
  loading:boolean;error:string;onRefresh:()=>Promise<ApiQuestion[]>;
  initialProjectId?:number|null;
};
export function PublishingWorkbench(props:PublishingWorkbenchProps){
  const v5=v5PreviewEnabled(import.meta.env as unknown as {
    VITE_VERCEL_ENV?:string;VITE_PUBLISHING_V5_PREVIEW?:string;
  });
  return v5?<PublishingWorkbenchV5 {...props}/>:<PublishingWorkbenchV2 {...props}/>;
}
