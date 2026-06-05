# Step 19 — Backup And Export

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

## Goal

Provide a deterministic manual backup/export path that drains every dirty SQLite database first, then writes a self-describing ZIP bundle containing database bytes, metadata, and diagnostics without using remote fetches or background retries.

## Root cause this prevents

The failure pattern after Steps 17–18 is **stale or partial exported state**: MV3 service workers can die before a debounce timer fires, and per-project DBs can be dirty while the user exports diagnostics. Export MUST therefore be treated as a drain point, not a passive read of the last persisted blob.

## Required files

- `src/background/export/backup-export.ts` — orchestrates full backup creation
- `src/background/export/backup-manifest.ts` — serializable manifest contract
- `src/background/db-manager.ts` — exposes `flushIfDirty()` and `exportGlobalDbBytes()`
- `src/background/project-db-manager.ts` — exposes `flushAllProjectDbs()` and `exportProjectDbBytes()`
- `src/background/log-diagnostics-export.ts` — appends logs and error summaries to the same ZIP
- `src/shared/download-types.ts` — shared `BackupManifest` and export result types

No new runtime package is required. If ZIP creation is not already available, use the existing JSZip-compatible dependency already used by diagnostics export; do not add a native zip binary to extension runtime code.

## Export contract

Every export MUST run in this exact order:

1. `await flushIfDirty()` for the global DB.
2. `await flushAllProjectDbs()` for all open project DBs.
3. Export current in-memory DB bytes with `db.export()`; do not re-read possibly stale storage blobs.
4. Build `manifest.json` with schema version, app version, persistence mode, database list, and created-at ISO string.
5. Append diagnostics/log files after DB bytes are already captured.
6. Return the ZIP bytes to the UI as a download payload.

Export is user-initiated and sequential. Do not parallelize DB flushes because `chrome.storage.local` can throttle write bursts.

## Copy-pasteable TypeScript sample

```ts
import { APP_VERSION } from "../../shared/constants";
import { RiseupAsiaMacroExt } from "../../shared/logger";
import { flushIfDirty, exportGlobalDbBytes, getPersistenceMode } from "../db-manager";
import { flushAllProjectDbs, exportProjectDbBytes } from "../project-db-manager";
import { appendDiagnosticsToZip, createZipWriter } from "../log-diagnostics-export";

type BackupDbEntry = {
  readonly Path: string;
  readonly Scope: "Global" | "Project";
  readonly ProjectSlug: string | null;
  readonly ByteLength: number;
};

type BackupManifest = {
  readonly ManifestVersion: 1;
  readonly AppVersion: string;
  readonly PersistenceMode: "opfs" | "storage" | "memory";
  readonly CreatedAtIso: string;
  readonly Databases: readonly BackupDbEntry[];
};

export async function createBackupZip(): Promise<Uint8Array> {
  try {
    await flushIfDirty();
    await flushAllProjectDbs();

    const zip = createZipWriter();
    const databases: BackupDbEntry[] = [];

    const globalBytes = exportGlobalDbBytes();
    zip.file("db/global.sqlite", globalBytes);
    databases.push({
      Path: "db/global.sqlite",
      Scope: "Global",
      ProjectSlug: null,
      ByteLength: globalBytes.byteLength,
    });

    for (const projectDb of exportProjectDbBytes()) {
      const safeSlug = projectDb.ProjectSlug.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `db/projects/${safeSlug}.sqlite`;
      zip.file(path, projectDb.Bytes);
      databases.push({
        Path: path,
        Scope: "Project",
        ProjectSlug: projectDb.ProjectSlug,
        ByteLength: projectDb.Bytes.byteLength,
      });
    }

    const manifest: BackupManifest = {
      ManifestVersion: 1,
      AppVersion: APP_VERSION,
      PersistenceMode: getPersistenceMode(),
      CreatedAtIso: new Date().toISOString(),
      Databases: databases,
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    await appendDiagnosticsToZip(zip);
    return await zip.generateAsync({ type: "uint8array" });
  } catch (err) {
    RiseupAsiaMacroExt.Logger.error("[backup-export] export failed", {
      Path: "backup.zip",
      Missing: "complete SQLite backup ZIP",
      Reason: "BackupExportFailed",
      ReasonDetail: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
```

## Manifest rules

- `ManifestVersion` starts at `1` and is independent from SQLite schema version.
- `AppVersion` MUST match the unified version policy.
- `CreatedAtIso` is allowed inside the generated backup artifact only; do not write timestamp values to `readme.txt`.
- Database file paths inside ZIP must be stable and relative (`db/global.sqlite`, `db/projects/<slug>.sqlite`).
- Never include bearer tokens, cookies, auth snapshots, or raw localStorage dumps.

## Error model

| Failure | Logger tag | User-visible surface | Recovery |
|---|---|---|---|
| Global flush failed | `[backup-export] export failed` Code-Red | Toast + Errors panel row | Export aborts; dirty flag remains true per Step 18 |
| Project flush failed | `[backup-export] export failed` Code-Red | Toast naming affected project slug | Export aborts; no partial ZIP download |
| ZIP generation failed | `[backup-export] export failed` Code-Red | Toast: backup could not be created | User can retry manually; no automatic retry loop |
| Memory mode export | `[backup-export] memory-mode export` warning | Banner recommends immediate download | Export allowed because memory is the only canonical copy |

All hard failures MUST log `Path`, `Missing`, `Reason`, and `ReasonDetail`.

## Acceptance

- [ ] Manual export awaits `flushIfDirty()` and `flushAllProjectDbs()` before reading any DB bytes.
- [ ] Exported ZIP includes `manifest.json`, `db/global.sqlite`, and one file per open project DB.
- [ ] Exported DB bytes come from live `db.export()`, not from cached OPFS or `chrome.storage.local` blobs.
- [ ] If any flush throws, no ZIP is returned and Code-Red logging includes `Path`, `Missing`, `Reason`, and `ReasonDetail`.
- [ ] Backup export contains no bearer token, cookie, auth localStorage snapshot, or secret value.
- [ ] Memory-mode export still works and shows a warning because export is the only durable copy.

## See also

- [step-17](./17-persistence-backends.md) — Persistence backend waterfall
- [step-18](./18-flush-strategy.md) — Export as an explicit drain point
- [step-26](./26-chrome-storage-local-quota.md) — Quota handling during storage fallback
- [step-35](./35-logging-tables-and-retention.md) — Diagnostics files included in export

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, quotas, retention, byte caps, chunk sizes) to a named constant declared in `spec/2026-spec/01-prompt-spec/reference/05-runtime-defaults.md` or a local `reference/*-defaults.md` file. Inline literals are rejected.
- **MUST** keep `chrome.storage.local` per-key payloads ≤ `CHROME_STORAGE_LOCAL_PER_KEY_BYTES` (8 192) and aggregate writes ≤ `CHROME_STORAGE_LOCAL_TOTAL_BYTES` (10 485 760). Larger payloads route to IndexedDB or SQLite.
- **MUST** await `navigator.storage.persist()` once at boot, log the resolved boolean via `RiseupAsiaMacroExt.Logger.info`, and surface `{ persisted, usage, quota }` in diagnostics — no fire-and-forget.
- **MUST** classify every DB failure with a stable `Reason` code (see `31-error-model.md`) plus `ReasonDetail`, and route it through `Logger.error` — never `console.error` and never silently swallow.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* ignored */ }` around `db.exec()` — masks corruption; the error-swallow audit (`public/error-swallow-audit.json`) will fail CI. ✅ Re-throw after `Logger.error` with full SQL + bind context.
- ❌ Calling `db.run` on a new-tab/blank URL because the auto-injector did not gate the URL. ✅ Use `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` before scheduling any DB-bound work.
- ❌ Hardcoding `Asia/Kuala_Lumpur` (or any zone) when persisting timestamps. ✅ Store `Date.now()` as UTC ms; render with `Intl.DateTimeFormat(undefined, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })`.
- ❌ Treating `chrome.storage.local.set` as synchronous and reading back in the next line. ✅ Always `await` the Promise (MV3) and verify the write via `storage.local.get` in tests.
- ❌ Retrying a failed migration with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy` — surface a Boot Failure Banner (`34-boot-failure-banner.md`) and require user action.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

