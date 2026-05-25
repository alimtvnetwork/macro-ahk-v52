# 56 — Windows `ERROR: Build failed` is opaque (no Rollup error surfaced)

**Date (KL):** 2026-05-25
**Reporter:** user via `.\run.ps1 -d`
**Status:** Diagnostic fix applied; root cause still unknown until user re-runs.

## Symptom

`.\run.ps1 -d` reaches **[3/4] Building extension…** and ends with:

```
[copy-icons] WARN — icon-16.png missing …
[copy-icons] WARN — icon-48.png missing …
  ERROR: Build failed
```

Between the second `WARN` line and `ERROR: Build failed` there is **no Vite/Rollup
error message**, only the two pre-existing `node:fs` / `node:crypto` externalization
warnings from `sql.js` (which are harmless — they have been there for months and the
Linux build of the exact same `vite.config.extension.ts` completes successfully).

## Why we can't diagnose from the log

`scripts/ps-modules/extension-build.ps1` → `Invoke-PackageScriptDirect`
(`scripts/ps-modules/utils.ps1:280`) runs the npm script via
`& cmd.exe /d /s /c $scriptCommand`. On a failing build, PowerShell only emits
`Write-Host "  ERROR: Build failed"`; the actual Rollup stack trace is wherever
`cmd.exe` flushed it and is not preserved anywhere on disk for post-mortem.

## Options considered

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | Add `2>&1 \| Tee-Object` in `Invoke-PackageScriptDirect` to mirror stdout+stderr to `build.error.log`, then dump the tail on non-zero exit. | Loud, asks nothing of the user, future failures self-diagnose. Tiny diff. | Adds one file write per build (negligible). |
| B | Ask the user to re-run with `pnpm run build:extension` directly and paste the error. | Zero code change. | Violates No-Questions Mode and ships nothing. |
| C | Guess the cause (e.g. sql.js externalization) and add `resolve.alias` for `node:fs` / `node:crypto`. | One-shot fix if guess is right. | The warnings have been benign forever; aliasing them masks the real error. High chance of wrong fix. |
| D | Replace `cmd.exe /d /s /c` with `Start-Process -Wait -RedirectStandardError`. | Captures stderr structurally. | Loses live console streaming, larger refactor, riskier. |

## Recommendation

**Option A.** Cheapest, safest, and produces the information needed to fix the
underlying problem on the next run. Option C is rejected because the
externalization warnings are not new — the Linux build emits them too and still
finishes — so silencing them won't fix anything.

## Action taken

- Patched `scripts/ps-modules/utils.ps1` `Invoke-PackageScriptDirect` to tee
  stdout+stderr to `<PackageDir>\build.error.log` (overwritten each run) and,
  on non-zero exit, print the last 60 lines of that log with a clear banner
  so the user can paste the real Rollup error directly.
- No change to Vite config — the build succeeds on Linux with the same config,
  so we must see the Windows-specific error before changing anything else.

## Next step for the user

Re-run `.\run.ps1 -d`. When it fails, the script will now print the captured
Rollup error (or memory-pressure crash, or plugin throw — whatever it is) and
also leave it in `build.error.log` at the repo root.
