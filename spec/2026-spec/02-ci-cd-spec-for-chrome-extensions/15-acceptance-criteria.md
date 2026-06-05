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
