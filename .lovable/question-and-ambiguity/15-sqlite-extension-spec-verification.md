# 15 — SQLite ↔ Chrome Extension spec verification

**Asked:** 2026-06-19  •  **Status:** open (logged under No-Questions Mode)

## User request

Verify the spec documents — end to end — how a Chrome extension works
with the SQLite databases: which plugin, every step, integration
between layers. Confirm the spec is "done properly."

## Current state in repo

- `spec/05-split-db-architecture/` — has `00-overview.md`,
  `01-fundamentals.md`, `02-features/`, `03-issues/`, acceptance
  criteria + changelog. Covers the split-DB model.
- `spec/23-database/` — only `00-overview.md`, `diagrams/`, `images/`,
  `readme.md`. **Thin.** No step-by-step "extension → SQLite" wire-up.
- `docs/diagrams/sqlite-bundle-erd.mmd`, `sqlite-bundle-flow.mmd` exist
  but are not linked from a narrative.
- Memory: `mem://architecture/data-storage-layers` mentions a 4-tier
  storage model (SQLite, IndexedDB, localStorage, chrome.storage.local)
  but the SQLite plumbing (sql.js? wa-sqlite? OPFS persistence?
  background vs offscreen doc? message bus? schema migration?) is not
  consolidated in spec form.

## Gap

There is **no single spec file** that walks through:

1. Which SQLite engine/plugin is used (sql.js / wa-sqlite / better-…).
2. Where the DB lives (OPFS, IndexedDB-backed VFS, in-memory + export).
3. Which extension context owns it (service worker? offscreen
   document? content script bridge?).
4. The message-relay path (page ↔ content ↔ background ↔ DB).
5. Schema/migration ownership and versioning.
6. Backup / export / import lifecycle.
7. Failure modes (worker eviction, OPFS unavailable, corrupted DB).

## Options

- **A. Author `spec/23-database/01-extension-sqlite-integration.md`**
  as the canonical end-to-end guide and link the existing diagrams
  into it. *Recommended.* Pros: closes the gap exactly where the user
  pointed. Cons: ~1–2 turns of focused work, needs code spelunking to
  confirm the engine + VFS choice.
- **B. Extend `spec/05-split-db-architecture/01-fundamentals.md`** with
  the wire-up. Pros: keeps split-DB content co-located. Cons: that
  folder is about *splitting* the DB, not about how the extension
  talks to it — semantic mismatch.
- **C. Defer.** Pros: nothing. Cons: leaves the user's reported gap
  open and violates "go deep" rule from `12-next-steps-v7.md`.

## Recommendation

Pick **A**. Next planning turn should spawn a focused plan (e.g.
`plan 10`) that: (1) reads `src/background/` + the SQLite bundle
modules to identify the actual engine, (2) reads the existing diagrams,
(3) writes `spec/23-database/01-extension-sqlite-integration.md`
covering the 7 points above, (4) cross-links from
`spec/05-split-db-architecture/00-overview.md`.

## Why logged, not asked

Active rule: **No-Questions Mode** (see `mem://workflow/no-questions-mode`).
Log to `.lovable/question-and-ambiguity/` instead of calling
`ask_questions`.
