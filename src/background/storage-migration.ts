/**
 * Marco Extension — chrome.storage.local Schema Migration Runner
 *
 * Sequential, idempotent storage migrations for chrome.storage.local payloads.
 * Mirrors the SQLite `schema-migration.ts` pattern, but scoped to JSON values
 * stored under STORAGE_KEY_* keys (projects, scripts, configs, etc.).
 *
 * Phase 2c-storage scaffolding: establishes the version key + sequential runner
 * so future PascalCase key rewrites (planned v2+) drop in as discrete steps.
 * v1 is the current baseline (camelCase StoredProject); no payload changes.
 *
 * @see .lovable/plan.md — Task 2c-storage
 * @see mem://standards/pascalcase-json-keys
 */

import { logBgWarnError, logCaughtError, BgLogTag } from "./bg-logger";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_SCHEMA_VERSION_KEY = "marco_storage_schema_version";

/** Current target storage schema version. Bump when adding a migration. */
export const CURRENT_STORAGE_SCHEMA_VERSION = 1;

/**
 * Hard ceiling enforced by the runtime guard.
 *
 * Phase 2c-storage v2 (PascalCase rewrite of persisted `StoredProject` payloads)
 * is permanently banned — see `mem://constraints/no-storage-pascalcase-migration`.
 * Rewriting camelCase keys would break ~50+ UI / background / options consumers
 * and risk data loss during the migration window.
 *
 * Any attempt to register or execute a migration with `version > MAX_ALLOWED_STORAGE_SCHEMA_VERSION`
 * — or to call `assertNoPascalCaseStorageMigration()` — throws immediately at boot,
 * making the violation impossible to ship.
 */
export const MAX_ALLOWED_STORAGE_SCHEMA_VERSION = 1;

/**
 * Runtime guard. Call from any code path that proposes to rewrite
 * `chrome.storage.local` keys from camelCase to PascalCase. Always throws.
 */
export function assertNoPascalCaseStorageMigration(context: string): never {
    const message =
        `BLOCKED: Storage PascalCase migration attempted from "${context}". ` +
        `Phase 2c-storage v2 is permanently forbidden — see ` +
        `mem://constraints/no-storage-pascalcase-migration. ` +
        `StoredProject in chrome.storage.local MUST remain camelCase.`;
    logBgWarnError(BgLogTag.BOOT, message);
    throw new Error(message);
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StorageMigration {
    version: number;
    description: string;
    /** Applies the migration. Must be idempotent and crash-safe. */
    up: () => Promise<void>;
}

export interface StorageMigrationResult {
    fromVersion: number;
    toVersion: number;
    applied: number;
    failed: boolean;
}

/* ------------------------------------------------------------------ */
/*  Migration Registry                                                 */
/* ------------------------------------------------------------------ */

const MIGRATIONS: StorageMigration[] = [
    {
        version: 1,
        description: "Baseline — establish storage schema version key (no payload changes)",
        up: async () => {
            // Identity migration. Stamps the version so subsequent installs
            // skip straight to v2+ once those migrations land.
        },
    },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Reads the current persisted storage schema version (0 if never stamped).
 */
export async function readStorageSchemaVersion(): Promise<number> {
    try {
        const result = await chrome.storage.local.get(STORAGE_SCHEMA_VERSION_KEY);
        const version = result[STORAGE_SCHEMA_VERSION_KEY];
        const isNumber = typeof version === "number" && Number.isFinite(version);
        return isNumber ? version : 0;
    } catch (err) {
        logCaughtError(
            BgLogTag.BOOT,
            `Failed to read storage schema version\n  Path: chrome.storage.local["${STORAGE_SCHEMA_VERSION_KEY}"]\n  Missing: Persisted numeric version\n  Reason: ${err instanceof Error ? err.message : String(err)}`,
            err,
        );
        return 0;
    }
}

/**
 * Runs all pending storage migrations sequentially (fail-fast, no retry).
 * Stamps the new version only after every migration succeeds.
 */
export async function runStorageMigrations(): Promise<StorageMigrationResult> {
    // Hard runtime guard — refuse to register or execute any migration
    // beyond the camelCase baseline. See MAX_ALLOWED_STORAGE_SCHEMA_VERSION.
    const overCeiling = MIGRATIONS.filter(
        (m) => m.version > MAX_ALLOWED_STORAGE_SCHEMA_VERSION,
    );
    if (overCeiling.length > 0) {
        const versions = overCeiling.map((m) => `v${m.version}`).join(", ");
        assertNoPascalCaseStorageMigration(
            `runStorageMigrations registry (forbidden migrations: ${versions})`,
        );
    }

    const fromVersion = await readStorageSchemaVersion();
    const pending = MIGRATIONS.filter((m) => m.version > fromVersion);

    if (pending.length === 0) {
        return {
            fromVersion,
            toVersion: fromVersion,
            applied: 0,
            failed: false,
        };
    }

    let lastApplied = fromVersion;

    for (const migration of pending) {
        try {
            await migration.up();
            lastApplied = migration.version;
            await chrome.storage.local.set({
                [STORAGE_SCHEMA_VERSION_KEY]: lastApplied,
            });
        } catch (err) {
            logBgWarnError(
                BgLogTag.BOOT,
                `Storage migration v${migration.version} failed\n  Path: chrome.storage.local["${STORAGE_SCHEMA_VERSION_KEY}"]\n  Missing: Successful migration "${migration.description}"\n  Reason: ${err instanceof Error ? err.message : String(err)}`,
            );
            return {
                fromVersion,
                toVersion: lastApplied,
                applied: lastApplied - fromVersion,
                failed: true,
            };
        }
    }

    return {
        fromVersion,
        toVersion: lastApplied,
        applied: pending.length,
        failed: false,
    };
}
