# CI/CD Issue 10 — Release Watcher asset guard used empty version

## Pipeline / Workflow

`.github/workflows/release-watcher.yml`

## Description

The Release Watcher reached its final asset guard with an empty release version,
then checked for impossible asset names such as `marco-extension-.zip`,
`macro-controller-.zip`, and `lovable-dashboard-.zip`.

## First Seen

- Reported: 2026-05-26
- Symptom: `Run set -euo pipefail` failed with `Release  missing asset: marco-extension-.zip` and eight more empty-version asset names.

## Root Cause

`release-asset-guard` referenced `needs.resolve-release.outputs.tag`, but its
only direct dependency was `run-release`:

```yaml
needs: run-release
```

GitHub Actions exposes outputs only for jobs listed directly in the current
job's `needs` context. Because `resolve-release` was only an upstream dependency
of `run-release`, `needs.resolve-release.outputs.tag` evaluated as an empty
string in the guard job. The guard then interpolated `${VER}` into every required
asset filename, producing `marco-extension-.zip` and the other invalid names.

## Status

✅ Resolved — 2026-05-26

## Fix

- Changed `release-asset-guard.needs` to include both direct dependencies:
  - `resolve-release` — provides the resolved release tag output.
  - `run-release` — ensures the canonical release build/upload finished first.
- Added a regression test to `scripts/__tests__/ci-workflow-trigger-policy.test.mjs` that fails if the guard can no longer read the resolved tag.
- Updated the release-assets publish contract memory with the direct-`needs` rule.

## Prevention

- Any workflow job that reads `needs.<job>.outputs.*` must list `<job>` in its own direct `needs`, not only rely on transitive dependencies.
- `release-asset-guard` must keep both `resolve-release` and `run-release` in `needs`.
- The CI workflow trigger policy test now covers this Release Watcher dependency contract.

## References

- `.github/workflows/release-watcher.yml`
- `scripts/__tests__/ci-workflow-trigger-policy.test.mjs`
- `.lovable/memory/constraints/release-assets-publish-contract.md`