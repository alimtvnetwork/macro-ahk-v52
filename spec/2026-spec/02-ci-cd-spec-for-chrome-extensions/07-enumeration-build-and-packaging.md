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

