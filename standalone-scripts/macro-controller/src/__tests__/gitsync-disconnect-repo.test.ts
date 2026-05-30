/**
 * Issue 129 Step 9 — disconnectGithubRepo helper.
 *
 * Verifies:
 *   - DELETE /sync uses the marco SDK with method='DELETE'.
 *   - Cache is invalidated on success and on 404 (already not_linked).
 *   - Single attempt — no retry/backoff (`mem://constraints/no-retry-policy`).
 *   - confirmAndDisconnectGithubRepo gates the call behind confirm()
 *     and returns { status: 'cancelled' } when the user dismisses.
 *
 * Honors `mem://preferences/test-with-features`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface SdkCall {
    path: string;
    method?: string;
    params: Record<string, string>;
}

const sdkCalls: SdkCall[] = [];
const cacheInvalidations: Array<{ wsId: string; pid: string }> = [];

function installSdkMock(handler: () => { ok: boolean; status: number; data: unknown } | Promise<never>): void {
    (globalThis as unknown as { window: unknown }).window = {
        marco: {
            api: {
                call: async (path: string, opts: { method?: string; params: Record<string, string> }) => {
                    sdkCalls.push({ path, method: opts.method, params: opts.params });
                    return handler();
                },
            },
        },
        confirm: () => true,
    };
}

vi.mock('../gitsync-cache', () => ({
    invalidateGitsyncCache: (wsId: string, pid: string) => {
        cacheInvalidations.push({ wsId, pid });
    },
}));
vi.mock('../error-utils', () => ({ logError: () => {} }));
vi.mock('../logging', () => ({ log: () => {} }));
vi.mock('../shared-state', () => ({ CREDIT_API_BASE: 'https://x' }));

beforeEach(() => {
    sdkCalls.length = 0;
    cacheInvalidations.length = 0;
});

describe('disconnectGithubRepo', () => {
    it('issues DELETE /sync and invalidates cache on 200', async () => {
        installSdkMock(() => ({ ok: true, status: 200, data: {} }));
        const { disconnectGithubRepo } = await import('../gitsync/disconnect-repo');
        const out = await disconnectGithubRepo('ws-1', 'pid-1');
        expect(out).toEqual({ status: 'ok' });
        expect(sdkCalls).toEqual([{ path: 'projects.gitsync', method: 'DELETE', params: { wsId: 'ws-1', projectId: 'pid-1' } }]);
        expect(cacheInvalidations).toEqual([{ wsId: 'ws-1', pid: 'pid-1' }]);
    });

    it('returns not_linked + invalidates on 404', async () => {
        installSdkMock(() => ({ ok: false, status: 404, data: {} }));
        const { disconnectGithubRepo } = await import('../gitsync/disconnect-repo');
        const out = await disconnectGithubRepo('ws-2', 'pid-2');
        expect(out).toEqual({ status: 'not_linked' });
        expect(cacheInvalidations).toEqual([{ wsId: 'ws-2', pid: 'pid-2' }]);
    });

    it('returns error and does NOT invalidate on 500', async () => {
        installSdkMock(() => ({ ok: false, status: 500, data: { error: 'boom' } }));
        const { disconnectGithubRepo } = await import('../gitsync/disconnect-repo');
        const out = await disconnectGithubRepo('ws-3', 'pid-3');
        expect(out.status).toBe('error');
        if (out.status === 'error') expect(out.httpStatus).toBe(500);
        expect(cacheInvalidations).toEqual([]);
    });

    it('returns error on missing ids without calling SDK', async () => {
        installSdkMock(() => ({ ok: true, status: 200, data: {} }));
        const { disconnectGithubRepo } = await import('../gitsync/disconnect-repo');
        const out = await disconnectGithubRepo('', 'pid');
        expect(out.status).toBe('error');
        expect(sdkCalls).toEqual([]);
    });

    it('makes a single SDK call (no retry)', async () => {
        let calls = 0;
        installSdkMock(() => { calls++; return { ok: false, status: 502, data: {} }; });
        const { disconnectGithubRepo } = await import('../gitsync/disconnect-repo');
        await disconnectGithubRepo('ws-4', 'pid-4');
        expect(calls).toBe(1);
    });

    it('confirmAndDisconnectGithubRepo: cancelled when user declines', async () => {
        installSdkMock(() => ({ ok: true, status: 200, data: {} }));
        const { confirmAndDisconnectGithubRepo } = await import('../gitsync/disconnect-repo');
        const out = await confirmAndDisconnectGithubRepo('ws-5', 'pid-5', () => false);
        expect(out).toEqual({ status: 'cancelled' });
        expect(sdkCalls).toEqual([]);
        expect(cacheInvalidations).toEqual([]);
    });

    it('confirmAndDisconnectGithubRepo: proceeds when user confirms', async () => {
        installSdkMock(() => ({ ok: true, status: 200, data: {} }));
        const { confirmAndDisconnectGithubRepo } = await import('../gitsync/disconnect-repo');
        const out = await confirmAndDisconnectGithubRepo('ws-6', 'pid-6', () => true);
        expect(out).toEqual({ status: 'ok' });
        expect(sdkCalls.length).toBe(1);
        expect(cacheInvalidations).toEqual([{ wsId: 'ws-6', pid: 'pid-6' }]);
    });
});
