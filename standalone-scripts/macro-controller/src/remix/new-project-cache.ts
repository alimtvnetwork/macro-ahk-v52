/**
 * MacroLoop Controller — Remix New-Project Cache (Issue 129 Step 6)
 *
 * Captures the URL + project_id returned by a successful remix POST and
 * persists it so the follow-up steps (Step 7 = navigate active tab,
 * Step 8 = invalidate injection sentinel) can pick the value back up
 * without re-parsing the API response.
 *
 * Per-tab semantics: the macro-controller runs in MAIN world bound to a
 * single tab, so we key by the *source* projectId (the project the user
 * remixed FROM). That makes the row stable across reloads of the new tab
 * and lets a different macro-controller instance pick it up on landing.
 *
 * Storage: SQLite via `marco.kv` (`mem://architecture/data-storage-layers`).
 * Key format (PascalCase per logging-data-contract):
 *   `MacroRemixNewProject:{sourceProjectId}` →
 *     {
 *       SourceProjectId, NewProjectId, RedirectUrl,
 *       WorkspaceId, ProjectName, RemixedAtMs
 *     }
 *
 * Policy: NEW kv-key family — allowed by
 *         `mem://constraints/no-storage-pascalcase-migration`
 *         (ban applies only to rewriting existing `StoredProject` keys).
 */

import { logError } from '../error-utils';
import { log } from '../logging';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const KEY_PREFIX = 'MacroRemixNewProject:';

export interface RemixNewProjectRow {
    readonly SourceProjectId: string;
    readonly NewProjectId: string;
    readonly RedirectUrl: string;
    readonly WorkspaceId: string;
    readonly ProjectName: string;
    readonly RemixedAtMs: number;
}

interface KvBridge {
    kv: {
        get(key: string): Promise<string | null>;
        set(key: string, value: string): Promise<void>;
        delete(key: string): Promise<void>;
    };
}

/* ------------------------------------------------------------------ */
/*  SDK accessor                                                       */
/* ------------------------------------------------------------------ */

function getKv(): KvBridge['kv'] | null {
    const sdk = (window as unknown as { marco?: KvBridge }).marco;
    return sdk && sdk.kv ? sdk.kv : null;
}

function buildKey(sourceProjectId: string): string {
    return KEY_PREFIX + sourceProjectId;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export interface PersistRemixInput {
    readonly sourceProjectId: string;
    readonly newProjectId: string;
    readonly redirectUrl: string;
    readonly workspaceId: string;
    readonly projectName: string;
}

/** Build a row from a fresh remix outcome (pure — no I/O). */
export function buildRemixRow(
    input: PersistRemixInput,
    nowMs: number = Date.now(),
): RemixNewProjectRow {
    return {
        SourceProjectId: input.sourceProjectId,
        NewProjectId: input.newProjectId,
        RedirectUrl: input.redirectUrl,
        WorkspaceId: input.workspaceId,
        ProjectName: input.projectName,
        RemixedAtMs: nowMs,
    };
}

/* ------------------------------------------------------------------ */
/*  I/O                                                                */
/* ------------------------------------------------------------------ */

/**
 * Persist the new-project pointer for a successful remix.
 * Returns true on success, false when kv is unavailable or write fails.
 * Never throws — caller may continue without the cache.
 */
export async function persistRemixNewProject(input: PersistRemixInput): Promise<boolean> {
    if (!input.sourceProjectId || !input.newProjectId || !input.redirectUrl) {
        logError('RemixNewProjectCache',
            'persist refused: missing sourceProjectId/newProjectId/redirectUrl'
            + ' (sourceProjectId=' + input.sourceProjectId
            + ', newProjectId=' + input.newProjectId
            + ', redirectUrl=' + input.redirectUrl + ')');
        return false;
    }
    const kv = getKv();
    if (!kv) {
        logError('RemixNewProjectCache',
            'marco.kv unavailable — skipping cache for sourceProjectId=' + input.sourceProjectId);
        return false;
    }
    const row = buildRemixRow(input);
    try {
        await kv.set(buildKey(input.sourceProjectId), JSON.stringify(row));
        log('[RemixNewProjectCache] persisted source=' + input.sourceProjectId
            + ' → new=' + input.newProjectId, 'info');
        return true;
    } catch (err: unknown) {
        logError('RemixNewProjectCache',
            'kv.set failed for sourceProjectId=' + input.sourceProjectId, err);
        return false;
    }
}

/**
 * Read the most-recently persisted new-project pointer for a given
 * source project, or `null` if none exists / parse fails.
 */
export async function readRemixNewProject(
    sourceProjectId: string,
): Promise<RemixNewProjectRow | null> {
    if (!sourceProjectId) return null;
    const kv = getKv();
    if (!kv) return null;
    try {
        const raw = await kv.get(buildKey(sourceProjectId));
        if (!raw) return null;
        return JSON.parse(raw) as RemixNewProjectRow;
    } catch (err: unknown) {
        logError('RemixNewProjectCache',
            'read failed for sourceProjectId=' + sourceProjectId, err);
        return null;
    }
}

/** Drop a cached pointer (used after the new tab has loaded). */
export async function clearRemixNewProject(sourceProjectId: string): Promise<void> {
    if (!sourceProjectId) return;
    const kv = getKv();
    if (!kv) return;
    try {
        await kv.delete(buildKey(sourceProjectId));
    } catch (err: unknown) {
        logError('RemixNewProjectCache',
            'delete failed for sourceProjectId=' + sourceProjectId, err);
    }
}
