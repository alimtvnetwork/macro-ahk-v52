# Threat Model — Prompt Macros (STRIDE)

Status: Normative · v1.0.0 · 2026-06-02

## Assets
- A1 macro definitions in chrome.storage.local
- A2 bearer token (auth bridge)
- A3 audit JSON written to log namespace
- A4 captured DOM/text snippets (verbose mode)

## Threats (STRIDE)
| ID | Category | Threat | Mitigation | Ref |
|----|----------|--------|------------|-----|
| T-01 | Spoofing | Page script forges MacroEvent | MAIN-world relay validates origin + envelope hash | engine/15 |
| T-02 | Tampering | Macro JSON edited to inject `eval` | Schema validation (json/10) + guards forbidden matrix | guards/10 |
| T-03 | Repudiation | Lost run history | Append-only audit (engine/14) + 7-day OPFS retention | session-logging |
| T-04 | Info disclosure | Secrets leaked in audit | sensitive masking (variables/13) + verbose gate | mem://standards/verbose-logging |
| T-05 | DoS | Infinite macro loop | Watchdog (engine/13) + loop budget table | guards/12 |
| T-06 | Elevation | Macro calls privileged DOM | Forbidden/Allowed matrix | guards/10 |
| T-07 | Injection | `{{var}}` containing `</script>` | Context-aware escaping (variables/11 §5) | — |

## Out of scope
- Browser zero-days, OS keychain compromise.

## Review cadence
Re-review on any change to engine/guards/variables/json schemas.
