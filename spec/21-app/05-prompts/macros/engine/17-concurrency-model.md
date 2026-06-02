# Concurrency & Race Conditions

Status: Normative · v1.0.0 · 2026-06-02

## Invariants
- **One runner per tab.** Tab-id keyed `Map<tabId, Runner>` in background SW.
- **Single in-flight step** per runner; queue rejects re-entry with `BUSY` reason.
- **Audit writes are serialized** via a per-run `Promise` chain (engine/14).

## Race scenarios
| ID | Scenario | Resolution |
|----|----------|------------|
| R-01 | User clicks Stop during step dispatch | Step completes; runner transitions to `Stopping`→`Stopped`; no further steps |
| R-02 | Tab navigates mid-run | `pagehide` fires teardown; runner emits `NAV_INTERRUPT`, finalizes audit |
| R-03 | Two macros queued for same tab | Second rejected with `BUSY`; UI surfaces toast E-09 |
| R-04 | Watchdog fires while step pending | Watchdog sets `cancelRequested=true`; step polls flag at safe points |
| R-05 | Storage write while reading | All reads via `chrome.storage.local.get` snapshot; writes go through `SafeWriter` queue |

## Locks
- No cross-tab locks. Macros are tab-local.
- Workspace mutations use optimistic concurrency (version field in storage).

## Teardown contract
Every runner registers: clearInterval, clearTimeout, MutationObserver.disconnect, removeEventListener — invoked on Stop, NAV_INTERRUPT, pagehide, SW shutdown.
See mem://standards/timer-and-observer-teardown.
