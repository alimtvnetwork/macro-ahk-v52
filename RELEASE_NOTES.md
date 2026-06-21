# Marco Chrome Extension v3.93.0

## Changed

- Projects Modal 15-step plan: cursor advanced to Task 3. Tasks 1 (overview spec) and 2 (Q52 `projects.get` 405 fix) were already shipped; the plan file now reflects their completed status.

## Verification

- `node scripts/check-version-sync.mjs` → ✅ All versions in sync: 3.93.0.
- Spec file present at `standalone-scripts/macro-controller/spec/projects-modal/00-overview.md` (105 lines).
- `projects-modal.ts:728-735` documents the 405 root cause and removal of the per-project call.

---

(See `changelog.md` for full history.)
