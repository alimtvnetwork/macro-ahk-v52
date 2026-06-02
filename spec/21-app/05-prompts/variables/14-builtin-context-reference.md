# Built-in Context Reference

Always available; never declared; cannot be shadowed except by step-scoped override.

| Name | Type | Lifetime | Source |
|---|---|---|---|
| `RunId` | string (UUID v4) | one run | `crypto.randomUUID()` at runner start |
| `Now` | string (ISO-8601, Asia/Kuala_Lumpur) | one render | recomputed every interpolation |
| `TabId` | integer | one run | `chrome.tabs` at start |
| `WorkspaceId` | string | one run | active workspace snapshot at start |
| `UserId` | string | one run | claims from `getBearerToken()` |
| `StepIndex` | integer (0-based) | one step | runner |
| `LoopIteration` | integer (0-based) | one run | runner |
| `Slug` | string | one run | `MacroDefinition.Slug` |
| `TargetScore` | integer | one run | `MacroDefinition.TargetScore` |
| `MaxLoops` | integer | one run | resolved `MaxLoops` (after caps) |

## Notes

- `Now` resolves **per-token render**, not per-step — useful for stamping each prompt with a fresh timestamp.
- `UserId` is `""` if no bearer token is present at run start; macros that need an authenticated user MUST declare a guard step.
- All ISO-8601 timestamps use `Asia/Kuala_Lumpur` (UTC+08:00) per project core rule.
