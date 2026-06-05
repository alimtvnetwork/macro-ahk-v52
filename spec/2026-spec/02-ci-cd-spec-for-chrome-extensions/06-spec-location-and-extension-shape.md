# 06 — Spec Location & Extension Folder Shape

> Where this spec lives, purpose statement, MV3 folder shape, and relative-path layout.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §7. Target spec location

`./spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/` (this folder).
This dated 2026 spec folder is the canonical content location for the generic
Chrome-extension CI/CD spec. The `spec/12-cicd-pipeline-workflows/` module must
merge it by linking/indexing it, not by moving or duplicating the content.


---

## §8. Purpose statement

> Given this folder and any folder containing a Manifest V3 `manifest.json`,
> an AI agent must be able to (a) wire a CI workflow that lints/tests, (b)
> wire a release workflow that builds, packages, and publishes downloadable
> ZIPs to a GitHub Release, and (c) publish installer scripts on the release
> page — all without committing any binary artifact to the repository.


---

## §9. Generic extension folder shape

```
<ext-root>/
├── manifest.json          # required, Manifest V3
├── icons/                 # optional
├── popup.html             # optional
├── background.{js,ts}     # optional
├── content/               # optional
├── src/ or dist/          # build inputs/outputs
└── package.json           # optional, with `build` script if compiled
```

Detection rule: any directory whose `manifest.json` parses with
`manifest_version === 3` is an extension folder.


---

## §10. Manifest V3 requirements

Required keys: `manifest_version` (=3), `name`, `version` (semver `X.Y.Z`),
`description`, plus at least one of `action`, `background`, `content_scripts`.
`icons.128` recommended for the Chrome Web Store.


---

## §21. Relative-path layout

```
./
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── scripts/
│   ├── install.sh
│   ├── install.ps1
│   ├── download-extension.sh
│   ├── download-extension.ps1
│   └── probe-siblings.sh
├── <extension-1>/manifest.json
├── <extension-2>/manifest.json        # any number of siblings
├── release-assets/                    # ❌ git-ignored, build output
└── CHANGELOG.md
```

## Acceptance

- [ ] The implementation satisfies the `06 — Spec Location & Extension Folder Shape` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
