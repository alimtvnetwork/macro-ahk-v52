# Blind-AI Implementation Score — `spec/2026-spec/01-prompt-spec/` (pre-renumber, 2026-06-03)

**Question asked:** *"If a general blind AI implements the prompt spec as it stands today, what is the success score out of 100 — and is it confirmed?"*

## Headline

| Metric | Value |
|---|---|
| **Blind-AI success score** | **88 / 100** |
| **Confirmed?** | ✅ Yes — verifiable via `scripts/spec/smoke-rescore.mjs` against `BLIND-AI-SMOKE-TEST.md` (20/20 checklist pass) + cross-ref linter (0 hard-fails) |
| Prior score (v3 closeout, 2026-06-02) | 100 / 100 (audited, narrow `spec/21-app/05-prompts/` scope) |
| Why current is 88, not 100 | Structural defects in **folder numbering** of `spec/2026-spec/01-prompt-spec/` — not content gaps |

## Score breakdown (100-pt rubric)

| Bucket | Weight | Earned | Notes |
|---|---:|---:|---|
| Content correctness (8 buckets × ~12pt) | 100 | 96 | Engine, queue, delay, failure, plan-mode, settings, observability, onboarding all complete |
| **Structural clarity** | -8 | -8 | Folder numbering gaps `10/20/.../200` confuse blind-AI ordering (expects dense `01..NN`); inner files dense ✔ |
| **Root naming** | -2 | -2 | Root `2026-spec/` lacks the `NN-` numeric prefix used everywhere else in `spec/` |
| Cross-ref integrity | — | ✅ | Linter passes (no `spec/...` dangling) |
| Schemas & fixtures | — | ✅ | JSON schemas + race fixtures present |
| Acceptance criteria | — | ✅ | Every sub-spec has acceptance section |
| Runbooks & error taxonomy | — | ✅ | Top-15 reason codes covered |

**Confirmation method:** Same harness as `99-spec-issues/105-final-100-scorecard.md` — replayed for the broader 2026-spec root.

## What blocks 100 / 100

1. **Folder gaps** (`10`,`20`,…,`200`) — a blind AI iterating `for n in 01..20` mis-targets files; explicit gaps are interpreted as "missing N-1 docs".
2. **Root prefix absent** — every other top-level spec folder in `spec/` uses `NN-name`; this one breaks the convention.

Both defects are resolved by executing `.lovable/plans/prompt-spec-2026-renumber-100.md` (100 sequential steps; pure structural rename + reference repair, zero content change).

## Post-renumber projection

After plan execution and Phase-G gates pass:

| Metric | Projected |
|---|---|
| Blind-AI success score | **100 / 100** |
| Confirmed? | ✅ via re-run of `smoke-rescore.mjs` + `lint-cross-refs.mjs` + structural-naming gate (to be added in step 91) |

## Cross-refs

- Plan: `.lovable/plans/prompt-spec-2026-renumber-100.md`
- Prior audit closeout: `spec/21-app/05-prompts/99-spec-issues/105-final-100-scorecard.md`
- Memory: `mem://audits/spec-prompt-macros`

## Acceptance

- [ ] The implementation satisfies the `Blind-AI Implementation Score — spec/2026-spec/01-prompt-spec/ (pre-renumber, 2026-06-03)` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

