# PRO-LIG Professional Question Studio — V1 Technical Design
Date: 2026-10-11
Status: DESIGN APPROVED FOR PLANNING; NO IMPLEMENTATION OR PRODUCTION RELEASE AUTHORIZED

## 1. Locked V1 scope
1. Structured rich-text composition and continuous preview.
2. Math/scientific-symbol authoring and accessible rendering.
3. Image, diagram and table composition.
4. Curriculum-outcome mapping and pedagogical preflight.
5. Editor revision comments, immutable versions and revision history.

Deferred: multi-select, short answer, matching, open-ended and interactive question types. V1 preserves current four-option single-answer question contract.

## 2. Verified existing baseline
React/Vite/TypeScript; Vercel API handlers; Prisma/PostgreSQL. Question currently has content, options String[], correctAnswer, explanation, objectiveCode, grade, difficulty, status, authorUserId, projectId, imageUrl, assets and compensationEntries. QuestionAsset has questionId, placement, assetType, url, altText and order. API supports drafts, submit, revision, approval and rejection. Current media branch supports URL-based attachments and markup preview; it does not establish a production-grade binary upload system. Existing integration audit reported nine failures, which block release.

## 3. Editor architecture
Use a structured editor document (versioned JSON schema) with nodes for paragraph, headings where appropriate, ordered/unordered lists, text marks (bold/italic/underline), inline/block math, table, image/diagram and link. Render via a shared, read-only rendering pipeline for author preview, editorial review and print preview. Sanitize all user content and URLs, prevent arbitrary HTML, restrict remote embeds. Prototype Tiptap or Lexical with keyboard/accessibility and license/maintenance review before binding implementation. Prototype MathLive for entry and KaTeX or equivalent for rendering; test Turkish locale, screen readers and print/PDF fidelity.

V1 UI: question stem, four options, explanation, curriculum metadata; side-by-side live preview where width allows, stacked layout on mobile; explicit save state and stale write recovery. Use debounce autosave only with conflict-safe revision identifier, status safeguards and resumability.

## 4. Additive database migration
Keep existing Question primary key, status, options, correctAnswer, project, author and compensation relations unchanged. Do NOT overwrite existing plain text fields during migration.

New tables (conceptual):
- QuestionDocument(questionId UNIQUE FK, schemaVersion, stemJson JSONB, optionsJson JSONB, explanationJson JSONB, version INT, updatedAt): structured authored documents for V1 only.
- QuestionRevision(id PK, questionId FK, revisionNumber, documentSnapshot JSONB, metadataSnapshot JSONB, createdById FK User, reason, createdAt, UNIQUE(questionId,revisionNumber)): immutable snapshots on explicit save/submit/revise/approve; include hashes for tamper-evident audit if warranted.
- QuestionReviewComment(id PK, questionId FK, revisionId FK, authorId FK User, blockId nullable, commentText, state, createdAt, resolvedAt nullable): anchored editorial feedback tied to a version.
- QuestionOutcomeAssignment(id PK, questionId FK, curriculumVersionId FK, outcomeId FK, UNIQUE(questionId,outcomeId)): controlled curriculum mappings.
- CurriculumVersion / CurriculumOutcome catalogues with grade, branch, learning area, unit, outcome code and validity/version metadata.
- QuestionPreflightResult(id PK, questionId FK, checkedRevision, ruleSetVersion, findingsJson JSONB, createdAt): machine-checkable requirements with severity.
Existing QuestionAsset may be extended additively with storageKey, mimeType, fileSize, width, height, checksum, ownership/rights flag; retain url as legacy fallback and validate backfill.

All schema changes require a generated Prisma migration reviewed in a disposable/staging DB. No reset, no destructive columns, no production migration without a separate explicit approval.

## 5. Backward compatibility and migration sequence
A. Audit schema, migrations and DB environment, including UserBranchAssignment mismatch.
B. Introduce nullable/new tables and deploy compatibility reads while keeping legacy API shape.
C. On first edit or by audited background batch, convert legacy fields to JSON nodes deterministically; preserve original values unchanged. Record source format and migration result.
D. Dual-render comparison: legacy vs structured text; preserve A-D answer mapping, line breaks, formulas, image order and Turkish characters.
E. New V1 writes update structured document and compatibility projection transactionally with optimistic version check; approval/payments keep existing Question id and workflow semantics.
F. Rollout behind feature flag to pilot writers/editors. Reversible activation (old reader still functional); rollback is code/flag, not dropping migrated data.
G. Do not remove legacy fields until independent later phase and explicit approval.

## 6. Security and data integrity
- Permission checks server-side for author/edit/comment/read/approve. Scope by actor role, branch, location, grade and question status.
- Authors edit only own TASLAK/REVIZYON; editors comment/request revision within authorized scope; no silent editing of author answer by editor.
- Approval snapshots immutable and tied to royalty accrual idempotency; modifications after approval require distinct revision policy.
- File assets: private/object storage with signed upload/download, MIME and signature checks, image resizing, malware scan where available, CSP, ownership and deletion retention policy.
- Prevent stored XSS and SSRF; allowlist embeddable video providers and safe links.
- Autosave/version requests use optimistic concurrency and preserve user changes on HTTP 409.

## 7. Pedagogical controls
Required on submission: curriculum version + outcome, valid grade, exactly four nonempty options, exactly one correct A-D, explanation/rationale per configured editorial policy, no missing image alt text, valid media rights and no unresolved blocking defects. Track difficulty and cognitive level separately. Duplicate/question quality detector is advisory, not automatic rejection. Model AI feedback as suggestions only, human editor retains approval.

## 8. Work packages and acceptance gates
P0 Stability: all existing integration suites pass; lint, typecheck, build pass; test DB isolated; role and workflow transitions correct; no production DB change.
P1 Editor document spike: round-trip structured content for Turkish, marks, math, tables, images and hyperlinks; keyboard and accessibility tests; compatibility preview.
P2 Rich editor + preview: four choices remain intact; stable autosave, no data loss after refresh or 409; <300ms perceived preview for typical item under specified test hardware.
P3 Media/diagram/math: secure upload and durable object references; image captions/alt text; diagram embedded; print and responsive parity; no script execution from content.
P4 Curriculum and preflight: versioned outcomes; server-side check blocks incomplete submissions and reports actionable feedback; existing legacy questions remain readable.
P5 Revision history/review: snapshots immutable; contextual editor notes; revision diff; audit chronology, permissions, and approval-to-compensation invariant tests.
P6 Pilot acceptance: sample bank across math/science/language/social studies; writer and editor sign-off; privacy/accessibility smoke tests; production promotion only after written user acceptance.

## 9. Explicit non-goals
No V1 introduction of new response types, no rewrite of financial/payment model, no AI auto-approval, no production data reset, no merge to main without user sign-off.

## 10. Immediate next actions
1. Resolve existing nine audit test failures and migration discrepancy in isolated environment.
2. Produce editor choice proof-of-concept behind a feature flag without changing legacy save path.
3. Review migration SQL plus rollback and verify read/write compatibility before implementing schema changes.
