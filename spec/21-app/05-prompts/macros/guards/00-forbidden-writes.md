# Guard — Forbidden Writes

The engine MUST never write outside `spec/audit/<RunId>/`. Hard-coded deny-list + path-traversal guard.

## Deny-list (absolute prefixes, resolved before write)

| Path | Reason |
|------|--------|
| `skipped/**` | Read-only archive (Core memory rule) |
| `.release/**` | Read-only archive (Core memory rule) |
| `node_modules/**` | Dependency tree — never spec output |
| `dist/**` | Build output — owned by Vite |
| `.git/**` | Source-control internals |
| `.lovable/build.lock` | Build-lock sentinel (Core memory rule) |
| Anything outside repo root | Path traversal / absolute paths |

## Allow-list
- `spec/audit/<RunId>/**` only.
- `<RunId>` MUST match `/^[0-9a-f-]{36}$/` (UUID v4 canonical lowercase).

## Implementation
- Single chokepoint: `audit-writer.ts` `assertWritable(targetPath)` runs **before** every `writeFile` / `mkdir`.
- Resolution:
  1. `path.resolve(REPO_ROOT, targetPath)` → `abs`.
  2. `rel = path.relative(REPO_ROOT, abs)`; reject if `rel.startsWith('..')` or `path.isAbsolute(rel)`.
  3. Reject if `rel` matches any deny-list pattern (micromatch, dotfile-aware).
  4. Require `rel.startsWith('spec/audit/<RunId>/')` where `<RunId>` matches the active run.
- Any violation → throw `MacroError({ Reason: 'PathOutsideAuditRoot', ReasonDetail: abs })`.

## Test coverage
- `tests/engine/audit-writer.test.ts` covers each deny-list entry + traversal vectors (`../`, URL-encoded `..%2F`, symlink decoy via fixture).
- CI runs `node scripts/audit-error-swallow.mjs` to ensure no `audit-writer` write path catches `PathOutsideAuditRoot` without re-throwing.

## Non-goals
- No file-system sandboxing at OS level (Chrome extension can't `chroot`); guard is process-internal but exhaustive.
- Macro authors writing via `JsInline` steps go through the **same** `audit-writer` API — no escape hatch.
