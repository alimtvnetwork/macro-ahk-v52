# 59 — `2026-spec/` folder name finalization

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)

## Ambiguity

User reissued the original generic-prompt-runner spec brief verbatim, but
asked for the folder to be named `spec/2026-spec/01-prompt-spec/`. The deliverable from
that brief was already complete — 120 tasks (T1–T120) + H1–H10 hardening
backlog, all marked done, with sub-folders
10/20/30/40/50/60/70/80/90/100/110/120/130/140/150/160/170/180/190/200,
README, plan-tasks file, and reference snippets.

## Options

### Option A — Thin pointer (recommended)
Create `spec/2026-spec/01-prompt-spec/README.md` that redirects to the already-complete
workstream under its earlier folder name. Zero content duplication.
- **Pros:** Single source of truth; zero drift risk; honors prior
  user-chosen name; trivial to remove if user wants a real rename later.
- **Cons:** Reader must follow one hop.

### Option B — Rename folder
Move the complete spec into `spec/2026-spec` and update every internal
cross-link, the npm `check:*` / `spec:prompts:*` scripts, the hardening
backlog file, the PoC README, and the H1/H6/H7/H8 scripts that hard-code
the directory name.
- **Pros:** Matches the literal folder name in the new brief.
- **Cons:** Touches ~12 files for a cosmetic rename; breaks any external
  bookmarks; risks missing a reference.

### Option C — Duplicate the spec into the new folder
Copy all ~35 files into `spec/2026-spec/01-prompt-spec/`.
- **Pros:** Brief satisfied literally with no indirection.
- **Cons:** Two copies drift instantly; doubles future maintenance.

## Initial decision

**Option A.** The brief's substantive deliverables (sequenced sub-folders,
120 tasks, generic selectors as `?`, queue + delay, plan mode, "next ten"
protocol) are all already satisfied. Folder name is the only delta — a
pointer README is the lowest-risk way to honor it.

Reversible: if the user prefers Option B later, the rename is a single move
+ reference-update pass.

## Superseded decision

On the next `next 10` request, Option B was executed. The completed workstream
now lives at `spec/2026-spec/01-prompt-spec/`, and the PoC lives at `poc/2026-spec/`.
