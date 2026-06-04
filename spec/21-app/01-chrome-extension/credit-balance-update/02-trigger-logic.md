# 02 — Trigger Logic

The credit-balance API **must** be called only when needed.

## Decision tree (executed per workspace, per refresh tick)

```
read WorkspaceInfo (from /workspaces payload)
  │
  ├─ plan ∈ { Pro0, Pro1, Business, Enterprise, ... credit-bearing plans }
  │     └─ use the inline credit fields → DO NOT call /credit-balance
  │
  ├─ plan ∈ { Ktlo (Lite), Free, Cancelled }
  │     │
  │     ├─ hasInlineCredits(workspace) === true  → use inline fields
  │     │     (defensive: in case Lovable starts returning them later)
  │     │
  │     └─ hasInlineCredits(workspace) === false → call /credit-balance
  │                                                 (this spec)
  │
  └─ plan === Unknown → log CODE-RED, fall back to inline fields, no API call
```

## `hasInlineCredits(workspace)` definition

Returns `true` iff **all** of the following are true:

- `workspace.billingPeriodCreditsLimit > 0`, OR
- `Array.isArray(workspace.grantTypeBalances) && workspace.grantTypeBalances.length > 0`

Anything else is treated as "no inline credit info".

## Plans that trigger the call

| Plan wire string | Enum            | Triggers `/credit-balance` |
|------------------|-----------------|----------------------------|
| `ktlo`           | `Plan.Ktlo`     | YES (when no inline data)  |
| `free`           | `Plan.Free`     | YES                        |
| `cancelled`      | `Plan.Cancelled`| YES                        |
| `pro_0`          | `Plan.Pro0`     | YES (already implemented)  |
| `pro_1`          | `Plan.Pro1`     | NO                         |
| `business`       | `Plan.Business` | NO                         |
| `enterprise`     | `Plan.Enterprise` | NO                       |
| anything else    | `Plan.Unknown`  | NO (log CODE-RED)          |

## Single-flight + cache

- Per-workspace single-flight: identical to the `pro_0` branch
  (`PRO_ZERO_BALANCE_CACHE` semantics, TTL = 10 min default).
- Negative result (404, 403, timeout) is cached for the configured delay so we
  don’t hammer the endpoint while the user is scrolling.
