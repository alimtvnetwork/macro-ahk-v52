// Step 9 regression: every /credit-balance failure path funnels through
// Logger.error('CreditBalanceUpdate.fetch', …) with the mandatory schema:
// Reason, ReasonDetail, WorkspaceId, BearerPrefix, ElapsedMs, SourceUrl.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Plan } from '../credit-balance-update/plan';

const { getBearerTokenSpy, markBearerTokenExpiredSpy, logErrorSpy, logWarnSpy } = vi.hoisted(() => ({
    getBearerTokenSpy: vi.fn(async () => 'tok_abc123def4567890'),
    markBearerTokenExpiredSpy: vi.fn(),
    logErrorSpy: vi.fn(),
    logWarnSpy: vi.fn(),
}));

vi.mock('../auth', () => ({
    getBearerToken: getBearerTokenSpy,
    markBearerTokenExpired: markBearerTokenExpiredSpy,
}));
vi.mock('../shared-state', () => ({ CREDIT_API_BASE: 'https://api.example.test' }));
vi.mock('../error-utils', () => ({ logError: logErrorSpy, logWarn: logWarnSpy }));

import { fetchWorkspaceCreditBalance } from '../credit-balance-update/credit-balance-fetcher';

const REQUIRED_KEYS = ['Reason', 'ReasonDetail', 'WorkspaceId', 'BearerPrefix', 'ElapsedMs', 'SourceUrl'] as const;

function parseLoggedPayload(callIndex: number): Record<string, unknown> {
    const args = logErrorSpy.mock.calls[callIndex];
    expect(args[0]).toBe('CreditBalanceUpdate.fetch');
    return JSON.parse(args[1] as string) as Record<string, unknown>;
}

function expectSchema(payload: Record<string, unknown>): void {
    for (const key of REQUIRED_KEYS) {
        expect(payload, 'missing required key ' + key).toHaveProperty(key);
    }
    expect(payload.SourceUrl).toMatch(/\/workspaces\/ws_err\/credit-balance$/);
    expect(payload.WorkspaceId).toBe('ws_err');
    expect(typeof payload.ElapsedMs).toBe('number');
}

beforeEach(() => {
    getBearerTokenSpy.mockClear();
    getBearerTokenSpy.mockResolvedValue('tok_abc123def4567890');
    markBearerTokenExpiredSpy.mockClear();
    logErrorSpy.mockClear();
    logWarnSpy.mockClear();
});

describe('credit fetch failure logging schema (Step 9)', () => {
    it('MissingToken path logs CreditBalanceUpdate.fetch with full schema', async () => {
        getBearerTokenSpy.mockResolvedValueOnce(null);
        await fetchWorkspaceCreditBalance({ workspaceId: 'ws_err', plan: Plan.Ktlo, timeoutMs: 1000 });
        expect(logErrorSpy).toHaveBeenCalledTimes(1);
        const payload = parseLoggedPayload(0);
        expectSchema(payload);
        expect(payload.Reason).toBe('MissingToken');
        expect(payload.BearerPrefix).toBeNull();
    });

    it('AuthError (401) path logs full schema with BearerPrefix redacted', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
        await fetchWorkspaceCreditBalance({ workspaceId: 'ws_err', plan: Plan.Pro1, timeoutMs: 1000 });
        const payload = parseLoggedPayload(0);
        expectSchema(payload);
        expect(payload.Reason).toBe('AuthError');
        expect(payload.Status).toBe(401);
        expect(payload.BearerPrefix).toMatch(/REDACTED$/);
    });

    it('Http5xx path logs full schema with BodyPreview', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 503 })));
        await fetchWorkspaceCreditBalance({ workspaceId: 'ws_err', plan: Plan.Pro1, timeoutMs: 1000 });
        const payload = parseLoggedPayload(0);
        expectSchema(payload);
        expect(payload.Reason).toBe('Http5xx');
        expect(payload.BodyPreview).toBe('boom');
    });

    it('NetworkError path logs full schema', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('socket reset'); }));
        await fetchWorkspaceCreditBalance({ workspaceId: 'ws_err', plan: Plan.Pro1, timeoutMs: 1000 });
        const payload = parseLoggedPayload(0);
        expectSchema(payload);
        expect(payload.Reason).toBe('NetworkError');
        expect(payload.ReasonDetail).toMatch(/socket reset/);
    });

    it('rejects the legacy "Path" key (renamed to SourceUrl)', async () => {
        getBearerTokenSpy.mockResolvedValueOnce(null);
        await fetchWorkspaceCreditBalance({ workspaceId: 'ws_err', plan: Plan.Ktlo, timeoutMs: 1000 });
        const payload = parseLoggedPayload(0);
        expect(payload).not.toHaveProperty('Path');
    });
});
