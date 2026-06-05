# 07 — Enumeration, Build, Packaging & Caching

> Auto-enumerate extensions, build/zip rules, naming convention, matrix builds, caching, concurrency.

Part of [`spec/2026-spec/02-ci-cd-spec-for-chrome-extensions/`](./README.md).

---

## §11. Enumerate extensions

```bash
# bash
mapfile -t EXTS < <(find . -name manifest.json -not -path '*/node_modules/*' \
  | xargs -I{} sh -c 'jq -e ".manifest_version==3" "{}" >/dev/null && dirname "{}"')
```

```pwsh
# PowerShell
$exts = Get-ChildItem -Recurse -Filter manifest.json `
  | Where-Object { $_.FullName -notmatch 'node_modules' } `
  | Where-Object { (Get-Content $_ -Raw | ConvertFrom-Json).manifest_version -eq 3 } `
  | ForEach-Object { $_.Directory.FullName }
```


---

## §12. Build & package step

```bash
package_extension() {           # $1 = ext dir, $2 = version, $3 = out dir
  local name; name=$(jq -r .name "$1/manifest.json" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
  ( cd "$1" && zip -r "$3/${name}-${2}.zip" . \
      -x '*/node_modules/*' '*.map' '*.log' '.DS_Store' )
}
```

Rules: build first (`npm run build` if present) → zip the **output** folder
(`dist/` if present, else the extension root) → write to **`./release-assets/`**
(git-ignored).


---

## §13. Zip naming convention

`<slug>-<version>.zip` where `<slug>` is the lowercase, hyphenated extension
name. Example: `marco-extension-3.49.1.zip`. Never include the leading `v`.


---

## §23. Matrix-build across multiple extensions

The `strategy.matrix.ext` in §22 already auto-discovers every Manifest V3 folder
and builds them in parallel. Adding a new extension = adding a folder. No
workflow edits needed.


---

## §24. Caching & dependency steps

- `actions/setup-node@<40-char-sha> # vX.Y.Z` with `cache: npm` (or `pnpm`).
- Cache the package-manager store keyed on the lockfile hash.
- Use `actions/cache@<40-char-sha> # vX.Y.Z` for any heavyweight per-extension build dirs.
- Use `actions/upload-artifact@<40-char-sha> # vX.Y.Z` / `download-artifact@<40-char-sha> # vX.Y.Z` (1-day retention)
  to pass ZIPs between `build` and `publish` jobs.


---

## §24a. Concurrency and cancellation rule (publish is never cancel-in-progress)

Release publication is a stateful operation: it creates or updates a tag/release,
uploads multiple assets, writes checksums, and may flip `draft: false`. A newer
run must **not** kill an older publish run mid-upload, because that leaves a
visible release with missing ZIPs, missing installer scripts, or stale checksums.

Hard rule for `.github/workflows/release.yml`:

```yaml
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
```

`cancel-in-progress: true` is allowed for non-publishing CI workflows such as
`.github/workflows/ci.yml`, where abandoning stale lint/test runs is safe. It is
forbidden on any job or workflow that creates releases, uploads release assets,
publishes browser-store packages, signs artifacts, or mutates tags.

If a release workflow needs narrower serialization, use a deterministic release
group such as `release-${{ needs.setup.outputs.version }}` after the version has
been resolved, but keep `cancel-in-progress: false`.

## Acceptance

- [ ] The implementation satisfies the `07 — Enumeration, Build, Packaging & Caching` contract in this file and the folder-level acceptance target: Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable.
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

