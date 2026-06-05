# 15 — Acceptance Criteria

> The binding acceptance criteria that gate the spec.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §40. Acceptance criteria (binds the whole spec)

1. `./spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/` exists.
2. Spec is generic and repo-agnostic; all paths are relative.
3. The forty planning steps (§0) are written before the detailed sections.
4. Download script, install script, and probing feature are documented with
   runnable examples (§18, §19, §20).
5. Example GitHub Actions workflow YAML is included and supports one or many
   extensions via `strategy.matrix` (§22, §23).
6. The "never commit any asset ZIP" rule is stated as a strict guideline (§26)
   and enforced via `.gitignore` (§27).
7. README writing guidance plus a template is included (§29, §30).
8. Any AI agent, given only this folder plus an extension folder, can implement
   the CI/CD and produce downloadable release artifacts with no gaps.

---

## Acceptance

- [ ] The implementation satisfies the `15 — Acceptance Criteria` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

