# Marco Chrome Extension v3.97.0

## Fixed

- **Projects Modal CSV project names now fall back to the open Lovable tab name**
  when `projects.list` returns a blank/id-only name. The CSV keeps the API name
  when present, uses the open-tab project name when available, and only emits the
  project id when no human-readable name exists.
- Added an info log: `Projects: CSV project-name fallback used for N row(s)`.

## Files changed

- `standalone-scripts/macro-controller/src/ui/projects-modal.ts`
- `standalone-scripts/macro-controller/src/__tests__/projects-modal-csv.test.ts` (new)

## Verification

- Before: missing project names were collapsed to project ids in `fetchProjects()`
  and CSV exported that id.
- After: `projects-modal-csv.test.ts` proves list names win, id-only names use
  open-tab fallback, and id remains only when no real name exists.
- `bunx vitest run standalone-scripts/macro-controller/src/__tests__/projects-modal-csv.test.ts`
  → **1 file, 3 tests passed**.
- `node scripts/check-version-sync.mjs` → ✅ All versions in sync: 3.97.0.

---

(See `changelog.md` for full history.)
