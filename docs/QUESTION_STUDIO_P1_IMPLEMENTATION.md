# PRO-LIG — P1 Structured Question Studio (implementation and acceptance)

Date: 2026-10-11
Branch: `feat/question-studio-p1-structured-preview-20261011`
Base: P0 core-closed `6fe4dc33e457c93466af05c7716eb1196fe703cd`

## Scope and release boundary

P0 core accepted: 405 non-DB tests and 34 executed pilot-DB integration tests pass; 5 settlement DB cases remain skipped. No Production release of P0 or P1 was authorized.

P1 is delivered incrementally. This branch's first increment is a *read-only, opt-in structured preview spike* to test compatibility and rendering. It does **not** migrate the database, add rich editing libraries, replace question save APIs, or change question ownership/workflow/royalty behavior.

## P1-A — implemented in branch; needs local verification

- `src/questions/studio-document.ts`: typed v1 document: paragraph, list, table and inline text, bold, italic, underline, TeX source and HTTPS link. Deterministic adapter from existing legacy markup. The full original source fields and all original answer options are preserved for exact round trip even for incomplete/historical records.
- `src/questions/StudioDocumentPreview.tsx`: React text-escaped preview, mobile scrollable semantic table, answer choices, explanation, media placement using current asset renderer. Links open with `noopener noreferrer`; unsafe hrefs are inert text. TeX is shown as accessible source **not typeset math yet**.
- `src/questions/studio-preview.css`: scoped styling.
- `src/DemoApp.tsx`: new renderer behind `VITE_QUESTION_STUDIO_P1=true`; default uses untouched legacy preview. Existing question POST/PATCH contract is unchanged.
- `tests/question-studio-p1.test.ts`: conversion, exact CRLF/Turkish preservation, incomplete/extra options, lists/tables, escaped pipes, unsafe links, escaping, accessible math/table source and feature flag.

## Operator verification — first increment

```powershell
cd D:\Proje\pro-lig
git status
git fetch origin
git switch feat/question-studio-p1-structured-preview-20261011
git pull --ff-only
npm run lint
npx vitest run --exclude "tests/integration/**"
npm run build
```

If there are local uncommitted changes, preserve them before `git switch` (do not reset). Do not enable Production or change `DATABASE_URL` for this spike.

To visually test the experimental preview **on local dev only**:

```powershell
$env:VITE_QUESTION_STUDIO_P1="true"
npm run dev
# Open the local Vite URL, sign in using an authorized pilot account,
# open the question creation form and compare with the legacy view.
# When finished: Ctrl+C, then:
Remove-Item Env:VITE_QUESTION_STUDIO_P1 -ErrorAction SilentlyContinue
```

Never paste secrets or pilot passwords into a test report. Flag off = unchanged legacy preview.

## Risks and acceptance gates

| Risk | Mitigation and gate |
| --- | --- |
| Legacy questions altered/lost | Read-only conversion; exact raw field round-trip tests. No DB write/migration. |
| Stored XSS / unsafe links | React escaping, HTTPS/credential policy and negative render tests; run browser security review. |
| Broken A-D grading | Preserve existing 4-choice save and correct-answer fields; no altered API payload. |
| Unauthorized edit or workflow bypass | Existing server-side role checks unchanged; P0 core integration must remain green. |
| Non-ASCII and multiline damage | Turkish/CRLF/empty-line compatibility assertions; add broader corpus tests. |
| Math misrepresentation | TeX source fallback labeled explicitly; no claim of mathematical typesetting until KaTeX/MathLive PoC. |
| HTML table/media responsiveness | Semantic table, keyboard focus and constrained scroll; browser/mobile QA pending. |
| Data loss from autosave / HTTP 409 | Autosave and structured writes intentionally deferred until optimistic-lock contract and recovery UI. |
| Deploy surprise | Feature flag off by default; branch isolation and separate Production approval. |
| Baseline regressions | Must pass lint, build, full non-DB suite, and pilot DB suites before merge. |

## Next implementation increments — not done yet

1. **P1-B Editor selection**: investigate Tiptap vs Lexical + math input and licensing/bundle. Choose one based on actual keyboard/IME composition (Turkish), undo history, copy/paste sanitation, table controls and accessibility prototype. Add dependency lockfile and tests together; do not silently replace existing editor.
2. **P1-C Math**: MathLive or editor math node and KaTeX-based preview; reject invalid formulas gracefully and retain source on failure. Add math/science corpus tests including fractions, roots, integrals, physical units and print layout.
3. **P1-D Media/diagrams**: server-validated media storage and ownership; image alt text and rights, SVG sanitization, accessible diagram editing.
4. **P1-E Versioned persistence**: additive Prisma migration only after staging validation; immutable snapshots, optimistic concurrency (`409`), legacy projection and reversible feature flag. Audit and protected workflow states preserved.
5. **P1-F Pedagogical preflight**: curriculum version/outcome catalog and server-side validation before submit; advisory checks vs blocking rules; no auto-approval.
6. **P1-G Editorial revisions**: anchor comments to immutable revision IDs, audit chronology, no changes to approved questions or compensations without explicit policy.
7. **P1-H Acceptance**: pilot author/editor scenario matrix and mobile/keyboard/print/accessibility QA; full regression including previously skipped settlement coverage if settlement becomes release-critical.

## Operational restrictions

No branch merge, Production Vercel promotion or DB mutation without explicit user acceptance. The independent doctoral research platform remains a separate project and separate database.
