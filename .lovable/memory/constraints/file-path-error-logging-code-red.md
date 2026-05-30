---
name: File path error logging code-red rule
description: All file/path errors MUST include exact path, what was missing, and reason — code red priority, no exceptions
type: constraint
---

## Code-Red Rule: File Path Error Logging

**Priority**: CODE RED — mandatory enforcement, no exceptions.

Every error or warning related to a file or path MUST include:

1. **Exact file path** — the full resolved path that was attempted
2. **What was missing** — the specific file, key, or resource expected
3. **Reason** — why it was not found (does not exist, permission denied, invalid path, not created by prior step, etc.)
4. **Operation** — what was being done (read, write, inject, load, resolve, copy, move, extract)
5. **Recovery** — fallback taken, if any

### Format

```
[ERROR] <module>: <operation> failed
  Path: <exact path>
  Missing: <what was expected>
  Reason: <why it failed>
```

### Forbidden

- `"file not found"` without exact path
- `"failed to load"` without path and reason
- Any generic file error that omits the resolved path

### Scope

Applies to ALL modules: background, content scripts, standalone scripts, SDK, deployment scripts.
Applies to ALL log levels (ERROR and WARN) when the log references a file/path.
Applies to ALL log surfaces: console, SQLite, OPFS, DevTools mirror.

### Spec Reference

`spec/02-app-issues/error-management-file-path-and-missing-file-code-red-rule.md`
