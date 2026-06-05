# 01 — 40 Planning Steps

> The forty ordered planning steps the rest of this spec elaborates.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §0. The Forty Planning Steps (write spec to match these)

These forty steps are the **outline**. The detailed spec below (§1–§40) maps
1:1 onto them.

1.  Read every file in the host repo relevant to CI/CD and packaging.
2.  Read and understand the download script end-to-end.
3.  Read and understand the install script end-to-end.
4.  Read and understand the probing feature end-to-end.
5.  Identify existing GitHub workflow/action files and their triggers.
6.  Document trigger conditions (push, tag, release, manual dispatch).
7.  Create the target spec folder at the agreed relative path.
8.  Define the spec's purpose and the "hand to any AI" mindset.
9.  Describe the generic extension folder shape an AI should expect.
10. Define Manifest V3 requirements for any extension.
11. Describe how to detect/enumerate one or many extension folders.
12. Define the build/package step that zips an extension (relative paths only).
13. Specify zip naming convention per extension and per version.
14. Specify how the version is derived (manifest version / tag).
15. Define how release artifacts (zips) are attached to a GitHub Release.
16. Define how release notes / changelog entries are generated and added.
17. Specify which scripts are published to the release page and how.
18. Provide the full download-script spec with an example implementation.
19. Provide the full install-script spec with an example implementation.
20. Provide the probing-feature spec with an example implementation.
21. Show the relative-path layout for scripts, build output, and artifacts.
22. Provide an example GitHub Actions workflow YAML (generic, parametrized).
23. Show how to matrix-build across multiple extensions.
24. Define caching / dependency steps.
25. Define permissions/secrets the workflow needs (generic names).
26. State the strict rule: never commit any asset ZIP to the repository.
27. Show `.gitignore` entries that enforce no-committed-zips.
28. Describe how artifacts live only in releases, not in commits.
29. Define how the README for the release/extension is written.
30. Provide a README template with example sections and placeholders.
31. Include unpacked-load install instructions in the README template.
32. Document the download-link approach (fetch + blob) for previews.
33. Define acceptance checks for a correct release artifact.
34. Define failure/log handling and where logs are written.
35. Pre-tag checklist an AI runs before tagging a release.
36. Post-workflow checklist an AI runs after the workflow completes.
37. Examples for adding a second/third extension with no rework.
38. Troubleshooting section with common failures and fixes.
39. Glossary of terms used in the spec.
40. Acceptance criteria covering every step above.

---

## Acceptance

- [ ] The implementation satisfies the `01 — 40 Planning Steps` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

