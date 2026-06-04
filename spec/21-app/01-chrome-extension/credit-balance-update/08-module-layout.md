# 08 — Module Layout

New folder: `standalone-scripts/macro-controller/src/credit-balance-update/`

```
credit-balance-update/
├── index.ts                       — public barrel (only Controller + types)
├── plan.ts                        — Plan enum
├── plan-mapper.ts                 — wire ↔ Plan (sole owner of wire strings)
├── grant-type.ts                  — GrantType enum
├── grant-type-mapper.ts           — wire ↔ GrantType
├── credit-balance-types.ts        — CreditBalance, GrantTypeBalance, etc.
├── credit-fetch-outcome.ts        — CreditFetchOutcome enum
├── credit-balance-parser.ts       — JSON → typed
├── credit-balance-fetcher.ts      — fetch with timeout + abort
├── credit-balance-cache.ts        — per-workspace TTL cache (in-memory + idb)
├── credit-fetch-controller.ts     — orchestrator (trigger logic, single-flight)
├── credit-summary-resolver.ts     — produces what the UI consumes
├── credit-fetch-logger.ts         — namespace logger wrapper (Logger.error/warn)
└── __tests__/
    ├── plan-mapper.test.ts
    ├── grant-type-mapper.test.ts
    ├── credit-balance-parser.test.ts
    ├── credit-fetch-controller.test.ts
    ├── credit-balance-cache.test.ts
    └── credit-summary-resolver.test.ts
```

## Reuse rules

- **DO NOT** duplicate `pro-zero/pro-zero-credit-balance-client.ts`. The new
  fetcher shares the same low-level HTTP helper but lives in its own file
  because the trigger logic and outcome enum differ.
- **DO** reuse `getBearerToken()`, `Logger`, `chrome.storage.local` adapter,
  and the singleton tooltip / totals modal components.
- **DO** add the new module to the existing build via
  `vite.config.macro.ts` — no new bundle.
