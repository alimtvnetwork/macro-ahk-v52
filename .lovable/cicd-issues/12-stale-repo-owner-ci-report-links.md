## Pipeline / Workflow

README + installer/release docs + installer defaults

## Description

The latest GitHub screenshot shows the active repository as `aukgit/macro-ahk-v52`, but repo status links, badges, installer defaults, release-page links, and CI/CD reporting docs still pointed at `alimtvnetwork/macro-ahk-v52`. That makes CI/CD appear not to run because reports and badges check the wrong repository owner.

## First Seen

2026-06-21 (`v3.79.1` report / GitHub repository screenshot).

## Root Cause

Repository-owner drift after the project moved/forked to `aukgit/macro-ahk-v52`. CI trigger configuration itself was still valid (`ci.yml` keeps bare `on: push:`), but multiple user-facing CI/CD references and installer defaults resolved status, releases, and assets from the old owner.

## Status

✅ Resolved (2026-06-21).

## Fix

- Updated installer source of truth from `alimtvnetwork/macro-ahk-v52` to `aukgit/macro-ahk-v52`.
- Updated generated installer constants and inline fallbacks to match the contract.
- Updated README badges, release links, installer commands, package clone command, and installer/architecture docs to point at the current owner.
- Left historical RCA/spec example URLs untouched where they intentionally describe past examples.

## Prevention

- `node scripts/check-installer-contract.mjs` verifies installer defaults stay in sync.
- `node --test scripts/__tests__/ci-workflow-trigger-policy.test.mjs` verifies CI still triggers on every branch push.
- Future repo moves must run the repo-reference scan for `github.com/<old-owner>/macro-ahk-v52`, `raw.githubusercontent.com/<old-owner>/macro-ahk-v52`, and `<old-owner>/macro-ahk-v52` before release.

## References

- `readme.md`
- `docs/installer-guide.md`
- `docs/extension-architecture.md`
- `scripts/installer-contract.json`
- `scripts/install.sh`, `scripts/install.ps1`, `scripts/download-extension.ps1`
- `scripts/__tests__/ci-workflow-trigger-policy.test.mjs`