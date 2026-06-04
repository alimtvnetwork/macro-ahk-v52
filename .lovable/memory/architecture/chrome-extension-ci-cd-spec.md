---
name: chrome-extension-ci-cd-spec
description: Generic 40-step Chrome-extension CI/CD spec (spec/2026-spec/02-ci-cd-spec-for-chrome-extensions) — repo-agnostic, matrix-discovers Manifest V3 folders, forbids committed ZIPs
type: reference
---

# Memory: architecture/chrome-extension-ci-cd-spec
Updated: 2026-06-04

Authoritative generic spec for wiring a Chrome-extension CI/CD pipeline in any
repo from just an extension folder.

📄 `spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/README.md`

## Non-negotiables (mirror to any new repo)

- **§26 strict rule**: never commit `*.zip`/`*.crx`/`*.xpi`/`dist/` — enforced
  via `.gitignore` (§27) and a CI gate.
- **§22 matrix discovery**: workflow auto-finds every `manifest_version===3`
  folder; adding extensions requires **zero** workflow edits.
- **§6 trigger matrix**: `release.yml` MUST listen to `push tags v*`, `release`,
  and `workflow_dispatch` — REST-API release creation only fires `release`.
- **§17 release-page contract**: every release uploads ZIPs + `install.sh` +
  `install.ps1` + `VERSION.txt` + `checksums.txt` + `RELEASE_NOTES.md` +
  `CHANGELOG.md`. Source-archive-only = invalid (matches
  `mem://constraints/release-assets-publish-contract`).
- **§3 exit-code contract**: installer exits 0/3/4/5/6 only — matches
  `mem://features/release-installer`.
- **§34 fail-fast**: no silent retries, classifier required on every failure.

## Local-repo phases (in plan.md, executed on each `next`)

`.gitignore` enforcement → CI no-zip gate → generic `download-extension.sh` →
`probe-siblings.sh` → `enumerate-extensions.mjs` → cicd-index link → 12-CI/CD
module index merge → spec acceptance test → this memory entry.
