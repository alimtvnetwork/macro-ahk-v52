# RCA — v51 install link / `download-extension.ps1` pointed at wrong owner

**Date:** 2026-06-23
**Reporter:** user
**Severity:** P0 (install command from root README 404s)

## Symptom

User ran:

```powershell
irm https://github.com/aukgit/macro-ahk-v52/releases/latest/download/download-extension.ps1 | iex
```

→ 404 / asset not found. v50 equivalent (`alimtvnetwork/macro-ahk-v52`) worked.

## Root cause

The canonical published repo for v51 is **`alimtvnetwork/macro-ahk-v52`** (same
owner pattern as v50 — `alimtvnetwork/macro-ahk-v52`). An earlier change
inverted the assumption and treated `aukgit/macro-ahk-v52` as canonical:

- `readme.md` install/clone/install-from-release URLs pointed to `aukgit/...`.
- `scripts/download-extension.ps1` defaulted `-Repo` to `aukgit/macro-ahk-v52`.
- `scripts/clone-ahk.mjs` and `scripts/clone-repo.ps1` actively **rewrote**
  `alimtvnetwork/macro-ahk-v52` → `aukgit/macro-ahk-v52` (backwards).

Releases are published under `alimtvnetwork/macro-ahk-v52`, so every
`aukgit/...` URL 404s and the user's own raw URL fetch (correctly pointing at
`alimtvnetwork`) then handed off to a script that immediately switched repo
back to the dead `aukgit` org for the release download.

## Compare: v50 vs v51 script

`difflib` against
`https://raw.githubusercontent.com/alimtvnetwork/macro-ahk-v52/main/scripts/download-extension.ps1`
shows **two lines** differ — both the `-Repo` default in the param block and
the `.PARAMETER Repo` docstring. The download/extract logic is byte-identical.

The script itself is not broken; only the default repo identifier was wrong.

## Fix

1. `scripts/download-extension.ps1` — `-Repo` default reverted to
   `alimtvnetwork/macro-ahk-v52`; docstring updated.
2. `readme.md` — every `aukgit/macro-ahk-v52` occurrence (install commands,
   clone URLs, badge URLs, release URLs) rewritten to
   `alimtvnetwork/macro-ahk-v52`.

> Follow-up (out of scope for this patch): `scripts/clone-ahk.mjs` and
> `scripts/clone-repo.ps1` still contain the inverted "rewrite alimtvnetwork →
> aukgit" rule; these should be reversed in a follow-up commit.

## Prevention

Add to memory: **`alimtvnetwork/macro-ahk-v52x` is the canonical published
owner** for v50 and v51 releases. Any script that rewrites repo URLs must
rewrite *toward* `alimtvnetwork`, never away from it.
