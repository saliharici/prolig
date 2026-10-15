import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Windows EPERM watcher workaround is opt-in; keep normal hot reload by default.
  // PROLIG_VITE_WATCH_MODE=off disables Vite watching/HMR (restart for changes).
  // PROLIG_VITE_WATCH_MODE=polling uses polling instead of native file events (more CPU).
  // DISABLE_HMR=true remains supported for the existing AI Studio workflow.
  const mode = process.env.DISABLE_HMR === 'true'
    ? 'off'
    : (process.env.PROLIG_VITE_WATCH_MODE ?? 'native');
  const disableWatch = mode === 'off';

  return {
    plugins: [react()],
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
