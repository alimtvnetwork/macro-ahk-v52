# Permissions & Scope — Allowed / Forbidden Writes

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

## Filesystem write scope

The macro engine writes only via the host AI's editor (it has no direct disk
access from the extension). The **rule the engine enforces in the prompts it
emits**, and that the audit-folder writer validates before persisting any
returned content, is:

| Path pattern                       | Write? | Notes                                  |
|------------------------------------|--------|----------------------------------------|
| `spec/audit/<RunId>/**`            | ✅     | Per-run artifact folder                |
| `spec/audit/<RunId>/99-final-report.{md,json}` | ✅ | Final-audit writer                |
| `spec/**` (outside `audit/`)       | ❌     | Spec authoring is human-driven         |
| `src/**`, `standalone-scripts/**`  | ❌     | Code changes go through `fix-from-audit` macro-prompts which **propose** edits — the engine itself never writes code |
| `skipped/**`                       | ❌     | Hard-banned (`mem://constraints/skipped-folders`) |
| `.release/**`                      | ❌     | Hard-banned                            |
| `node_modules/**`, `dist/**`       | ❌     | Build artefacts                        |
| `readme.txt`                       | ❌     | Hard-banned (`mem://constraints/readme-txt-prohibitions`) |
| Anywhere else                      | ❌     | Fail-fast `Reason="AuditWriteForbidden"` |

Path normalisation:

1. Resolve `WriteTo` against the repo root.
2. Reject if `..` escapes the root.
3. Reject if absolute path is outside the repo.
4. Reject if any segment matches the forbidden list above.
5. Otherwise accept.

## `chrome.*` permissions

The macro feature adds **no new** `host_permissions` or `permissions` entries.
It reuses:

| Permission             | Reason                                              |
|------------------------|-----------------------------------------------------|
| `storage`              | Read/write `Macros.*` and `MacroRunState.*` keys    |
| `scripting`            | Existing — prompt injection                         |
| `tabs`                 | Existing — locate active chat tab, listen on close  |

No `<all_urls>` expansion. The engine inherits the existing site list.

## Network scope

- **No outbound HTTP** from the engine.
- No Supabase, no third-party telemetry, no remote schema fetches.
- All schemas (`schemas/{prompt,macro,prompts-bundle,variable}.schema.json`)
  bundled with the extension.

## User-data scope

- Sensitive variables (`Sensitive: true` in `info.json`) are:
  - Masked in `MacroRunLog.*` and console logs.
  - Never written to `00-run-manifest.json` (replaced with `"***"`).
  - Never exported via JSON Export (Block 6 Task 53 enforces redaction).

## Concurrency scope

- One active run per **tab** (`MacroRunState.Active.<TabId>`).
- Multiple tabs may run different macros simultaneously.
- Attempting a second concurrent run on the same tab →
  `Reason="ConcurrencyDenied"`.
