# Spec Contributor Guide

Status: Normative · v1.0.0 · 2026-06-02

Welcome. This guide is the single entry point for contributing to
`spec/21-app/05-prompts/**`. Read this first; everything else is referenced.

## 1. Before you start
- Read `README.md` for subsystem overview.
- Check `OWNERSHIP.md` for who must review your area.
- Skim `GLOSSARY.md` + `ACRONYMS.md`.

## 2. Decide change type (SemVer)
Per `macros/governance/10-versioning-deprecation.md`:
- **PATCH** — typo, example, clarification → no schema/grammar/IDs touched.
- **MINOR** — additive (new optional field, new StepKindId, new doc).
- **MAJOR** — breaking. Requires MIGRATION doc + deprecation window.

## 3. Author the change
- Place docs under correct topic dir; use numeric prefix (`10-`, `11-`, …).
- Every normative doc starts with: `Status:` line + version + date.
- Use semantic tokens (no raw colors) when UI is involved.
- Schemas live in `macros/json/`; engine logic in `macros/engine/`.
- Forbidden: hardcoded retries, light-theme assumptions, Supabase refs, readme.txt edits with time/clock values.

## 4. Wire tests
Per `mem://preferences/test-with-features`:
- Add unit fixture → `macros/testing/10-unit-test-inventory.md`
- Component → `11-component-test-inventory.md`
- E2E → `12-e2e-test-inventory.md`
- Race scenarios → `15-race-fixture-pack.md` + JSON in `fixtures/race/`

## 5. Run gates locally
```bash
node scripts/spec/lint-cross-refs.mjs
node scripts/spec/build-index.mjs
node scripts/spec/check-perf-budget.mjs
node scripts/spec/smoke-rescore.mjs
```
All must exit 0 before PR.

## 6. PR checklist
Follow `RELEASE-CHECKLIST.md` strictly. Required:
- Updated `Status` + version on every edited normative doc
- CHANGELOG entry under correct SemVer bucket
- `INDEX.json` regenerated and committed
- BLIND-AI-SMOKE-TEST still 20/20

## 7. Reviewer assignment
CI uses `.github/CODEOWNERS` (derived from `OWNERSHIP.md`).
Schema/security touching → mandatory second reviewer.

## 8. Post-merge
- Tag `spec-v<major.minor.patch>`
- Update memory pointers (`mem://features/prompt-macros`, `prompt-variables`) if surface changed
- File close-out note in `99-spec-issues/`

## 9. When in doubt
- File an entry in `99-spec-issues/` describing the ambiguity.
- Do NOT silently widen schemas or matrix entries.
- Security/guards changes always require Security sign-off.
