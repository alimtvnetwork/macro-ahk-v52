# 05 — API Contract

## Endpoint

```
GET https://api.lovable.dev/workspaces/{WorkspaceId}/credit-balance
```

## Request

| Header        | Value                          |
|---------------|--------------------------------|
| Accept        | `*/*`                          |
| Authorization | `Bearer <JWT>` (via `getBearerToken()`) |
| Content-Type  | `application/json`             |

Credentials: `include` (matches the Lovable site’s own fetch). Mode: `cors`.

Bearer token MUST come from the unified auth contract
(`mem://auth/unified-auth-contract` — `getBearerToken()` only).

## Response (200)

```json
{
  "$schema": "https://api.lovable.dev/GetWorkspaceCreditBalanceOutputBody.json",
  "total_remaining": 5,
  "total_granted": 5,
  "daily_remaining": 5,
  "daily_limit": 5,
  "total_billing_period_used": 0,
  "expiring_grants": [],
  "grant_type_balances": [
    { "grant_type": "daily", "granted": 5, "remaining": 5 }
  ]
}
```

## Parser rules

- Snake_case → camelCase mapping in `credit-balance-parser.ts` (sole owner of
  wire field names).
- `grant_type` is mapped through `GrantTypeMapper.fromWire()` — unknown values
  become `GrantType.Unknown` + CODE-RED log.
- Missing numeric fields default to `0` and emit a `Logger.warn` entry.

## Error responses

| Status | Outcome            | Notes                                |
|--------|--------------------|--------------------------------------|
| 401/403| `AuthError`        | bubble to existing auth-recovery; no retry inside this module |
| 404    | `HttpError`        | cache negative result for `creditFetchDelayMs` |
| 5xx    | `HttpError`        | fail-fast (memory `no-retry-policy`) |
| timeout| `Timeout`          | when wall time > `creditFetchDelayMs`|

## Fail-fast contract

Single attempt. No exponential backoff. No queued redelivery. Errors flow to
`Logger.error('CreditBalanceUpdate.fetch', …)` with the full URL, status,
sanitised bearer prefix, and parsed error body (memory
`mem://workflow/completed/08-fetch-logging-standard`).
