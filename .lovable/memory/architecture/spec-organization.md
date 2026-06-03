Specifications follow a numeric hierarchy: 00-standards (overviews), 01-app-issues (root cause analyses), 02-data-and-api, 03-tasks (roadmap), 04-macro-controller, 05-chrome-extension, and 08-features. All documentation and cross-references must maintain this ordering.

**Top-level spec roots** (each a self-contained tree, numbered for sort order):

- `spec/2026-spec/01-prompt-spec/` — Prompt-management 2026 spec (renamed 2026-06-03 from `spec/2026-spec/01-prompt-spec/`; children densely renumbered `01..20`, no sparse `1N0-` gaps). See `mem://architecture/prompt-spec-2026-layout` for full layout, rename history, and the `scripts/spec/apply-rename-map.mjs` rewriter.
- `spec/21-app/` — host-app spec (incl. `05-prompts/INDEX.json` for tooling).
- `spec/22-app-issues/` — issue RCAs.
- `spec/01-spec-authoring-guide/` — authoring guardrails (incl. `09-exceptions.md` for readme.txt prohibitions SP-1..SP-7).

**Numbering rule for any spec subtree:** dense `NN-name` (no gaps), zero-padded 2 digits; 3-digit numbers reserved for `99-spec-issues/` ledger entries (`200-...`, `300-...`).
