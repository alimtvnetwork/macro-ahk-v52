# 11 — No-Committed-ZIPs Hard Rule

> Strict ban on committing build artifacts plus the `.gitignore` enforcement contract.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./readme.md).

---

## §26. ⛔ Strict rule — never commit asset ZIPs

> **No `.zip`, `.crx`, `.xpi`, or built `dist/` artifact may ever be committed
> to the repository.** Artifacts live only on the GitHub Release page.
> Violations must fail CI immediately.

Rationale: binary diffs bloat history, leak unsigned builds, and cause
confusion about which artifact is authoritative.


---

## §27. `.gitignore` enforcement

```gitignore
# build/release outputs — release artifacts live only on the Releases page
release-assets/
*.zip
*.crx
*.xpi
dist/
node_modules/
```

Add a CI gate: `git ls-files | grep -E '\.(zip|crx|xpi)$' && exit 1`.

## Acceptance

- [ ] The implementation satisfies the `11 — No-Committed-ZIPs Hard Rule` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
- [ ] Verification passes when `npm run test:cicd-spec` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Versioning policy](mem://workflow/versioning-policy) for the authoritative rule backing the MUST/SHALL statements in this file.
