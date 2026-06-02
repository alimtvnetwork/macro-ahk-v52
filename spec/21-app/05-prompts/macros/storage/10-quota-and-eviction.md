# Storage Quota & Eviction

Status: Normative · v1.0.0 · 2026-06-02

## Quotas
| Layer | Soft cap | Hard cap | Source |
|-------|----------|----------|--------|
| chrome.storage.local | 4 MB | 10 MB (browser) | extension API |
| IndexedDB (PromptCache) | 50 MB | browser-managed | navigator.storage.estimate |
| OPFS (logs) | 100 MB | browser-managed | session-logging-system |
| SQLite (audit) | 20 MB | 50 MB | namespace per project |

## Eviction rules
1. **OPFS logs**: rolling 7-day prune (always-on, mem://architecture/session-logging-system).
2. **Audit JSON**: keep last N=50 runs per macro; older runs compacted to summary row.
3. **IndexedDB PromptCache**: LRU eviction when > 80% of soft cap.
4. **chrome.storage.local**: NEVER auto-evict user data; surface E-12 toast at 90% and block new macros at 100%.

## Telemetry
- Metric `storage_used_pct` per layer (observability/11).
- Reason `W_STORAGE_PRESSURE` at 80%, `F_STORAGE_FULL` at 100%.

## Recovery
- User-initiated: Settings → Storage → Export then Clear.
- Programmatic: `pruneOldRuns(macroId, keep=50)` in audit writer (engine/14).
