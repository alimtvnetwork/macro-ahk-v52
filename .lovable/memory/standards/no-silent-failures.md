---
name: No Silent Failures
description: Anything that looks broken MUST be logged. Default to ERROR for obvious failure conditions; downgrade later if proven benign.
type: preference
---

# No Silent Failures — Development Mindset

**Core rule:** If something is broken, it MUST be logged. Never silent. Never swallowed.

## Severity decision

- **ERROR** — the default when a condition is "obviously a failure": missing file, missing script, missing config, missing required field, unreachable network endpoint, auth contract violation, schema mismatch, etc.
- **WARN** — only when the situation is recoverable AND expected in normal operation (e.g. user disabled a feature, optional resource absent by design).
- **INFO** — observable lifecycle events, not failures.

## The mindset

1. **Log first, classify later.** If you're unsure whether a condition is an error, log it as an ERROR. We can downgrade or add a guard condition later once we have data. We can NEVER recover information that was silently dropped.
2. **No empty catch blocks. No `?? undefined` that hides a missing value.** Every failure path must emit a log line with: exact path / id / missing item / reasoning.
3. **Use the namespace logger.** `Logger.error()` / `logBgError()` / `persistInjectionError()` — never bare `console.log` for failure conditions.
4. **Code Red format** (mandatory for path/id failures):
   - `Path:` the exact location queried
   - `Missing:` what was expected but not found
   - `Reason:` why this is a failure

## Canonical example

A project's URL pattern matches the current tab, but the bound script is not in the script library.
- This is **obviously a failure** — the user expects the script to run.
- Therefore: log as **ERROR** (not warn), persist via `persistInjectionError`, surface in diagnostics, and tag `SCRIPT_MISSING_FATAL`.
- If later we find this happens routinely during builtin re-seeding, we can add a guard `if (isBuiltinReseedInProgress) downgrade()` — but never silence by default.

## Anti-patterns (forbidden)

- `try { ... } catch { /* ignore */ }`
- `const x = lookup(id) ?? defaultEmpty` without a log
- `if (!found) return;` without a log
- Downgrading ERROR → WARN "because it's noisy" without first adding a precise guard condition.

## Related

- `mem://constraints/file-path-error-logging-code-red.md`
- `mem://standards/error-logging-via-namespace-logger.md`
- `mem://standards/error-logging-requirements.md`
