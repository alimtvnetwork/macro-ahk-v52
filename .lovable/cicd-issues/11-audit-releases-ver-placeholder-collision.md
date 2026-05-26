# CI/CD Issue 11 — Audit Releases mangled `VERSION.txt` into `<tag>SION.txt`

## Pipeline / Workflow

`.github/workflows/audit-releases.yml`

## Description

Audit Releases failed for `v3.24.0` with:

```
Error: v3.24.0 missing: v3.24.0SION.txt
Error: 1 release(s) missing required assets
```

The required asset `VERSION.txt` exists on the release, but the audit script
looked for `v3.24.0SION.txt` instead.

## First Seen

- Reported: 2026-05-26, version `v3.24.0`

## Root Cause

The audit script declared required assets with a bare `VER` placeholder and
substituted it with bash's *replace-all* operator:

```bash
REQUIRED_PATTERNS=( "marco-extension-VER.zip" ... "VERSION.txt" ... )
EXPECTED="${PAT//VER/$VER}"   # replaces EVERY occurrence of "VER"
```

For the literal `VERSION.txt`, the inner substring `VER` also matched, so the
expected filename became `${tag}SION.txt` (e.g. `v3.24.0SION.txt`). The asset
was always present — only the audit's expected name was wrong.

## Status

✅ Resolved — 2026-05-26

## Fix

Changed the placeholder to an unambiguous token `__VER__` that cannot appear
inside any real asset filename:

```bash
REQUIRED_PATTERNS=( "marco-extension-__VER__.zip" ... "VERSION.txt" ... )
EXPECTED="${PAT//__VER__/$VER}"
```

`VERSION.txt` and other literals containing the substring `VER` are now left
untouched by substitution.

## Prevention

- Placeholders in shell substitution must be unique tokens (`__VER__`, `{{VER}}`,
  etc.), never bare substrings that can occur inside literal asset names.
- Release-assets publish contract memory updated with this rule.

## References

- `.github/workflows/audit-releases.yml`
- `.lovable/memory/constraints/release-assets-publish-contract.md`
