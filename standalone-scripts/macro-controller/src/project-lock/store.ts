/**
 * project-lock/store — persists `LoopProjectLockEvent` rows via `marco.kv`
 * (SQLite-backed). Matches the storage pattern used by credit-balance/store.
 *
 * Idempotency rule (spec §7): two events for the same (WorkspaceId, ProjectId,
 * Reason) within 1000ms collapse to a single row.
 *
 * Standards:
 *   - mem://constraints/no-retry-policy — single attempt; failures log.
 *   - mem://standards/error-logging-via-namespace-logger.
 */

import { logError } from '../error-utils';
import { log } from '../logging';
import type { ProjectLockEvent } from './types';

const KEY_PREFIX = 'LoopProjectLockEvent:';
const DUPLICATE_WINDOW_MS = 1000;

interface KvBridge {
    kv: {
        get(key: string): Promise<string | null>;
        set(key: string, value: string): Promise<void>;
        delete(key: string): Promise<void>;
        list?(prefix: string): Promise<ReadonlyArray<{ key: string; value: string }>>;
    };
}

function getKv(): KvBridge['kv'] | null {
    const sdk = (window as unknown as { marco?: KvBridge }).marco;
    return sdk && sdk.kv ? sdk.kv : null;
}

function buildKey(ev: ProjectLockEvent): string {
    return KEY_PREFIX + ev.WorkspaceId + ':' + ev.ProjectId + ':' + String(ev.DetectedAtMs);
}

function parseRow(raw: string): ProjectLockEvent | null {
    try {
        const parsed = JSON.parse(raw) as Partial<ProjectLockEvent>;
        if (
            typeof parsed.WorkspaceId === 'string' &&
            typeof parsed.ProjectId === 'string' &&
            typeof parsed.DetectedAtMs === 'number' &&
            typeof parsed.Reason === 'string' &&
            typeof parsed.ReasonDetail === 'string'
        ) {
            return parsed as ProjectLockEvent;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Persist a project-lock event. Returns true if written, false if it was
 * deduplicated against an event with the same (workspace, project, reason)
 * detected within `DUPLICATE_WINDOW_MS`.
 */
export async function persistProjectLockEvent(ev: ProjectLockEvent): Promise<boolean> {
    const kv = getKv();
    if (!kv) {
        logError(
            'LoopProjectLockEvent.persist',
            'marco.kv unavailable — cannot persist project-lock event for ws=' + ev.WorkspaceId,
        );
        return false;
    }
    try {
        if (typeof kv.list === 'function') {
            const recent = await kv.list(KEY_PREFIX + ev.WorkspaceId + ':' + ev.ProjectId + ':');
            for (const entry of recent) {
                const prev = parseRow(entry.value);
                if (prev === null) {
                    continue;
                }
                const sameReason = prev.Reason === ev.Reason;
                const within = Math.abs(prev.DetectedAtMs - ev.DetectedAtMs) <= DUPLICATE_WINDOW_MS;
                if (sameReason && within) {
                    return false;
                }
            }
        }
        await kv.set(buildKey(ev), JSON.stringify(ev));
        log(
            'LoopProjectLockEvent: persisted ws=' + ev.WorkspaceId +
                ' project=' + ev.ProjectId +
                ' reason=' + ev.Reason,
            'info',
        );
        return true;
    } catch (caught: unknown) {
        logError(
            'LoopProjectLockEvent.persist',
            'kv write failed for ws=' + ev.WorkspaceId,
            caught,
        );
        return false;
    }
}

/** Enumerate all persisted project-lock events, oldest first. */
export async function listProjectLockEvents(): Promise<ReadonlyArray<ProjectLockEvent>> {
    const kv = getKv();
    if (!kv || typeof kv.list !== 'function') {
        return [];
    }
    try {
        const entries = await kv.list(KEY_PREFIX);
        const rows: ProjectLockEvent[] = [];
        for (const entry of entries) {
            const row = parseRow(entry.value);
            if (row !== null) {
                rows.push(row);
            }
        }
        rows.sort(function (a, b): number {
            return a.DetectedAtMs - b.DetectedAtMs;
        });
        return rows;
    } catch (caught: unknown) {
        logError('LoopProjectLockEvent.list', 'kv.list failed', caught);
        return [];
    }
}

export const LOOP_PROJECT_LOCK_KEY_PREFIX = KEY_PREFIX;
