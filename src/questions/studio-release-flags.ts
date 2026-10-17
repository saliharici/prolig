/**
 * Frontend release flags for PRO-LIG Question Studio.
 *
 * NO implicit activation: only the literal string "true" enables a feature.
 * The backend independently validates PROLIG_QUESTION_TYPES_P2 and must
 * support the required migration before typed question writes are allowed.
 */
export type QuestionStudioFlagSource = {
  VITE_QUESTION_STUDIO_P1?: string;
  VITE_QUESTION_STUDIO_P1C?: string;
  VITE_QUESTION_STUDIO_P2_EDITOR?: string;
  VITE_QUESTION_STUDIO_P2_TYPES?: string;
  PROLIG_P2_LOCAL_GUARDED_WRITES?: string;
};

export function resolveQuestionStudioFlags(flags: QuestionStudioFlagSource) {
  const p2Editor = flags.VITE_QUESTION_STUDIO_P2_EDITOR === 'true';
  const p2Types = flags.VITE_QUESTION_STUDIO_P2_TYPES === 'true';
  const p1 = flags.VITE_QUESTION_STUDIO_P1 === 'true';
  const p1c = flags.VITE_QUESTION_STUDIO_P1C === 'true';

  return {
    p1Workspace: p1,
    richEditor: p2Editor,
    guidedP2: p2Editor && p2Types,
    durableRecovery: p1 && p1c,
    localGuardedWrites: flags.PROLIG_P2_LOCAL_GUARDED_WRITES === 'true',
    configurationWarnings: [
      ...(p2Editor !== p2Types ? ['P2 editor and typed question UI flags must be enabled together.'] : []),
      ...(p1c && !p1 ? ['P1C encrypted draft recovery requires the P1 workspace flag.'] : [])
    ]
  };
}

