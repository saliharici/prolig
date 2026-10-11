# PRO-LIG P1-B — Safe authoring workspace (first increment)

Date: 2026-10-11  
Branch: `feat/question-studio-p1b-safe-workspace-20261011`  
Parent: P1-A opt-in preview branch, visual review commit `79d8895`.

## Scope

P1-B first increment protects local author edits and improves workspace usability. It does **not** add WYSIWYG editing, backend version/ETag concurrency, server autosave, persistent offline drafts, or a schema migration. No merge to `main` or Production release is authorized.

### Safeguards implemented

- HTTP 409 on draft PATCH no longer reopens the form with server-side values. The locally edited question, answers, explanation, project, media remain displayed with a clear unsaved/error warning.
- Form fingerprint tracks question text, level/grade/project, options/answer, explanation, saved media list and pending media fields without sending or storing a second copy anywhere.
- Close button, Cancel button and backdrop use the same dirty-state confirmation; browser reload/navigation warns when the form has unsaved edits (subject to browser limitations).
- Pending save is guarded by a synchronous ref to avoid double submission; submit and close controls are disabled while saving; editor inputs are inert during the request.
- Successful save closes/clears the form only after API success. Other API failures leave the form displayed and editable.
- Browser-only opt-in full-screen layout with larger editing text, responsive stacking, a scrollable review panel and sticky title/actions under `VITE_QUESTION_STUDIO_P1=true`. Legacy feature-flag-off styling remains unchanged.
- New pure `studio-state.ts` fingerprint helper and `tests/question-studio-p1b.test.ts` source + behavior assertions. P1-A 419-test previous baseline stays applicable but must be rerun.

### Limitations

- The form is protected **in memory**. If the browser actually closes/reloads or crashes, its content is not automatically restored. Implement a user- and question-scoped encrypted/retention-aware draft recovery mechanism only after privacy threat modeling and storage policy approval.
- HTTP 409 is not a completed three-way merge; after a conflict user must review latest server question and reconcile intentionally. Do NOT silently overwrite or retry the server state.
- Save/reopen round-trip in an isolated pilot DB has NOT been verified for this new P1-B branch. Automated frontend checks and manual acceptance are required.
- Existing video provider allowlist, image URL restrictions, server permission policy and royalty accounting are outside the first increment's write scope.

## Verify locally

```powershell
cd D:\Proje\pro-lig
git status
git fetch origin
git switch --track origin/feat/question-studio-p1b-safe-workspace-20261011
node scripts/p1-check.mjs
```

If the branch already exists locally, run `git switch feat/question-studio-p1b-safe-workspace-20261011` followed by `git pull --ff-only`. Preserve existing untracked or modified local files; do not use `git reset --hard`.

The gate must report:
- UI and API TypeScript PASS,
- all unit regressions including new P1-B tests PASS (nominally **434** tests: prior 419 plus 15 new cases; rely on actual runner totals),
- Vite build PASS,
- `P1 frontend gate: PASS`.

The P1-B test has 1 fingerprint equality, 11 table-driven changes, 1 options/media, 1 409 source, and 1 UI source case: **15** test cases; therefore previous 419 + 15 = **434**, subject to actual runner counts.

After frontend gate passes, use:
```powershell
$env:VITE_QUESTION_STUDIO_P1="true"
npx vercel dev
```

Manual checks in **isolated pilot** only:
1. New question: type body and options, click X; confirm browser asks before discarding.
2. Cancel on the confirmation dialog: every field remains unchanged.
3. Create a new question, save, navigate to list and reopen; compare A-D answer, body, explanation, table/media. This DB round-trip is separate from frontend gate.
4. Author editing an existing draft: provoke a real 409 by changing status in a second authorized session, then attempt save; ensure the first session's typed content stays in form and the server is not overwritten.
5. During a deliberately slow save, confirm editor fields and Save are unavailable until response.
6. Resize to mobile width; preview stacks beneath edit, footer actions remain accessible, and long table scrolls inside preview.
7. Disable flag and confirm previous modal layout is unchanged. Do not test with unauthorized user or production DB.

Exit: Ctrl+C; `Remove-Item Env:VITE_QUESTION_STUDIO_P1 -ErrorAction SilentlyContinue`.

## Remaining P1-B gates

- Human browser/manual confirmation on pilot environment.
- Accessibility audits: focus trap/return focus, keyboard navigation, screen readers, Turkish IME, undo/redo.
- Proper editor component selection (Tiptap vs Lexical, license/security/locale and bundle review) before WYSIWYG integration.
- Persistent draft recovery / explicit HTTP 409 reconciliation design, backend optimistic version and migrations only after approval.
