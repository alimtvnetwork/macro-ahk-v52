# CI/CD Issue 03 — Tag created out-of-band does not trigger release.yml

## Pipeline / Workflow

`.github/workflows/release.yml` (canonical) + new `.github/workflows/release-watcher.yml`

## Symptom

Release tag `vX.Y.Z` exists on origin and `.gitmap/release/vX.Y.Z.json` is
committed on main, but the Release page on GitHub shows only the auto-generated
**Source code (zip/tar.gz)** archives. None of `marco-extension-*.zip`,
`macro-controller-*.zip`, installers, or `checksums.txt` are uploaded.

Observed on `v3.1.0` (2026-05-18): `.gitmap/release/v3.1.0.json` has
`"assets": []` and the Release page is asset-less.

## Root Cause

`release.yml` triggers only on:

```yaml
on:
  push:
    branches: ["release/**"]
    tags: ["v*"]
  workflow_dispatch:
```

When the tag is created by the Lovable release tooling (or GitHub web UI / API)
the `push: tags: v*` event is **not** delivered to Actions in every code path —
typically because the tag is created server-side rather than via `git push
origin vX.Y.Z`. The descriptor file `.gitmap/release/vX.Y.Z.json` lands on
main, but nothing converts that signal into a `release.yml` run, so the asset
publication pipeline never executes.

This is the same publish-contract violation captured in
`mem://constraints/release-assets-publish-contract`, but for a new entry path
(descriptor-driven tag creation rather than UI-driven).

## Fix

Added `.github/workflows/release-watcher.yml`:

- Triggers on `push: main` paths `.gitmap/release/v*.json`
  and `.gitmap/release/latest.json`.
- Reads the target tag from the changed `.gitmap/release/v*.json` descriptor,
  falling back to `.gitmap/release/latest.json` for manual replay.
- Verifies the tag exists on origin.
- Dispatches `release.yml` via `gh workflow run release.yml --ref
  refs/tags/<tag> -f version=<tag>`.

`release.yml`'s existing `workflow_dispatch` path then checks out the exact
tag, builds every asset, runs the required-asset verification gate, and
uploads to the existing Release object (idempotent — `softprops/action-gh-release@v2`
updates in place).

## Recovery for v3.1.0

Re-run **Release Build** via `workflow_dispatch` for `v3.1.0`, or push any
edit to `.gitmap/release/latest.json` so the new watcher picks it up.

## Prevention

- Watcher closes the descriptor → release.yml gap.
- Existing scheduled `audit-releases.yml` continues to catch any drift on
  already-published tags.

## Status

✅ Resolved — 2026-05-18 (v3.2.0)
