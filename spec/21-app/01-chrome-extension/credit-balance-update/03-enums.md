# 03 — Enums

All enums are PascalCase, exported as `const enum` from a single module per
domain (no string literals at call sites). See memory
`mem://architecture/constant-naming-convention`.

## `Plan`

File: `standalone-scripts/macro-controller/src/credit-balance-update/plan.ts`

```ts
export const enum Plan {
    Pro0       = 'Pro0',
    Pro1       = 'Pro1',
    Ktlo       = 'Ktlo',
    Free       = 'Free',
    Cancelled  = 'Cancelled',
    Business   = 'Business',
    Enterprise = 'Enterprise',
    Unknown    = 'Unknown',
}
```

### Wire → Enum mapping (single source of truth)

| Wire string  | Enum               |
|--------------|--------------------|
| `pro_0`      | `Plan.Pro0`        |
| `pro_1`      | `Plan.Pro1`        |
| `ktlo`       | `Plan.Ktlo`        |
| `free`       | `Plan.Free`        |
| `cancelled`  | `Plan.Cancelled`   |
| `business`   | `Plan.Business`    |
| `enterprise` | `Plan.Enterprise`  |
| `""` / null  | `Plan.Unknown`     |
| any other    | `Plan.Unknown` + CODE-RED log |

Mapper lives in `plan-mapper.ts` and is the ONLY file allowed to reference the
raw wire strings (mirrors `workspace-plan-mapper.ts`).

## `GrantType`

File: `standalone-scripts/macro-controller/src/credit-balance-update/grant-type.ts`

```ts
export const enum GrantType {
    Daily    = 'Daily',
    Billing  = 'Billing',
    Granted  = 'Granted',
    Topup    = 'Topup',
    Bonus    = 'Bonus',
    Rollover = 'Rollover',
    Unknown  = 'Unknown',
}
```

Wire mapping mirrors `pro-zero/credit-grant-type.ts` (lowercase wire →
PascalCase enum).

## `CreditFetchOutcome`

```ts
export const enum CreditFetchOutcome {
    InlineHit     = 'InlineHit',     // used workspace inline fields
    ApiHit        = 'ApiHit',        // fetched from /credit-balance
    ApiCacheHit   = 'ApiCacheHit',   // returned cached prior fetch
    Timeout       = 'Timeout',       // exceeded settings.creditFetchDelayMs
    HttpError     = 'HttpError',
    AuthError     = 'AuthError',
    Skipped       = 'Skipped',       // plan does not need API
}
```
