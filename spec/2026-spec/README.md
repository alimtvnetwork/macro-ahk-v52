# 2026 Spec — Root Index

This folder is the entry point for every 2026-dated product, extension, storage,
and delivery specification. A blind AI agent MUST start here, choose exactly one
folder below, then follow that folder's README and child `*.md` contracts before
editing implementation code. This file is intentionally a navigation contract,
not a replacement for the child specs.

## Current Spec Folders

- [`01-prompt-spec/`](./01-prompt-spec/) — Prompt Library plus Next/Plan
  automation loop contracts: prompt source shape, queue lifecycle, delay engine,
  injection behavior, settings, observability, onboarding, tests, and adoption
  checklist.
- [`02-ci-cd-spec-for-chrome-extensions/`](./02-ci-cd-spec-for-chrome-extensions/) —
  Manifest V3 CI/CD and release-hardening contracts: probing, build enumeration,
  artifact packaging, release assets, no committed ZIP files, installation docs,
  troubleshooting, acceptance criteria, and hardening addenda.
- [`03-chrome-ext-features/`](./03-chrome-ext-features/) — Runtime Chrome
  extension feature contracts: Manifest V3 foundations, reload flows, status and
  health panels, script injection lifecycle, namespace logger, idempotency,
  reinjection, error routing, and the floating in-page panel.
- [`03-db-and-sqlite-integration-with-chrome-extension/`](./03-db-and-sqlite-integration-with-chrome-extension/) —
  storage and SQLite integration contracts: storage-tier decision matrix, quota
  behavior, MV3 constraints, bundled `sql-wasm`, namespace database pattern,
  IndexedDB fallback rules, chrome.storage.local usage, error model, logging
  tables, tests, and acceptance criteria.

## Selection Rules

- If the task changes prompt insertion, prompt management, queueing, delay,
  settings, or prompt observability, implement against
  [`01-prompt-spec/`](./01-prompt-spec/).
- If the task changes builds, release workflows, package validation, installer
  behavior, or artifact publishing, implement against
  [`02-ci-cd-spec-for-chrome-extensions/`](./02-ci-cd-spec-for-chrome-extensions/).
- If the task changes visible extension behavior, page injection, status panels,
  reload controls, or runtime error display, implement against
  [`03-chrome-ext-features/`](./03-chrome-ext-features/).
- If the task changes SQLite, IndexedDB, chrome.storage.local persistence,
  namespace databases, quotas, export, or log retention, implement against
  [`03-db-and-sqlite-integration-with-chrome-extension/`](./03-db-and-sqlite-integration-with-chrome-extension/).

## Authoring Rules

- New specs MUST be added as `NN-name/` siblings using the next unused ordinal;
  do not reuse an existing prefix even when legacy folders already share one.
- Each new folder MUST include a README, a machine-checkable `## Acceptance`
  section, at least one concrete `Pitfalls` or `Counter-example` section, and
  relative links to every child contract that an implementer must read.
- Operational numeric defaults MUST bind to
  [`01-prompt-spec/reference/05-runtime-defaults.md`](01-prompt-spec/reference/05-runtime-defaults.md)
  instead of being invented in prose.
- Cross-folder behavior MUST name one owner spec and link to it; duplicate rule
  copies are allowed only as summaries that defer to the owner.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](01-prompt-spec/reference/05-runtime-defaults.md); see also [related](01-prompt-spec/reference/05-runtime-defaults.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

## Acceptance

- [ ] Every sibling `*.md` listed below this index also declares its own `## Acceptance` block (verified by `scripts/audit/check-acceptance.mjs`).
- [ ] All relative links in this file resolve (verified by `scripts/audit/check-dangling-links.mjs`).
- [ ] No operational numeric constant is hardcoded here without binding to `reference/05-runtime-defaults.md` (verified by `scripts/audit/check-must-constants.mjs --strict`).
- [ ] Composite audit score for this folder is `100 / 100` (verified by `scripts/audit/audit-scan.py`).

