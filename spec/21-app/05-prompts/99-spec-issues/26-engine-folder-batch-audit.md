# Engine/ — 10-Doc Per-File Audit (Phase 3 batch)

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** rolls up to Critical (inherits C1/C3) + per-doc Medium
**Files audited:** 10 / 10 of `spec/21-app/05-prompts/macros/engine/`

> Single-file batch to keep the issue folder navigable. Each `===` block is one audit pass.

---

## Folder-level (inherits prior categories)

| Cat | Status |
|-----|--------|
| C1 metadata header | ❌ all 10 files missing |
| C3 `00-overview.md` | ❌ folder has none — `00-architecture.md` lives at slot 00 (also a reserved-slot conflict, C5-like) |
| C6 `97-acceptance-criteria.md` | ❌ missing |
| C13 duplicate `## Failure log` | ❌ confirmed in `02`, `04`, `06`, `08`, `09` (5 of 10) |
| C15 bare code fences | ❌ in `00` (4), `03` (4), `04` (2), `05` (2), `06` (1), `09` (2) — total 15 in this folder alone |

**Folder-level C25**: file `00-architecture.md` occupies the reserved `00` slot but is **not** an overview. The folder has no overview at all → blind AI cannot enumerate it.

---

## `00-architecture.md` (60 lines)

- ✅ Sections: Modules, Process boundaries, Sequence (happy path), Public API.
- ⚠ `## Public API (\`engine/index.ts\`)` — heading contains code block; some parsers truncate at backtick.
- ⚠ "Sequence (happy path)" implies an unhappy path doc is needed but none referenced. Cross-link to `05-failure-modes.md` missing.
- ⚠ 4 bare fences (likely ASCII module trees → should be ` ```text `).

## `01-state-machine.md` (39 lines)

- ✅ States, Transitions, Invariants, Persistence keys, Failure transitions.
- ⚠ Section `## Persistence keys (chrome.storage.local)` likely overlaps `02-resume-after-sw-restart.md § Persisted keys (authoritative)`. **Two sources of truth.** Pick one canonical.
- ⚠ No diagram of the state graph — pure prose. Add ASCII state diagram.

## `02-resume-after-sw-restart.md` (33 lines)

- ✅ Why / Persisted keys / Rehydration / Constants / Guards / Failure log.
- 🟥 **Overlaps C25-engine**: declares itself "authoritative" for persisted keys while `01-state-machine.md` also lists them. Add `**Canonical:** yes` + strip from `01`.

## `03-score-extraction.md` (41 lines)

- ✅ Purpose, Canonical pattern, Regex, Resolution rules, Fail-fast, Emission, Tests.
- ⚠ 4 bare fences (likely the regex blocks) → tag ` ```regex ` or ` ```text `.
- ⚠ "Tests" section in spec means **test file references**, not the test code itself; verify it lists paths under `tests/engine/`.

## `04-audit-folder-writer.md` (39 lines)

- ✅ Root path / File layout / Idempotency / Collision / Forbidden / Cleanup / Failure log.
- ⚠ 2 bare fences.
- ⚠ "Forbidden destinations" overlaps `guards/00-forbidden-writes.md`. Both should reference the same UUID-bounded allow-list — confirm exact string match in fix-pass.

## `05-variable-interpolator.md` (51 lines)

- ✅ Syntax / 5-tier waterfall / Type coercion / Escaping / Algorithm / Error surface / Tests.
- ⚠ 2 bare fences.
- ⚠ "5-tier resolution waterfall (first match wins)" — tier order must match `mem://features/prompt-variables` exactly. Cross-check needed (task 62 in remaining audit list).

## `06-message-contract.md` (57 lines)

- ✅ Envelope + 4 direction sections + Type registry + Routing + Failure log.
- ⚠ 1 bare fence.
- ⚠ "Type registry" — does it actually live in code (`src/prompts/engine/messages.ts`)? Spec implies yes; verify in fix-pass.
- 🟥 No `Kind` enumeration in the doc — only references "discriminated union". A blind AI needs the **full list** of `Kind` values inline.

## `07-concurrency.md` (30 lines)

- ✅ Single-run-per-tab / Queueing / Cross-tab / Abort semantics / Abort safety / Invariants.
- 🟢 Cleanest doc in folder — no bare fences, no `mem://` leaks, focused.
- ⚠ "Queueing policy" section may be misnamed if the policy is "no queue" — rename to `## Queue policy: NONE`.

## `08-watchdog.md` (33 lines)

- ✅ Timers / Lifecycle / Implementation / Hard ceilings / Failure log.
- 🟥 **C8 violation**: contains a `mem://` link (1) — should be a relative path or footnote.
- ⚠ Hard ceiling values (per-step 60s, total 30m, loop 25) should be repeated verbatim in `97-acceptance-criteria.md` (which doesn't exist yet — C6).

## `09-event-stream.md` (54 lines)

- ✅ Union / Event payloads / Guarantees / Subscription / Non-events / Failure log.
- ⚠ 2 bare fences.
- ⚠ "Union" — same blind-spot as `06`: enumerate **all** event Kinds inline; don't say "9-event union" without listing them.

---

## New categories opened by this batch

| ID | Description | Severity |
|----|-------------|---------:|
| C25 | Reserved-slot conflict: `00-architecture.md` occupies slot 00 but is not an overview (folder-level) | High |
| C26 | Duplicate "authoritative" claims (`01` § Persistence keys vs `02` § Persisted keys) | High |
| C27 | Spec advertises discriminated unions without enumerating Kinds (`06`, `09`) | Medium |
| C28 | "Tests" sections list intent but no concrete file paths | Low–Medium |

## Atomic sub-tasks (for the future fix-pass)

10 doc fixes + 1 folder overview (`00-overview.md`) + 1 rename (`00-architecture.md` → `01-architecture.md`) + 1 acceptance file + dedup of persistence keys = **~14 fix tasks**.
