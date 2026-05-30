import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    probeProgress,
    resolveConnection,
    wellKnownJobId,
    DEFAULT_PROBE_DEADLINE_MS,
    PROBE_POLL_INTERVAL_MS,
} from '../gitsync/progress-probe';

interface MockResp { ok: boolean; status: number; data: unknown }

function installSdk(responder: (path: string, params: Record<string, string>) => MockResp | Promise<MockResp>) {
    const calls: Array<{ path: string; params: Record<string, string> }> = [];
    (window as unknown as { marco: unknown }).marco = {
        api: {
            call: async (path: string, opts: { params: Record<string, string>; baseUrl: string }) => {
                calls.push({ path, params: opts.params });
                return responder(path, opts.params);
            },
        },
    };
    return calls;
}

beforeEach(() => {
    delete (window as unknown as { marco?: unknown }).marco;
    vi.useRealTimers();
});

describe('wellKnownJobId', () => {
    it('builds gitsync-sync-project-{projectId}', () => {
        expect(wellKnownJobId('proj-xyz')).toBe('gitsync-sync-project-proj-xyz');
    });
});

describe('probeProgress', () => {
    it('returns null on 404 (no job yet)', async () => {
        installSdk(() => ({ ok: false, status: 404, data: {} }));
        const r = await probeProgress('ws1', 'p1', 'job1');
        expect(r).toBeNull();
    });

    it('returns body on 200', async () => {
        installSdk(() => ({ ok: true, status: 200, data: { status: 'completed', result: { repo_url: 'https://github.com/a/b' } } }));
        const r = await probeProgress('ws1', 'p1', 'job1');
        expect(r?.status).toBe('completed');
        expect(r?.result?.repo_url).toBe('https://github.com/a/b');
    });

    it('returns null on 401/403 (caller lacks access)', async () => {
        installSdk(() => ({ ok: false, status: 403, data: {} }));
        const r = await probeProgress('ws1', 'p1', 'job1');
        expect(r).toBeNull();
    });

    it('throws on 5xx', async () => {
        installSdk(() => ({ ok: false, status: 500, data: { error: 'boom' } }));
        await expect(probeProgress('ws1', 'p1', 'job1')).rejects.toThrow(/http_500/);
    });

    it('throws when SDK is not injected', async () => {
        await expect(probeProgress('ws1', 'p1', 'job1')).rejects.toThrow(/SDK/);
    });
});

describe('resolveConnection', () => {
    it('returns connected on first probe when status=completed + repo_url', async () => {
        installSdk(() => ({
            ok: true, status: 200,
            data: { status: 'completed', result: { repo_url: 'https://github.com/a/b', repo_name: 'b', owner: 'a' } },
        }));
        const r = await resolveConnection('ws1', 'conn1', 'p1');
        expect(r).toEqual({ connected: true, repoUrl: 'https://github.com/a/b', repoName: 'b', owner: 'a' });
    });

    it('returns not_connected reason=no_job on 404', async () => {
        installSdk(() => ({ ok: false, status: 404, data: {} }));
        const r = await resolveConnection('ws1', 'conn1', 'p1');
        expect(r).toEqual({ connected: false, reason: 'no_job' });
    });

    it('returns no_repo_url when completed without result.repo_url', async () => {
        installSdk(() => ({ ok: true, status: 200, data: { status: 'completed', result: {} } }));
        const r = await resolveConnection('ws1', 'conn1', 'p1');
        expect(r).toEqual({ connected: false, reason: 'no_repo_url' });
    });

    it('polls while running and resolves once completed', async () => {
        let n = 0;
        installSdk(() => {
            n += 1;
            if (n < 3) return { ok: true, status: 200, data: { status: 'running', step: 'pushing_code' } };
            return { ok: true, status: 200, data: { status: 'completed', result: { repo_url: 'https://github.com/a/b' } } };
        });
        const r = await resolveConnection('ws1', 'conn1', 'p1', PROBE_POLL_INTERVAL_MS * 5);
        expect(r.connected).toBe(true);
        if (r.connected) expect(r.repoUrl).toBe('https://github.com/a/b');
        expect(n).toBeGreaterThanOrEqual(3);
    });

    it('returns reason=deadline when running forever', async () => {
        installSdk(() => ({ ok: true, status: 200, data: { status: 'running' } }));
        const r = await resolveConnection('ws1', 'conn1', 'p1', PROBE_POLL_INTERVAL_MS * 2 + 50);
        expect(r).toEqual({ connected: false, reason: 'deadline' });
    });

    it('returns error on transport failure (5xx)', async () => {
        installSdk(() => ({ ok: false, status: 500, data: {} }));
        const r = await resolveConnection('ws1', 'conn1', 'p1');
        expect(r).toEqual({ connected: false, reason: 'error' });
    });

    it('exposes a sane default deadline', () => {
        expect(DEFAULT_PROBE_DEADLINE_MS).toBeGreaterThanOrEqual(1_000);
    });

    it('returns error when wsId/projectId missing without calling SDK', async () => {
        const calls = installSdk(() => ({ ok: true, status: 200, data: {} }));
        const r = await resolveConnection('', 'conn1', '');
        expect(r).toEqual({ connected: false, reason: 'error' });
        expect(calls.length).toBe(0);
    });
});
