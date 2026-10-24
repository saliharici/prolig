import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  // Windows EPERM watcher workaround is opt-in; keep normal hot reload by default.
  // PROLIG_VITE_WATCH_MODE=off disables Vite watching/HMR (restart for changes).
  // PROLIG_VITE_WATCH_MODE=polling uses polling instead of native file events (more CPU).
  // DISABLE_HMR=true remains supported for the existing AI Studio workflow.
  const mode = process.env.DISABLE_HMR === 'true'
    ? 'off'
    : (process.env.PROLIG_VITE_WATCH_MODE ?? 'native');
  const disableWatch = mode === 'off';

  // Vercel supplies VERCEL_ENV during builds. Replace this non-secret marker
  // at compile time; a production bundle must not trust a Preview-shaped URL.
  // Unknown build environments fail closed, including local production builds.
  const deploymentTarget = process.env.VERCEL_ENV === 'preview'
    ? 'preview'
    : process.env.VERCEL_ENV === 'production'
      ? 'production'
      : !process.env.VERCEL_ENV && command === 'serve'
        ? 'local-dev'
        : 'unknown';

  return {
    plugins: [react()],
    define: {
      __PROLIG_DEPLOYMENT_TARGET__: JSON.stringify(deploymentTarget),
      // Optional user-facing link; cannot enable backend recovery or bypass account checks.
      __PROLIG_UX03_PRODUCTION_UI_ENABLED__: JSON.stringify(
        deploymentTarget === 'production' &&
        process.env.VITE_UX03_PRODUCTION_RECOVERY_UI_ENABLED === 'true'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: !disableWatch,
      watch: disableWatch
        ? null
        : mode === 'polling'
          ? { usePolling: true, interval: 1000 }
          : {},
    },
  };
});
