# CI/CD Issues — Index

> Single summary of every CI/CD failure (build, lint, typecheck, test runner, GitHub Actions, release pipeline). Per-issue files live in `.lovable/cicd-issues/XX-name.md`.
>
> **Rule:** check this index before opening a new file — do not duplicate.
> **Lifecycle:** CI/CD issues stay in this folder even after resolution (they recur). Status flips to `✅ Resolved`. Do **not** move to `.lovable/solved-issues/`.

---

## Active

_None — all known CI/CD issues resolved._

## Resolved

| # | File | Title | Pipeline | Status | Resolved |
|---|---|---|---|---|---|
| 01 | [`01-installer-contract-not-in-ci.md`](./cicd-issues/01-installer-contract-not-in-ci.md) | `check:installer-contract` not wired into installer-tests workflow | `.github/workflows/installer-tests.yml` | ✅ Resolved | 2026-04-24 |
| 02 | [`02-release-page-missing-built-assets.md`](./cicd-issues/02-release-page-missing-built-assets.md) | Release page missing built assets (only tag + source archives) | `.github/workflows/release.yml` | ✅ Resolved | 2026-05-18 |
| 03 | [`03-tag-created-out-of-band-does-not-trigger-release.md`](./cicd-issues/03-tag-created-out-of-band-does-not-trigger-release.md) | Tag created out-of-band does not trigger `release.yml` (descriptor → release watcher) | `.github/workflows/release.yml` + `.github/workflows/release-watcher.yml` | ✅ Resolved | 2026-05-18 |
| 04 | [`04-create-event-release-ref-does-not-enter-release-mode.md`](./cicd-issues/04-create-event-release-ref-does-not-enter-release-mode.md) | Create event for `release/*` branch or `v*` tag does not enter release mode | `.github/workflows/release.yml` + `.github/workflows/release-watcher.yml` | ✅ Resolved | 2026-05-18 |
| 05 | [`05-api-created-release-skips-release-yml.md`](./cicd-issues/05-api-created-release-skips-release-yml.md) | API-created GitHub Release skips `release.yml` (only stamped installer + source archives appear) | `.github/workflows/release.yml` | ✅ Resolved | 2026-05-18 |
| 06 | [`06-release-watcher-dispatches-old-tag-workflow.md`](./cicd-issues/06-release-watcher-dispatches-old-tag-workflow.md) | Release watcher dispatches old tag workflow, so asset fixes do not run | `.github/workflows/release-watcher.yml` + `.github/workflows/release.yml` | ✅ Resolved | 2026-05-18 |
| 07 | [`07-release-recovery-is-async-and-not-gated.md`](./cicd-issues/07-release-recovery-is-async-and-not-gated.md) | Release recovery is async and not gated, so source-only releases can remain published | `.github/workflows/release-watcher.yml` + `.github/workflows/release.yml` | ✅ Resolved | 2026-05-18 |
| 08 | [`08-stale-release-tag-cannot-contain-recovery-fixes.md`](./cicd-issues/08-stale-release-tag-cannot-contain-recovery-fixes.md) | Stale release tag cannot contain recovery fixes | `.github/workflows/release-watcher.yml` + `.github/workflows/release.yml` | ✅ Resolved | 2026-05-19 |
| 09 | [`09-ci-not-triggering-on-branch-commits.md`](./cicd-issues/09-ci-not-triggering-on-branch-commits.md) | CI Build not triggering on branch commits (post PR #45) | `.github/workflows/ci.yml` + `.github/workflows/ping.yml` | ✅ Resolved (workflow-side) | 2026-05-26 |
| 10 | [`10-release-watcher-empty-version-guard.md`](./cicd-issues/10-release-watcher-empty-version-guard.md) | Release Watcher asset guard used empty version because `resolve-release` was not in direct `needs` | `.github/workflows/release-watcher.yml` | ✅ Resolved | 2026-05-26 |
| 11 | [`11-audit-releases-ver-placeholder-collision.md`](./cicd-issues/11-audit-releases-ver-placeholder-collision.md) | Audit Releases mangled `VERSION.txt` into `<tag>SION.txt` because the `VER` placeholder collided with the literal substring inside `VERSION.txt` | `.github/workflows/audit-releases.yml` | ✅ Resolved | 2026-05-26 |

## Referenced specs

- [`02 — CI/CD Spec For Chrome Extensions`](../spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/README.md) — generic Manifest V3 CI/CD, release artifact, installer, probing, and no-committed-ZIP standard.


---

## Conventions

- File names: `.lovable/cicd-issues/XX-issue-name.md` (lowercase-hyphenated, numeric prefix starting at `01`).
- Required sections per file: `## Pipeline / Workflow`, `## Description`, `## First Seen`, `## Root Cause`, `## Status`, `## Fix`, `## Prevention`, `## References`.
- Update this index in the **same operation** as creating or modifying any CI/CD issue file.
