# FINAL — P2 isolated browser write UAT: PASS (2026-10-17)

**This run has finished. Do not re-run synthetic CREATE or the exact-ID cleanup for #92.** The original five questions are intact.

### Direct user browser evidence

- Tested on isolated P2 worktree SHA `d7afb11c0a1c60fd51d07b4a2bc538e8549ab16a`; `--preflight` PASS, local guarded `--serve-write` preview, pilot YAZAR assigned to project `PILOT-MAT-8-001`, target `8. Sınıf`.
- User created synthetic multiple-choice Question **#92** in the browser, 4 choices A=10/B=11/C=12/D=13, correct C. List view showed `TASLAK`, Matematik, project assignment and server-injected `P2-UAT-BROWSER-20261017` objective code.
- User reopened, updated only question text, saved and reopened. Independent live Neon SELECT found `5 + 7 işleminin sonucu kaçtır?(P2 düzenleme testi)` while preserving all four options, correct C, explanation and the draft/ownership marker. **Browser CREATE / persist / re-open / PATCH / re-open: PASS.**
- User dry-ran `scripts/p2-browser-acceptance-cleanup.mjs --question-id 92`: `DRY-RUN PASS`, two audit logs, zero media and payment. User explicitly authorized cleanup and executed `--question-id 92 --apply`, receiving `CLEANUP PASS`; removed local write/cleanup approvals.

### Independent final verification (read-only Neon queries)

| Check | Neon main `br-soft-salad-b2vb8sdr` | Isolated acceptance `br-quiet-tree-b2ganqkl` |
| --- | ---: | ---: |
| Total Question rows | 5 | 5 |
| Question #92 | 0 | 0 |
| Browser marker `P2-UAT-BROWSER-20261017%` | 0 | 0 |
| HTTP marker `P2-HTTP-UAT-%` | 0 | 0 |
| Transaction marker `P2-TXN-20261017-%` | 0 | 0 |
| #92 QuestionAsset / CompensationEntry / ActivityLog | 0 | 0 |
| Question digest | `a34adf9c66590a5f7802a1dc8eebbe91` | `a34adf9c66590a5f7802a1dc8eebbe91` |
| Question ActivityLog total | 46 | 47 |
| Old acceptance-only ActivityLog #529 | 0 | 1 |

The unrelated pre-existing `ActivityLog #529` (QUESTION_SUBMITTED for removed old test Question #84) was **not deleted**.

**Scope and rollout:** Only the synthetic 4-choice grade-8 pilot draft was browser-persisted. Browser 5-choice/high-school writes and editor decision persistence were not covered. P2 four-format API↔Neon localhost suite previously achieved **6/6 PASS**, separate from this browser run. PR #32 contains this guarded browser runner and cleanup script, has CI PASS, and **is still open (not merged into the P2 feature branch or main)**. No Production or Neon main changes.

---

# P2 browser write UAT — isolated Neon, synthetic drafts only (2026-10-17)

## Scope and safeguards

- **Feature branch only**, GitHub `feat/p2-professional-question-editor-20261012`, never `main` or Vercel Production.
- Local worktree `D:\Proje\pro-lig-p2-acceptance`. Keep `D:\Proje\pro-lig` untouched (modified logos and untracked assets).
- Pinned Neon acceptance branch `p2-acceptance-20261017`, ID `br-quiet-tree-b2ganqkl`, host `ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech`, database `neondb`. **Neon main prohibited**.
- Private `.env.p2-acceptance.local` stays gitignored; **do not paste passwords/URL/token in chat or GitHub**.
- Write mode only after a pinned **read-only** preflight and explicit local PowerShell approval. Localhost-only `http://127.0.0.1:3138/__p2-uat`, ephemeral pilot login.
- POST and PATCH are allowed **only** for a synthetic test question by `pilot.yazar@prolig.local`, assigned project `PILOT-MAT-8-001`, **8. Sınıf**, `TASLAK`, objectiveCode with server-injected `P2-UAT-BROWSER-20261017` marker.
- Maximum 6 tagged questions; only text (no media). 8th-grade MCQ **4 options only**; TRUE_FALSE and OPEN_ENDED permitted. Five-option persistence already tested by separate 6/6 real HTTP acceptance using a high-school unprojected question; do not force it into this Grade 8 pilot project.
- All question deletion, submission, review, approval, archiving, payment and profile writes are **blocked in the browser service**. Only separate exact-ID cleanup script can remove specifically verified synthetic drafts and their own ActivityLogs; never other data.

## Before first write-mode launch

Stop any running `--serve` preview with Ctrl+C. Confirm test worktree clean:

```powershell
cd D:\Proje\pro-lig-p2-acceptance
git status -sb
git fetch origin
git switch --detach origin/feat/p2-professional-question-editor-20261012
npx prisma generate
node scripts/p2-browser-acceptance.mjs --preflight
```

If preflight PASS, **only with explicit UAT approval**, start:

```powershell
$env:PROLIG_P2_BROWSER_WRITE_APPROVAL="ALLOW_P2_BROWSER_DRAFT_WRITES_IN_ISOLATED_NEON_20261017"
node scripts/p2-browser-acceptance.mjs --serve-write
```

On `http://127.0.0.1:3138/__p2-uat`, select **Pilot YAZAR** (this is a temporary local JWT, not password login). Then open Question Studio.

## Single-question operator acceptance

1. Select project `PILOT-MAT-8-001` (**8. Sınıf**) and `Çoktan Seçmeli`, `4 seçenek · A-D`.
2. Type an obviously synthetic question: `P2 tarayıcı UAT deneme sorusu — 5 + 7 = ?`. Fill A=`10`, B=`11`, C=`12`, D=`13`, answer C and optional explanation.
3. Save as a **draft**. Note the resulting displayed **numeric Question ID** (`#...`). Ensure it displays `P2-UAT-BROWSER-20261017` in objective code when listed; the server adds the marker, not the user.
4. Reload browser, open the same draft by ID, check the four options and correct answer.
5. Edit **only the question text** (e.g. `5 + 7 = ? (P2 tarayıcı güncelleme testi)`), save, reload and verify that options/C remain unchanged.
6. **Do not submit for review / archive / delete / approve.** These paths must remain blocked.
7. Stop the preview via Ctrl+C. Share with ChatGPT **only the Question ID** and PASS/FAIL/error (no secrets). Have ChatGPT independently read-only verify the Neon branch and the synthetic question details before cleanup.

If any operation fails, do not repeatedly create test questions. Inspect first.

## Exact-ID cleanup, separate explicit approval (only after inspection)

First *dry-run only*:

```powershell
node scripts/p2-browser-acceptance-cleanup.mjs --question-id <ID>
```

After confirming the printed owner, project, marker, TASLAK, zero media and zero payments:

```powershell
$env:PROLIG_P2_BROWSER_CLEANUP_APPROVAL="ALLOW_EXACT_P2_BROWSER_TEST_DRAFT_CLEANUP_20261017"
node scripts/p2-browser-acceptance-cleanup.mjs --question-id <ID> --apply
```

The script conditionally deletes exactly this synthetic question plus audit logs tied to **its ID** in one transaction. It does **not** delete the unrelated previously identified isolated-branch historical ActivityLog #529.

Finally clear local approval variables:

```powershell
Remove-Item Env:PROLIG_P2_BROWSER_WRITE_APPROVAL -ErrorAction SilentlyContinue
Remove-Item Env:PROLIG_P2_BROWSER_CLEANUP_APPROVAL -ErrorAction SilentlyContinue
```

Independently recheck that both Neon branches retain their original five questions, no synthetic marker remains, main snapshot hash is unchanged, and no audit log for the disposed question remains. **This is not production release approval.**
