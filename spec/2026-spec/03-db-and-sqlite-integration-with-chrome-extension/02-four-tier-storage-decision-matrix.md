# Step 02 — Four-Tier Storage Decision Matrix

> Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md). Previous: [`step-01-purpose-and-mindset.md`](./step-01-purpose-and-mindset.md).

## Goal

Give the implementer AI a **single matrix** that maps any data shape to exactly one of the four storage tiers, with the package name and a minimal code sample for each.

## The four tiers

| # | Tier | Package / API | Where it lives | Typical row size |
|---|---|---|---|---|
| 1 | **SQLite** (via sql.js) | [`sql.js`](https://www.npmjs.com/package/sql.js) + `sql-wasm.wasm` | In-memory DB persisted to `chrome.storage.local` blob (small) **or** OPFS file (large) — see step 17 | 10 B – 100 KB |
| 2 | **IndexedDB** | Native (`indexedDB`); optional [`idb`](https://www.npmjs.com/package/idb) wrapper | Browser-managed object store, per-origin | 1 KB – many MB |
| 3 | **`chrome.storage.local`** | `chrome.storage.local` (MV3 API) | Chrome-managed JSON KV, per-extension | < 8 KB per key |
| 4 | **`localStorage`** | Native `localStorage` (DOM contexts only) | Per-origin synchronous KV | < 1 KB per key |

## Decision matrix

| Data shape | Read frequency | Survives browser cleanup? | Tier | Why |
|---|---|---|---|---|
| Relational rows (joins, indexes, aggregates) | Any | Yes (with persistence) | **SQLite** | Only tier that supports SQL, joins, prepared statements |
| Append-only logs / audit trail | High write, low read | Yes | **SQLite** (`session-log` table — step 35) | Bind safety + retention/prune SQL |
| Large blobs (script source, namespace bundles) | Cold-start critical | No, but rebuildable | **IndexedDB** | No JSON serialization overhead; GB-scale quota |
| Cached fetch responses tagged by version | High | No, rebuildable on update | **IndexedDB** (step 23) | Structured clone + version guard |
| Small JSON config (settings, last-used tab) | Medium | Yes | **`chrome.storage.local`** | Survives cleanup; synced across popup/options/background |
| Cross-context UI state (popup ↔ options) | Medium | Yes | **`chrome.storage.local`** | Built-in `onChanged` event |
| One-tab ephemeral UI state (collapsed panel, scroll position) | High | No | **`localStorage`** | Synchronous, scoped to DOM context |
| Auth tokens / secrets | Any | n/a | **None of the above** — use `chrome.storage.session` or in-memory + Token Bridge | See [`mem://auth/token-retrieval-strategy`] |
| Replay-quality session logs | Always | Yes | **SQLite + OPFS** (step 35) | Cannot fit in `chrome.storage.local`; OPFS gives file-grade durability |

## Hard rules (enforced by CI in step 39)

1. **No logs in `localStorage`.** Logs go to SQLite (step 35). Violations are caught by the storage-audit script in step 39.
2. **No auth tokens in `localStorage` or IndexedDB.** Use `chrome.storage.session` or in-memory token bridge.
3. **No blobs > 8 KB in `chrome.storage.local`.** Use IndexedDB (step 21) or SQLite (step 17).
4. **No `JSON.stringify(blob)` into IndexedDB.** Store the blob directly; structured clone is free.
5. **No remote fetch of `sql-wasm.wasm`.** Bundle locally (step 8). MV3 CSP blocks remote wasm anyway.

## Minimal code sample per tier

### Tier 1 — SQLite (full lifecycle in step 10)

```ts
// src/background/db-manager.ts
import initSqlJs, { type Database } from "sql.js";

const SQL = await initSqlJs({
    locateFile: (file) => chrome.runtime.getURL(`wasm/${file}`),
});
const db: Database = new SQL.Database();
db.run("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)");
db.run("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", ["theme", "dark"]);
const [{ values }] = db.exec("SELECT v FROM kv WHERE k = ?", ["theme"]);
```

### Tier 2 — IndexedDB (wrapper in step 22)

```ts
const req = indexedDB.open("ext-cache", 1);
req.onupgradeneeded = () => req.result.createObjectStore("scripts", { keyPath: "url" });
req.onsuccess = () => {
    const tx = req.result.transaction("scripts", "readwrite");
    tx.objectStore("scripts").put({ url: "/a.js", code: "…", version: "3.50.0" });
};
```

### Tier 3 — `chrome.storage.local`

```ts
await chrome.storage.local.set({ theme: "dark", lastTab: 42 });
const { theme } = await chrome.storage.local.get("theme");
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.theme) { /* propagate */ }
});
```

### Tier 4 — `localStorage` (DOM contexts only — popup / options / content scripts; **never** the service worker)

```ts
localStorage.setItem("ui:panel:collapsed", "1");
const collapsed = localStorage.getItem("ui:panel:collapsed") === "1";
```

## Error model (forward references)

| Tier | Error class | Logger tag | User-visible surface |
|---|---|---|---|
| SQLite | `BindError`, `MigrationError` (step 31) | `SQLITE_BIND`, `MIGRATION` (step 32) | Errors panel row (step 33) + `BootFailureBanner` for init (step 34) |
| IndexedDB | `QuotaError`, `OpenError` (step 31) | `INDEXEDDB` (step 32) | Errors panel row (step 33) |
| `chrome.storage.local` | `QuotaError` (step 31) | `CHROME_STORAGE` (step 32) | Errors panel row + storage-auto-pruner toast (step 26) |
| `localStorage` | `QuotaError` (step 31) | `LOCALSTORAGE` (step 32) | Errors panel row only |

## Acceptance

- [ ] Implementer AI can answer "which tier for X data?" using only this table.
- [ ] All five hard rules are enforced by automated checks (step 39).
- [ ] Each minimal code sample compiles in isolation with the packages from step 7 installed.

## Cross-references

- Previous: [`step-01-purpose-and-mindset.md`](./step-01-purpose-and-mindset.md)
- Next: [`step-03-quota-persistence-eviction.md`](./step-03-quota-persistence-eviction.md)
- Flowchart: [`step-04-choose-a-tier-flowchart.md`](./step-04-choose-a-tier-flowchart.md)
- MV3 constraints: [`step-05-mv3-constraints.md`](./step-05-mv3-constraints.md)
- Error model: [`step-31-error-model.md`](./step-31-error-model.md)
