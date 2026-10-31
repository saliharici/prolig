// Temporary GitHub CI-only config for the EXACT previously deployed main SHA.
// Used in a throwaway checkout; never deployed or pointed at Neon.
import { defineConfig } from 'prisma/config';
const raw=process.env.DATABASE_URL ?? '';
let url: URL;
try { url=new URL(raw); } catch { throw new Error('RELEASE04_LEGACY_CI_ONLY'); }
if(process.env.CI !== 'true' || !['localhost','127.0.0.1'].includes(url.hostname) ||
   url.pathname !== '/prolig_release03_ci') throw new Error('RELEASE04_LEGACY_CI_ONLY');
export default defineConfig({
  schema:'prisma/schema.prisma',
  datasource:{url:raw}
});
