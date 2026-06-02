# Audit Progress

| Batch | Steps | Status | Summary |
|-------|-------|--------|---------|
| 1     | 1–10   | done    | Foundations OK; **High**: `.lovable/coding-guidelines.md` is only ~20% of spec. **Med**: `mem://index.md` missing `what-to-read` + numbering rule; `17-consolidated` misleading; audit JSON has no freshness gate; SP-1..SP-7 parity untested. **Low**: dup `04-` prefix, missing cross-links. |
| 2     | 11–20  | done    | 🔴 **Critical** S13: 24 files use `console.error`, 0 use namespace `Logger.error` — rule has ~0% compliance. **High** S12 (CODE RED unenforced), S19 (no-retry unenforced). **Med** S14/17/20 (no schema/contract tests). **Low** S11/15/16/18. |
| 3     | 21–30  | done    | 🔴 **High** S27: OPFS module **not found** in `src/` despite memory claim — drift. **Med** S22 (legacy/current acceptance ambiguity), S24 (63 direct `chrome.storage.local` consumers, no facade), S28 (no central key registry). **Low** S21/23/25/26/29/30 — tests/snapshots missing but contracts holding. Supabase mentions are false-positives (scanning Lovable storage). |
| 4     | 31–40  | done    | 🔴 **High** S37: Post-move credit sync has partial test coverage; Copy-JSON `/credit-balance` wrapper for pro_0+pro_1 lacks explicit test. **Med** S32 (10s budget magic-number), S35 (no negative test against workspace `*_limit` for pro_0), S38 (TTL untested at boundary). **Low** S31/33/34/36/39/40 — contracts in place, hardening tests needed. Auth contract well-adopted (5 modules use `getBearerToken`, 0 legacy callers in src/). |
| 5     | 41–50  | done    | 🟡 **Med** S50: failure-log shape lacks central Zod schema (links to S14). **Low** S41 (no changelog in macro-recorder spec), S42 (no editable-surface ignore test), S43 (no event-coverage test), S44 (no round-trip property test), S46 (only AC-19-2/-3 covered), S48 (no visual regression), **S49 missing test file** for hover-highlighter (violates test-with-features). Recorder subsystem otherwise very strong — 21 spec docs, dedicated `llm-guide.md`, dense test coverage. |
| 6     | 51–60  | done    | 🔴 **High** S57 (no `builtin-script-guard` test — violates test-with-features), S60 (no enforcement of timer-teardown rule, blind LLM will leak). 🔴 +1 to S13 backlog: `injection-cache.ts` uses `console.log`. **Med** S52 (no world-boundary lint), S53 (no typed message catalog), S54 (no `InjectionStage` enum/E2E), S56 (no invalidation test), S58 (no `.require()` audit), S59 (no status enum/snapshot). **Low** S51, S55. ✅ **Strong**: new-tab guard (S55) — 5 clean callers, dedicated test. |
| 7     | 61–70  | done    | ✅ **Strongest subsystem so far** — alongside new-tab guard (S55) and recorder (S41–50). 🟢 **Strong**: S61 (CI push trigger, 3 layers), S63 (build lock), S68 (release self-heal), S70 (PascalCase ban). 🟡 **Med** S62 (no single VERSION SOT — bump-version mutates many files), S64 (no in-config comment for `emptyOutDir:false`), S65 (no lint for `node:` dynamic imports in Vite hooks), S67 (52 check/audit scripts but no registry/README), S69 (failure-log validator is fixture-only, not runtime — reinforces S14/S50). 🟢 **Low** S66. No critical findings. |
| 8     | 71–80  | done    | 🔴 **High** S77: Lovable's default design prompt recommends `framer-motion` but memory `style/animation-strategy` bans external animation libs — blind LLM following Lovable defaults **will** install it. No preinstall block. ✅ **Strong**: S71 (dark-only actively enforced — strips `light` class on mount), S73 (CSS sentinel), S80 (14 design-system specs). 🟡 **Med** S72 (no raw-color component audit), S74 (no selector-strategy lint), S75 (no naming-prefix lint), S76 (no React-in-content-scripts boundary), S79 (no badge-state snapshot). 🟢 **Low** S78. |
| 9     | 81–90  | done    | 🔴 **High** S81 (3+ plan locations: `plan.md` 561L, `.lovable/plan.md` 20L, `.lovable/plan-26-…`, `.lovable/plans/` — SOT ambiguity), S88 (read-only `skipped/`+`.release/` is prose-only, no `.gitattributes`/CI guard — blind LLM will violate), S90 (recurring S5: coding-guidelines only ~20% of spec). 🟡 **Med** S82 (suggestions split across 3 paths), S83 (duplicate `01-`/`02-` prefixes in question-and-ambiguity + no README.md despite Core rule requiring one), S85 (readiness reports unenforced), S86 (no README structure check), S89 (index missing `what-to-read` pointer — repeat S5/S6). ✅ **Strong**: S87 (readme.txt SP-1..SP-7 with 3 mirrors + dedicated test). 🟢 **Low** S84. |
| 10    | 91–100 | done    | ✅ **AUDIT COMPLETE.** 🔴 **High** S95, S96, S97, S99. 🟡 **Med** S91, S93, S94. 🟢 **Low** S92, S98. **Verdict: ~60 % blind-LLM ceiling; top-7 fixes raise it to 80–85 %.** |
| 11    | 101–110 | done   | **Verification + drift corrections.** Verified: S13 (24 vs 3 Logger = 11 % compliance, not 0 %), S27 (OPFS = labels/stubs only, no `getDirectory()` call), S77 (clean now, no guard), **S96 PERF-1 already fixed** (downgrade), S97 (27 dirs, range 00–32 not 00–08), S88 (4 workflows consume `.release/`, none guard), S60 (no audit script). Final remediation order: S13 · S88 · S77 · S60 · S81 · S95 · S27. Memory corrections needed: PERF-1 status, spec range (00→32), OPFS claim. |

---

## Batch A (Remediation Steps 1–10) — Completed 2026-06-02

Executed first 10 steps of `remediation-plan.md`:

| # | Finding | Action | Artifact |
|---|---|---|---|
| 1 | S81 plan SOT | `.lovable/plan.md` → pointer; v3.50.0 roadmap merged into `plan.md` | `.lovable/plan.md`, `plan.md` (+22 lines) |
| 2 | S97 spec range drift | Memory updated 00–08 → 00–32 + audit script | `mem://architecture/spec-organization`, `scripts/audit-spec-range.mjs` |
| 3 | S96 PERF-1 stale | Memory marks PERF-1 RESOLVED | `mem://performance/idle-loop-audit-2026-04-25` |
| 4 | S27 OPFS claim | Memory corrected: SQLite-only, OPFS not implemented | `mem://architecture/session-logging-system` |
| 5 | S98 deferred bans | Memory: only P Store deferred; React+manual-Chrome bans LIFTED | `mem://preferences/deferred-workstreams` |
| 6 | S93 Phase 2b/2c | Canonical label fixed to "Phase 2b" | `mem://architecture/instruction-dual-emit-phase-2b` |
| 7 | S5/S6/S89 entry point | Created blind-AI reading order doc | `spec/00-what-to-read-first.md` |
| 8 | S82 suggestions split | Canonical path enforced in memory | `mem://workflow/suggestions-convention` |
| 9 | S83 Q&A folder | README + dup-prefix register | `.lovable/question-and-ambiguity/README.md` |
| 10 | Wrap | This summary | `progress.md` |

**Verification:**
- `.lovable/plan.md` now 11 lines (pointer only); `plan.md` grew to ~583 lines.
- `node scripts/audit-spec-range.mjs` reports `00–32 (27 dirs)`.
- 4 memory files updated reflecting reality, not aspiration.
- Blind LLM starting at `spec/00-what-to-read-first.md` now has an unambiguous path through the spec.

**Subsystem ceiling delta (estimated):**
- Workflow/meta: 45% → 65% (+20)
- Logging: 5% → 5% (S13 not yet executed; Batch C target)
- Spec navigation: ~50% → 85% (new entry doc + corrected drift)

Remaining: Batches B (steps 11–20), C (21–30), D (31–40), E (41–50).
