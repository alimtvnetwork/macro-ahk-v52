# Issue 122a — Credit-Balance Throttle, Manual Refresh & SQLite Persistence

**Parent:** `122-pro-one-credit-balance-generalization.md`
**Version target:** v3.36.0
**Owner module:** `standalone-scripts/macro-controller/src/credit-balance/`

---

## 1. Goals

Augment the `/credit-balance` enrichment defined in spec 122 with strict throttling, manual override, and durable persistence so that:

1. No workspace is auto-refreshed more often than once per **10 seconds**.
2. Auto batches space consecutive workspaces by at least **5 seconds**.
3. The user can right-click a workspace row → **Credit Refresh** to bypass throttle and force an immediate fetch.
4. A panel-level **Credit** button triggers a sequential fetch across **only `pro_1`** workspaces with the 5 s gap.
5. Every fetched response is written to **SQLite** so reloads, panel reopens, and cold starts do not waste API calls.

## 2. Throttle contract

| Rule | Value | Scope |
|------|-------|-------|
| `PER_WS_MIN_INTERVAL_MS` | `10_000` | Same workspace ID |
| `INTER_WS_GAP_MS` | `5_000` | Between any two fetches in an auto batch |
| `MANUAL_BYPASS` | true | Right-click refresh ignores both gates |
| `BATCH_PLAN_FILTER` | `plan === 'pro_1'` | Credit button only |

### Decision table

| Trigger | Per-ws gate | Inter-ws gate | Persists |
|---------|-------------|---------------|----------|
| Auto loop enrichment | ✅ enforced | ✅ enforced | ✅ |
| Credit button (batch) | ⚠️ skipped (forced) | ✅ enforced | ✅ |
| Right-click "Credit Refresh" | ⚠️ skipped (forced) | n/a (single) | ✅ |
| SQLite hydration | n/a (read) | n/a | n/a |

`shouldFetch(wsId, now)` returns `false` when `now - lastFetchedAt(wsId) < PER_WS_MIN_INTERVAL_MS` **unless** `force=true`.

## 3. SQLite persistence

New table in the existing macro-controller SQLite DB (managed via `db-manager.ts`):

```sql
CREATE TABLE IF NOT EXISTS WorkspaceCreditBalance (
    WorkspaceId       TEXT PRIMARY KEY,
    FetchedAtMs       INTEGER NOT NULL,
    Source            TEXT NOT NULL,  -- 'auto' | 'batch' | 'manual'
    TotalGranted      REAL NOT NULL,
    TotalRemaining    REAL NOT NULL,
    TotalBillingUsed  REAL NOT NULL,
    DailyLimit        REAL NOT NULL,
    DailyRemaining    REAL NOT NULL,
    RawJson           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IxWorkspaceCreditBalance_FetchedAt
    ON WorkspaceCreditBalance(FetchedAtMs DESC);
```

- **Upsert** on every successful fetch (`INSERT … ON CONFLICT(WorkspaceId) DO UPDATE`).
- **Hydration**: on extension boot the `credit-balance` module reads every row into the in-memory cache, seeding `lastFetchedAt` so throttle gates apply across reloads.
- **TTL**: rows older than **24 h** are still served for display but flagged `stale=true`; auto loop refetches them when throttle allows.

## 4. Module surface (`credit-balance/`)

```
credit-balance/
  index.ts                # public API: fetchOne(wsId, opts), fetchBatchPro1(), hydrate()
  throttle.ts             # shouldFetch + recordFetch (pure)
  store.ts                # SQLite upsert / hydrate / list
  fetcher.ts              # XHR + 401-refresh-once (single attempt, no backoff)
  types.ts                # CreditBalanceRow, FetchSource, FetchOptions
```

`fetchOne(wsId, { force?: boolean, source: FetchSource })`:
1. If `!force && !shouldFetch(wsId, now)` → return cached row.
2. Resolve bearer via `getBearerToken()` (no fallbacks per auth contract).
3. XHR `GET https://api.lovable.dev/workspaces/{wsId}/credit-balance`.
4. On 200 → parse, `store.upsert(...)`, `throttle.recordFetch(wsId, now)`, broadcast `CREDIT_BALANCE_UPDATED`.
5. On 401 → single token refresh → retry once → fail.
6. On 4xx/5xx/network → `Logger.error('CreditBalance.fetchOne', …)`; return cached row (if any) flagged stale. **No retry, no backoff** (`mem://constraints/no-retry-policy`).

`fetchBatchPro1()`:
- Filter `loopCreditState.perWorkspace` where `plan === 'pro_1'`.
- Iterate sequentially with `await sleep(INTER_WS_GAP_MS)` between calls.
- Each call uses `force: true, source: 'batch'`.
- Emits progress events for the panel button UI (idle → running n/N → done).

## 5. UI hooks

- **Credit button** (panel toolbar): `onclick` → `fetchBatchPro1()`. Disabled while a batch runs.
- **Right-click context menu** (ws row): new item **"Credit Refresh"** below existing entries → `fetchOne(wsId, { force: true, source: 'manual' })`. Spinner replaces the row's credit badge until resolved.

## 6. Logging

Every fetch logs one structured line:

```
CreditBalance.fetchOne ws=workspace_01… source=manual outcome=ok dt=312ms remaining=102.3 granted=305
```

Failures use `Logger.error` with `Reason` + `ReasonDetail` (see verbose-logging-and-failure-diagnostics standard). CODE-RED on any 5xx with full URL + response status.

## 7. Tests (ship with feature)

Vitest:
- `throttle.test.ts` — gate honours 10 s window; force bypasses.
- `store.test.ts` — upsert idempotent; hydrate restores `lastFetchedAt`.
- `batch.test.ts` — only `pro_1` selected; 5 s gap between calls; sequential ordering.
- `fetcher.test.ts` — 401 refresh-once; 5xx returns stale cache without retry.

Component:
- Right-click menu emits `fetchOne(force=true)`.
- Credit button disables during batch, re-enables on completion.

## 8. Acceptance

- [ ] Same ws auto-refetch within 10 s is a no-op (cache hit).
- [ ] Batch of 4 pro_1 ws takes ≥ 15 s (3 gaps × 5 s).
- [ ] Right-click refresh fires immediately regardless of last fetch time.
- [ ] After full reload, SQLite hydrate restores numbers without any network call.
- [ ] Non-`pro_1` workspaces are not touched by the Credit button.
