# 12 — Auth Integration

- Token retrieval: **only** `getBearerToken()` (memory
  `mem://auth/unified-auth-contract`). No direct `localStorage` reads.
- On 401/403, the controller MUST call `getBearerToken({ force: true })` exactly
  once, then retry the fetch exactly once. A second 401/403 is final → emit
  `CreditFetchOutcome.AuthError`. This matches the existing
  `credit-monitoring-system` policy.
- Missing token → `Reason: 'MissingToken'`, no fetch attempted, outcome =
  `AuthError`.
