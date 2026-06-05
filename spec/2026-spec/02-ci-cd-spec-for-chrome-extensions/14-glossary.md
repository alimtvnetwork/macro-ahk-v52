# 14 — Glossary

> Terms used throughout the spec.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §39. Glossary

- **Strict mode** — installer was given an explicit version or downloaded from a
  release URL; no fallback allowed.
- **Discovery mode** — installer was run bare; may fall through to latest.
- **Probe** — non-downloading HEAD request, parallel and capped.
- **Slug** — lowercase hyphenated extension name from `manifest.json`.
- **Release artifact** — any file uploaded to a GitHub Release page.
- **Unpacked load** — installing a directory via `chrome://extensions`.

## Acceptance

- [ ] The implementation satisfies the `14 — Glossary` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
