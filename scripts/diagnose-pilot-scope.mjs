// Compatibility launcher. Prisma generates a TypeScript client in this project.
// Running this script through plain Node cannot import generated/prisma/client.js.
import { spawnSync } from 'node:child_process';
const entry = new URL('./diagnose-pilot-scope.ts', import.meta.url);
const result = spawnSync(process.execPath, ['--import', 'tsx', entry.pathname], { stdio: 'inherit', env: process.env });
if (result.error) {
  console.error('Could not launch read-only diagnostic:', result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
