/**
 * Unit tests — project-lock/store (Issue 124 §2.4).
 *
 * Mirrors the credit-balance/store test setup: an in-memory marco.kv mock
 * backed by a Map. Verifies persist + list ordering and the 1-second
 * idempotency window.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectLockEvent } from '../types';
import { listProjectLockEvents, persistProjectLockEvent } from '../store';

const kvStore = new Map<string, string>();

beforeEach(() => {
    kvStore.clear();
    (globalThis as unknown as { window: Window }).window =
        (globalThis as unknown as { window?: Window }).window ?? ({} as Window);
    (window as unknown as { marco: { kv: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void>; delete: (k: string) => Promise<void>; list: (prefix: string) => Promise<{ key: string; value: string }[]> } } }).marco = {
        kv: {
            get: vi.fn(async (k: string) => kvStore.get(k) ?? null),
            set: vi.fn(async (k: string, v: string) => { kvStore.set(k, v); }),
            delete: vi.fn(async (k: string) => { kvStore.delete(k); }),
            list: vi.fn(async (prefix: string) => {
                const out: { key: string; value: string }[] = [];
                kvStore.forEach((value, key) => {
                    if (key.startsWith(prefix)) {
                        out.push({ key, value });
                    }
                });
                return out;
            }),
        },
    };
});

function makeEvent(overrides: Partial<ProjectLockEvent> = {}): ProjectLockEvent {
    return {
        WorkspaceId: 'ws-1',
        ProjectId: 'proj-1',
        DetectedAtMs: 1_000_000,
        Reason: 'api-423',
        ReasonDetail: 'HTTP 423 Locked',
        ...overrides,
    };
}

describe('persistProjectLockEvent', () => {
    it('writes a single event when none exists', async () => {
        const ok = await persistProjectLockEvent(makeEvent());
        expect(ok).toBe(true);
        const all = await listProjectLockEvents();
        expect(all).toHaveLength(1);
        expect(all[0].WorkspaceId).toBe('ws-1');
        expect(all[0].Reason).toBe('api-423');
    });

    it('dedupes a duplicate event with same reason within 1s window', async () => {
        await persistProjectLockEvent(makeEvent({ DetectedAtMs: 1_000_000 }));
        const second = await persistProjectLockEvent(makeEvent({ DetectedAtMs: 1_000_500 }));
        expect(second).toBe(false);
        const all = await listProjectLockEvents();
        expect(all).toHaveLength(1);
    });

    it('writes a second event when separated by more than 1s', async () => {
        await persistProjectLockEvent(makeEvent({ DetectedAtMs: 1_000_000 }));
        const second = await persistProjectLockEvent(makeEvent({ DetectedAtMs: 1_002_000 }));
        expect(second).toBe(true);
        expect(await listProjectLockEvents()).toHaveLength(2);
    });

    it('writes when reason differs even within 1s window', async () => {
        await persistProjectLockEvent(makeEvent({ DetectedAtMs: 1_000_000, Reason: 'api-423' }));
        const second = await persistProjectLockEvent(
            makeEvent({ DetectedAtMs: 1_000_500, Reason: 'api-body-locked', ReasonDetail: 'project_locked' }),
        );
        expect(second).toBe(true);
        expect(await listProjectLockEvents()).toHaveLength(2);
    });
});

describe('listProjectLockEvents', () => {
    it('returns events ordered by DetectedAtMs ascending', async () => {
        await persistProjectLockEvent(makeEvent({ DetectedAtMs: 3_000, ProjectId: 'p3' }));
        await persistProjectLockEvent(makeEvent({ DetectedAtMs: 1_000, ProjectId: 'p1' }));
        await persistProjectLockEvent(makeEvent({ DetectedAtMs: 2_000, ProjectId: 'p2' }));
        const all = await listProjectLockEvents();
        expect(all.map((r) => r.ProjectId)).toEqual(['p1', 'p2', 'p3']);
    });

    it('returns empty array when kv has no rows', async () => {
        expect(await listProjectLockEvents()).toEqual([]);
    });
});
