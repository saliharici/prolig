# PRO-LIG P1-C — Opt-in encrypted local draft recovery

Date: 2026-10-11
Branch: feat/question-studio-p1c-encrypted-draft-recovery-20261011
Baseline: P1-B — 437/437 non-database tests PASS and 4/4 user-verified in-memory pause/resume checks.

## Scope and release boundaries

The goal is to recover unsaved authoring work after browser reload or closing/reopening the browser, on the SAME browser profile and origin, without introducing server-side drafts or database migrations.

Feature is disabled unless BOTH \`VITE_QUESTION_STUDIO_P1=true\` and \`VITE_QUESTION_STUDIO_P1C=true\` are set. The user must then explicitly enter a separate recovery passphrase (minimum 12 characters) and choose to enable it for the current question.

No main merge, Production deployment, seed, migration, settlement, financial, role or workflow backend change is included.

## Security and privacy model

- Data is encrypted locally with AES-256-GCM and per-write random salt and nonce; passphrase derivation uses PBKDF2/SHA-256 with 210,000 iterations.
- The browser localStorage envelope has version, owner ID/email, question ID, creation/expiry times, salt, IV and ciphertext. Question text, options, answer, solution, media form fields, original project ID, baseline and server revision are INSIDE the ciphertext. The passphrase is kept only in current in-memory JavaScript state and input; it is NOT stored in localStorage or sent to an API.
- Storage is scoped by authenticated account ID + normalized email + question ID. Restoring a saved question requires it to be visible and editable under existing server access rules. Local encryption does NOT replace server-side authorization.
- Seven-day rolling expiration; malformed/expired storage entries are rejected and removed when inspected. Individual records are limited to 60,000 characters before encryption.
- Opt-in is per form/session: disabled by default on fresh browser sessions. The user must remember their separate passphrase to recover ciphertext after reload. Without it, the local draft cannot be decrypted.
- Autosave is debounced by 1.2 seconds. On explicitly pausing the form, the final draft is encrypted before allowing the form to close; errors keep the form open. A guard prevents encryption started before successful server save from re-creating the storage record. Successful POST/PATCH removes its matching encrypted local draft.
- After recovering a saved-question draft, compare the original server \`updatedAt\` with the latest fetched question. If they differ, the recovered content stays visible but the Save action is locked; user may copy it to reconcile or explicitly discard it and reopen the current server version. No automatic overwrite.
- **Threat model limit:** encryption with a human-entered passphrase protects against casual localStorage inspection and accidental cross-user disclosure. It does not protect against compromised browser extensions, keyloggers, active XSS on the origin or malware while the passphrase is entered. localStorage metadata still exposes account ID/email, question ID and timestamps. Do not enable on shared or untrusted computers. Do not reuse the account password.
- **Reliability limit:** localStorage can be disabled, evicted, cleared or quota-limited; app cannot promise data survives these events. The last 1.2 seconds of active edits may be absent if the user force-closes without using "Ara ver"; beforeunload warning is best-effort. It is a recovery aid, NOT authoritative backend autosave or a backup.
- Local storage belongs to one origin and browser profile: different localhost port, Vercel preview URL, another machine/browser, incognito profile or clearing site storage cannot read it. The previous P1-B in-memory pause/resume continues working without P1-C opt-in.

## Files

- src/questions/studio-durable.ts — storage key, authenticated owner binding, envelope validation, AES-GCM/PBKDF2 encrypt/decrypt, TTL, deletion, late-write prevention.
- src/DemoApp.tsx — two-feature-flag gate, opt-in/password input, encrypted autosave, pause flush, recovery, stale lock, matching save deletion.
- src/questions/studio-state.ts — retains the in-memory stale revision lock across pause/reopen.
- src/questions/studio-durable.css — scoped UI styles.
- tests/question-studio-p1c.test.ts — nine new tests including browser crypto-backed encryption roundtrip, tampering, TTL, scope, password and source gate.
- Existing three P1-B/legacy tests adjusted for the new disabled/busy state.

## Frontend verification on user PC

\`\`\`powershell
cd D:\Proje\pro-lig
git status
git fetch origin
git switch --track origin/feat/question-studio-p1c-encrypted-draft-recovery-20261011
node scripts/p1-check.mjs
\`\`\`

If the local branch already exists, use git switch followed by git pull --ff-only. Never reset --hard; preserve README.txt and docs/PROLIG_CURRENT_STATE_AUDIT.md untracked artifacts.

Expected: TypeScript/lint PASS; 47 existing + 1 new test file, 446/446 tests (437 + 9); Vite build PASS; P1 frontend gate PASS. **These are targets, NOT verified results until the user supplies the log.** P1 check does not run database integration.

## Local visual acceptance

After the automated gate succeeds:
\`\`\`powershell
$env:VITE_QUESTION_STUDIO_P1="true"
$env:VITE_QUESTION_STUDIO_P1C="true"
npx vercel dev
\`\`\`

With an authorized local pilot YAZAR account:
1. Open New Question, write stem + four options + explanation; add project and media. Without enabling P1-C, confirm old "Ara ver" memory-only behavior still works.
2. Enter a unique test recovery passphrase of at least 12 characters, NOT the platform password, and enable encryption. After at least 3 seconds idle, "Ara ver" and confirm. The form should close after encryption has completed.
3. Re-open the same form and confirm memory recovery. Reload page / close and reopen the browser. After login and opening New Question on SAME origin, the UI should detect a "Kopya bulundu"; enter the same recovery passphrase and choose "Şifreli taslağı kurtar." Verify all fields.
4. Wrong passphrase: user gets an error and encrypted entry remains intact. Retry with correct passphrase.
5. Verify switching to a different authorized user does NOT offer the other user's encrypted entry. Switch back and recover. Existing question edits should be restored only from the matching ID.
6. Save a valid question against an explicitly isolated pilot database only after database identity is confirmed. Check no encrypted copy remains for that question. If not isolated, skip all actual POST/PATCH.
7. Existing edited question changed by another authorized session: recovery detects mismatched updatedAt and disables Save, with an explicit manual reconciliation warning.
8. Feature flag OFF: legacy preview and P1-B memory-only flow remain unaffected.

Limitations requiring separate design: server-side optimistic concurrency/ETags, cross-device synchronization, accessibility/keyboard focus, backend persistence, offline multi-record draft inventory, restoration of inaccessible status-changed server records, hard browser crash within debounce window, mathematical WYSIWYG.

No production promotion without manual and backend pilot acceptance.
