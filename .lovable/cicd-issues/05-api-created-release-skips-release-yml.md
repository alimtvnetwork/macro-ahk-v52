# CI/CD Issue 05 — API-created GitHub Release skips `release.yml` (only stamped installer + source archives appear)

## Pipeline / Workflow

`.github/workflows/release.yml` (and `.github/workflows/release-watcher.yml` as fallback)

## Description

v3.1.0 Release page contained only:

- `release-version-v3.1.0.ps1` (18.4 KB)
- `release-version-v3.1.0.sh` (15.5 KB)
- Source code (zip)
- Source code (tar.gz)

None of the required built assets (`marco-extension-v3.1.0.zip`,
`macro-controller-v3.1.0.zip`, `marco-sdk-v3.1.0.zip`, `xpath-v3.1.0.zip`,
`install.ps1`, `install.sh`, `VERSION.txt`, `changelog.md`, `checksums.txt`,
`RELEASE_NOTES.md`) were uploaded. The release body was also empty of the
canonical install / quick-start sections produced by `release.yml`.

## First Seen

- Reported: 2026-05-18, version `v3.1.0`

## Root Cause

The release was created via the **GitHub REST API** by external release tooling
(`POST /repos/{owner}/{repo}/releases` with `tag_name: v3.1.0`), which:

1. Creates the `v3.1.0` git tag **server-side**, and
2. Uploads two stamped installer files via `POST /repos/.../releases/{id}/assets`.

Critically: **tags created by the REST API do not fire `push` or `create`
webhook events**. Our `release.yml` only listened to:

- `push: tags: v*`
- `push: branches: release/**`
- `create:`
- `workflow_dispatch`

None of these fired, so `release.yml` never ran. The `release-watcher.yml`
safety net (which watches `.gitmap/release/v*.json`) also did not recover —
either the descriptor commit and the API release call were concurrent, or the
watcher's tag-fetch happened before the API tag became visible to the cloned
worktree.

The result: the GitHub Release was published with only the tooling's own
stamped installer assets, and the canonical asset pipeline never executed.

## Status

✅ Resolved — 2026-05-18

## Fix

Added `on: release: types: [published, created, edited, released]` to
`release.yml`. The `release` event fires for **every** publish path — REST
API, GitHub web UI, `gh release create`, external tooling — and is the only
trigger that reliably catches server-side tag creation.

The `setup` job now resolves the version from `github.event.release.tag_name`,
fetches the tag, and feeds the existing build/verify/upload pipeline.
`softprops/action-gh-release@v2` updates the existing Release in place
(idempotent), so any missing assets are filled in on a re-run.

## Prevention

- `release` event ensures any future API-driven release flow triggers the
  canonical build pipeline.
- The `release: edited` subtype means simply editing the Release on GitHub
  re-runs the workflow as a self-service recovery path.
- Existing required-asset verification gate still blocks publish if any built
  asset is missing.
- Audit workflow (`audit-releases.yml`) catches drift on previously published
  releases.

## Recovery for v3.1.0

After this change lands on `main`:

1. **Actions → Release Build → Run workflow** from `main`, supply `version: v3.1.0`, OR
2. Edit the v3.1.0 release on GitHub (any save fires `release: edited`).

Either path re-runs the current fixed `release.yml`, rebuilds all assets from
the `v3.1.0` tag, and uploads them to the existing Release page in place.

## References

- `.github/workflows/release.yml`
- `.github/workflows/release-watcher.yml`
- `mem://constraints/release-assets-publish-contract`
- `changelog.md` → v3.4.0
- Sibling RCAs: `02`, `03`, `04`
