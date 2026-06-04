# 14 — Settings Bus Message Schema

`SAVE_SETTINGS` and `GET_SETTINGS` payloads gain one field.

```ts
interface SettingsPayload {
    verboseLogging: boolean;
    creditFetchDelayMs: number; // NEW
    // … existing fields
}
```

Validator (`src/shared/namespace-db-validators.ts` or local equivalent):

```ts
function coerceCreditFetchDelayMs(n: unknown): number {
    const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : DEFAULT;
    return Math.min(MAX, Math.max(MIN, v));
}
```

Hydration on extension boot reads the persisted value and pushes it to the
credit module via `CreditFetchController.setTimeoutMs(value)`.
