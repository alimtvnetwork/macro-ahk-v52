# 06 — Settings: `creditFetchDelayMs`

A user-tunable maximum wall time for a single credit-balance fetch.

## Storage

- Key (chrome.storage.local): `Settings.CreditFetchDelayMs`
- Type: integer (milliseconds)
- Default: **3000** (3 s)
- Min: 500
- Max: 15000
- Step: 100

## Surfaces

1. **Macro Controller Settings panel** — new "Credit fetch timeout" row with a
   slider + numeric readout (`{n} ms`).
2. **`GET_SETTINGS` / `SAVE_SETTINGS` background bus messages** — round-trip the
   value alongside `verboseLogging`.
3. **Runtime hot-reload** — the credit module subscribes to settings updates
   and uses the new value on the very next fetch (no extension reload needed).

## Validation

- Non-numeric, NaN, < min, > max → coerce to default + `Logger.warn`.
- Persisted only after coercion succeeds.

## UI copy

> **Credit fetch timeout** (`{value} ms`)
> Maximum time the macro controller will wait for a workspace's credit balance
> to load before falling back to the cached value. Lower = snappier UI, higher
> = better tolerance for slow connections.
