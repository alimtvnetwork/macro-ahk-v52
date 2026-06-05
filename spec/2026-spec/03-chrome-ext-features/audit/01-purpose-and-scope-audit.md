# Audit 01 — `01-purpose-and-scope.md`

- **Spec under audit:** `spec/2026-spec/03-chrome-ext-features/01-purpose-and-scope.md`
- **Auditor focus:** How blindly can an AI/LLM implement the contained obligations without escalating to a human?
- **Scoring rubric (0–100):**
  - Clarity of contract (25)
  - Determinism / unambiguous wording (25)
  - Completeness of acceptance criteria (20)
  - Cross-references resolvable from within the repo (15)
  - Pitfalls + counter-examples (15)

## Critical score: **62 / 100**

| Dimension | Score | Notes |
|---|---|---|
| Clarity of contract | 18 / 25 | Sets vocabulary, audience, and reading order well, but is a meta/intro doc — no implementable contract of its own. |
| Determinism | 17 / 25 | "Should ship", "production-grade", "baseline" are soft words. AI cannot detect a violation from them. |
| Completeness of acceptance | 6 / 20 | No checklist. Guiding principles list 5 rules but none is testable here (each is delegated downstream). |
| Cross-references | 13 / 15 | Names sibling folders (`02-ci-cd-spec-for-chrome-extensions/`, `03-db-and-sqlite-integration-with-chrome-extension/`) — but those paths are not verified to exist in this repo. |
| Pitfalls | 8 / 15 | No counter-example, no "do not do this" block. |

## Gap analysis (detailed)

### G1 — Scope numbering mismatch (HIGH)
"In scope (the 20 features)" then lists only **8 bullets**. Each bullet bundles multiple features (e.g. bullet 5 packs five). An AI counting steps 01–20 will not be able to map bullets→step files deterministically.

**Fix:** Replace bullets with an explicit table mapping `step NN → file → feature name` for all 20.

### G2 — "20 features" vs actual 20-step plan (HIGH)
The folder is built as 20 numbered specs (`01`…`20`). This file never publishes that mapping. An LLM told to "implement step 14" cannot infer the feature name from this doc alone.

**Fix:** Add an authoritative `Index` section listing every `NN-slug.md` with one-line description. Reference `README.md` is not enough — duplicate inline for offline LLM consumption.

### G3 — Sibling-folder references are unverified (MEDIUM)
Cites `02-ci-cd-spec-for-chrome-extensions/` and `03-db-and-sqlite-integration-with-chrome-extension/`. Neither is asserted to exist; an AI following the pointer may file-not-found and stall.

**Fix:** Either confirm the folders exist in `spec/2026-spec/` or mark them as `(future)` so the LLM does not block.

### G4 — Vocabulary lacks normative anchors (MEDIUM)
"Sentinel", "Code Red", "Build id" are defined narratively but not bound to a TypeScript symbol, attribute name, or storage key. AI will invent names.

**Fix:** Each vocab entry needs a canonical identifier, e.g.
- Sentinel → DOM attribute `data-riseupasia-macro-ext-injected="<buildId>"`
- Build id → `RiseupAsiaMacroExt.BUILD_ID` constant, exported from `src/shared/build-id.ts`.

### G5 — Guiding principle 4 conflicts with principle 5 wording (LOW)
"Tests ship with features" but the doc itself ships no test. Acceptable for a meta doc, but should explicitly exempt itself: "This file is non-implementable; no test obligation."

### G6 — Audience says "any extension" but repo is product-specific (MEDIUM)
The spec claims vendor-neutrality, yet downstream specs reference `RiseupAsiaMacroExt` namespace, `chrome.storage.local` keys, and the `gitsync` workspace API. AI will be confused whether to generalize or hard-code.

**Fix:** Add a paragraph: "Implementations in this repo MUST use the `RiseupAsiaMacroExt.*` namespace; forks may rename it but must keep the contract."

### G7 — No machine-readable acceptance (HIGH for auditability)
No checkbox list, no `acceptance:` frontmatter. Downstream specs (07, 08, 11, 12, 13) all have checklists; this one breaks the pattern.

**Fix:** Add minimum:
```
## Acceptance (meta)
- [ ] Every step 01..20 file exists.
- [ ] README.md index lists all 20 with the same slug.
- [ ] No step references a sibling folder that does not exist.
```

### G8 — "No remote code" principle missing CSP example (LOW)
States the rule but does not show the `manifest.json` `content_security_policy` value that enforces it. AI may forget the CSP line.

### G9 — "No retries without permission" has no enforcement hook (MEDIUM)
Cross-reference to `mem://constraints/no-retry-policy` exists in project memory but not in this file. AI working from spec only will not know there is a project-wide ESLint/audit rule.

**Fix:** Cite the lint rule or audit script path (e.g. `scripts/audit-retry-policy.mjs` if any).

### G10 — Reader assumption "knows MV3 manifest shape" too generous (LOW)
This is acceptable, but pair with a 5-line minimal `manifest.json` reference in step 02 — and link it from here.

## Blocker list for blind AI implementation

1. Cannot enumerate 20 steps from this file alone (G1, G2).
2. Cannot resolve all sibling folder references (G3).
3. Cannot derive canonical identifiers (G4).
4. No acceptance checkbox (G7).

## Recommendation

Promote this file from "narrative intro" to "normative index": add the 20-row table, canonical identifier table, sibling-folder existence check, and an `Acceptance (meta)` block. With those four changes the score rises to ~88/100; without them, an LLM will silently drift on naming and step counting.

## Remaining audit items

1. 02-manifest-v3-foundations
2. 03-folder-and-file-layout
3. 04-version-display-and-build-stamp
4. 05-extension-reload-manual
5. 06-extension-reload-auto-on-file-change
6. 07-status-and-health-panel
7. 08-script-injection-lifecycle
8. 09-injection-idempotency-sentinel
9. 10-reinject-and-uninject
10. 11-error-logging-discipline
11. 12-namespace-logger-contract
12. 13-error-routing-and-panel
13. 14-boot-failure-banner (spec pending)
14. 15-floating-in-page-panel (spec pending)
15. 16-storage-sqlite-pointer (spec pending)
16. 17-storage-indexeddb-pointer (spec pending)
17. 18-storage-chrome-local-pointer (spec pending)
18. 19-testing-matrix (spec pending)
19. 20-acceptance-criteria (spec pending)
