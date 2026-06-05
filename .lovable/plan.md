# Plan — Fix `check-forbidden-timezones.mjs` to allow documented counter-examples

**Created:** 2026-06-05
**Type:** Tooling / CI check correction
**Trigger:** Checker correctly enforces "no hardcoded timezone", but flags the spec/memory documentation that *teaches* the rule using `Asia/Kuala_Lumpur` as the explicit ❌ counter-example. Code is correct; the test/checker is over-broad. Fix the checker, not the docs.

## Root cause

`scripts/check-forbidden-timezones.mjs` matches forbidden tokens line-by-line with no exception for lines that are clearly demonstrating the anti-pattern next to the canonical fix. The 60+ "failing" lines all follow the shape:

> ❌ `Asia/Kuala_Lumpur` … ✅ render with `Intl.DateTimeFormat(...).resolvedOptions().timeZone`

A line that documents both the bad and the good pattern is, by construction, a counter-example — not a violation.

## Design decision

Whitelist by **content signal**, not by file path (path allowlists rot). A line is treated as a documented counter-example and skipped iff it contains **either**:

1. The canonical safe-render marker `Intl.DateTimeFormat().resolvedOptions().timeZone`, OR
2. An explicit inline allow comment: `<!-- allow-timezone-example -->` (escape hatch for rare cases that need to mention a zone without also citing the fix).

This keeps the checker strict against real violations (any hardcoded zone in code, configs, runtime helpers) while honoring the memory rule that the docs MUST teach the anti-pattern.

## 15 Steps

1. Re-read `scripts/check-forbidden-timezones.mjs` and `scripts/__tests__/check-forbidden-timezones.test.mjs` to confirm current line-iteration shape and matcher precedence.
2. Confirm the full failing list (60+ lines) all live under `spec/2026-spec/**` and `mem://localization/timezone` and all cite `Intl.DateTimeFormat().resolvedOptions().timeZone` on the same line — i.e. classify as "documented counter-example" not real leak.
3. Add two skip constants near the top of `check-forbidden-timezones.mjs`:
   - `SAFE_RENDER_MARKER = 'Intl.DateTimeFormat().resolvedOptions().timeZone'`
   - `INLINE_ALLOW_MARKER = '<!-- allow-timezone-example -->'`
4. In the per-line loop, `continue` to next line when the raw line includes either marker — before running the FORBIDDEN_PATTERNS regex sweep. Keep the existing token matching otherwise unchanged.
5. Update the script's header comment to document the two-marker escape hatch and the rationale (counter-example pedagogy is required by the timezone memory).
6. Extend `scripts/__tests__/check-forbidden-timezones.test.mjs` with three new cases:
   (a) line with `Asia/Kuala_Lumpur` AND `Intl.DateTimeFormat().resolvedOptions().timeZone` → PASS (skipped),
   (b) line with `Asia/Kuala_Lumpur` AND `<!-- allow-timezone-example -->` → PASS (skipped),
   (c) line with `Asia/Kuala_Lumpur` alone → FAIL (still flagged).
7. Run the test file (`node --test scripts/__tests__/check-forbidden-timezones.test.mjs`) — all existing + 3 new tests must pass.
8. Run the actual checker (`node scripts/check-forbidden-timezones.mjs`) against the repo. Expect: exit 0; previously-flagged 60+ lines silently skipped because each contains the safe-render marker.
9. If any line still flags, inspect it; only legitimate violations remain. Either remove the hardcoded zone from that line or, if it is genuinely pedagogical and lacks the fix snippet, append the inline allow marker — do not blanket-suppress.
10. Verify no real code path regressed: `rg -n 'Asia/Kuala_Lumpur|Kuala_Lumpur|MYT|UTC\+8|\+08:00' src/ standalone-scripts/ chrome-extension/ 2>/dev/null | rg -v 'Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone'` returns empty — runtime code is still clean.
11. Re-run the full spec link checker and structure check (`node scripts/report-spec-links-ci.mjs` and `node scripts/check-spec-readme-structure.mjs --strict`) to confirm no collateral damage.
12. Append a one-line entry to the `changelog.md` v3.53.0 "Fixed" section: "Forbidden-timezone scanner now skips lines that pair the anti-pattern with the canonical local-render snippet — unblocks the documented counter-examples mandated by `mem://localization/timezone`."
13. Update memory: append a clarifying note to `mem://localization/timezone` (or its referenced file) explaining the two-marker escape hatch so future authors know how to write counter-examples safely. Index core rule remains unchanged.
14. Scan `.lovable/pending-issues/` and `.lovable/plans/` for any open tasks that reference timezone or this checker; append unresolved items below in the Pending Tasks section and resolve sequentially.
15. Final sanity: run the same audit gates surfaced in the failing CI run (spec-links, spec-readme-structure, changelog-entry, perf-budget if relevant) and confirm green. Close the task in the plan with a one-line resolution note.

## Pending Tasks (carried forward)

- **P Store deferred workstream** (`spec/21-app/02-features/misc-features/pstore-marketplace.md`) — DO NOT auto-pick; user-deferred per `mem://preferences/deferred-workstreams`. Leave as-is.
- **Priority 0.8 id-denylist quarantine retirement** — 183 exact-file entries + 3 glob quarantines remain. Continue post-completion of this fix.
- **Optional minisign release signing** — blocked on `MINISIGN_SECRET_KEY` provisioning. Leave deferred; not actionable here.

No pending tasks specific to this fix block its execution.

## Ambiguity / Open Questions

None. The user's intent is explicit: the checker is wrong to flag documented counter-examples; fix the checker, not the docs. The two-marker design preserves the strict ban on real hardcoded zones in runtime code while honoring the pedagogical requirement of the memory rule.
