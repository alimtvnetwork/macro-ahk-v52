# Marco Chrome Extension v3.92.0

## Changed

- Plan inventory correction: archived the two prompt-macro plans that were already complete but still outside `completed/`.
- Remaining open plan narrowed to exactly one file: `projects-modal-15-step-improvement.md`.
- Added a current-cursor header to that open plan: Task 1 is the Projects Modal overview/spec.

## Verification

- Before: `ls .lovable/plans/` showed three apparent pending files.
- After: `ls .lovable/plans/` shows only `projects-modal-15-step-improvement.md` plus folders.
- `node scripts/check-version-sync.mjs` → `✅ All versions in sync: 3.92.0`.
