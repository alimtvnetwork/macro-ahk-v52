---
name: Error logging requirements
description: All HARD ERROR logs must include exact file path, what was missing, and reasoning — optimized for AI consumption
type: preference
---

## Error Logging Standard

Every HARD ERROR or LOG ERROR in the system MUST include:

1. **Exact file path** — the full path of the file/resource that failed or was not found
2. **What it couldn't find** — the specific resource, key, script ID, config entry, or dependency that is missing
3. **Reasoning** — why it failed: permission denied, path doesn't exist, storage key empty, dependency not resolved, etc.

### Format

```
[ERROR] <module>: <what failed>
  Path: <exact file or resource path>
  Missing: <specific item not found>
  Reason: <why it wasn't found or failed>
```

### Example

```
[ERROR] ensureBuiltinScriptsExist: Built-in script not found after self-heal
  Path: chrome.storage.local["script:sdk-preamble"]
  Missing: sdk-preamble (ID: builtin_sdk_preamble_v1)
  Reason: Storage key empty and bundled fallback at /scripts/sdk-preamble.js also missing from extension package
```

### Why

- Logs must be **meaningful enough for an AI model to diagnose the issue** without additional context.
- Vague errors like "script not found" or "failed to load" are forbidden.
- This applies to all logging surfaces: DevTools console, SQLite, OPFS, and Chrome extension logs.
