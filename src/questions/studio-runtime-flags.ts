/**
 * Vite-specific binding for the browser bundle. Keep import.meta.env out of
 * the shared pure policy module used by Node-side TS contract tests.
 */
import { resolveQuestionStudioFlags } from './studio-release-flags';

export const questionStudioReleaseFlags = resolveQuestionStudioFlags({
  VITE_QUESTION_STUDIO_P1: import.meta.env.VITE_QUESTION_STUDIO_P1,
  VITE_QUESTION_STUDIO_P1C: import.meta.env.VITE_QUESTION_STUDIO_P1C,
  VITE_QUESTION_STUDIO_P2_EDITOR: import.meta.env.VITE_QUESTION_STUDIO_P2_EDITOR,
  VITE_QUESTION_STUDIO_P2_TYPES: import.meta.env.VITE_QUESTION_STUDIO_P2_TYPES,
  PROLIG_P2_LOCAL_GUARDED_WRITES: import.meta.env.PROLIG_P2_LOCAL_GUARDED_WRITES
});
