# 10 — Caching & Single-Flight

## In-memory map

`Map<WorkspaceId, CreditFetchResult>` keyed by workspace id, scoped to the
content-script lifetime. Cleared on:

- Settings change (`creditFetchDelayMs` modified).
- Manual "Refresh credits" button.
- Successful auth recovery (token refreshed).

## IndexedDB (durable)

Reuses the existing `marco_pro_zero_credit_balance` DB but with a separate
object store: `entries_v2_ktlo_free_cancelled`. This avoids breaking the
PascalCase storage ban (memory `no-storage-pascalcase-migration`) while
keeping the two flows isolated.

TTL: 10 minutes (same as `pro_0`).

## Single-flight

```ts
private readonly inFlight = new Map<string, Promise<CreditFetchResult>>();

fetchOnce(workspaceId: string): Promise<CreditFetchResult> {
    const existing = this.inFlight.get(workspaceId);
    if (existing) return existing;
    const p = this.doFetch(workspaceId).finally(() => this.inFlight.delete(workspaceId));
    this.inFlight.set(workspaceId, p);
    return p;
}
```

Concurrent UI consumers (tooltip + row + modal) share the same promise.
