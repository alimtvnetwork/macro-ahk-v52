# 2026 Spec — grouping folder

This folder groups all 2026-dated specs. Each spec lives in its own
numbered subfolder.

## Contents

- [`01-prompt-spec/`](./01-prompt-spec/) — Prompt Library + Next/Plan
  automation loop spec (host-agnostic). 120 tasks, 6/6 lint gates green.
- [`02-ci-cd-spec-for-chrome-extensions/`](./02-ci-cd-spec-for-chrome-extensions/) — generic Manifest V3 CI/CD and release-hardening spec, merged/indexed from `../12-cicd-pipeline-workflows/`.

Add future 2026 specs as `NN-name/` siblings (`03-`, `04-`, …) and link
them here.

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

