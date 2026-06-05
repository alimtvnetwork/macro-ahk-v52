# Remediation Backlog

## Closed machine signals

- `node scripts/audit/check-acceptance.mjs` → every source spec has a machine-checkable Acceptance section.
- `node scripts/audit/check-dangling-links.mjs` → every inline and reference-style relative Markdown link resolves.
- `node scripts/audit/check-constant-divergence.mjs` → copied constant assignments match runtime defaults.
- `node scripts/audit/check-must-constants.mjs` → operational numeric constants bind to runtime defaults or memory.
- `node scripts/audit/check-must-memory-refs.mjs` → every MUST/SHALL spec cites a `mem://` owner.
- `node scripts/audit/check-cross-folder-owners.mjs` → cross-folder topics cite their canonical owner.
- `node scripts/audit/check-quarantine.mjs` → every quarantined draft declares a Graduation Plan.
- `node scripts/audit/check-pitfalls.mjs` → every source spec includes a pitfall/counter-example signal.
- `node scripts/audit/check-score-floor.mjs` → every source spec scores ≥100 and composite stays ≥99.5.
- `node scripts/audit/check-score-snapshot.mjs` → per-file scores and composite never regress below `scores.snapshot.json`.
- `node scripts/lint/no-bare-fetch.mjs` → direct network calls require a documented guard or wrapper.
- `node scripts/audit/check-footer-lint.mjs` → audit footer markers must include their promised sections.
- `node scripts/audit/render-reports.mjs` → this audit directory is reproducible from current scores.
- `.github/workflows/spec-audit.yml` → all audit checks above are wired into CI.

## Remaining qualitative work

_None. Final full audit verification is complete and pinned by the snapshot hash in `99-final-score.md`._
