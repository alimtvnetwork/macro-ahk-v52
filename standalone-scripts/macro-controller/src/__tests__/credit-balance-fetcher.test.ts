import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditFetchOutcome } from '../credit-balance-update/credit-fetch-outcome';
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

vi.mock('../shared-state', () => ({
    CREDIT_API_BASE: 'https://api.example.test',
}));

vi.mock('../error-utils', () => ({
    logError: logErrorSpy,
    logWarn: logWarnSpy,
}));

import { fetchWorkspaceCreditBalance } from '../credit-balance-update/credit-balance-fetcher';

interface FetchGlobal {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

beforeEach(() => {
    getBearerTokenSpy.mockClear();
    getBearerTokenSpy.mockResolvedValue('tok_abc123def4567890');
    markBearerTokenExpiredSpy.mockClear();
    logErrorSpy.mockClear();
    logWarnSpy.mockClear();
});

describe('credit-balance fetcher', () => {
    it('uses getBearerToken and parses a successful response', async () => {
        const fetchSpy = vi.fn(async () => new Response(JSON.stringify({
            total_remaining: 5,
            total_granted: 5,
            daily_remaining: 5,
            daily_limit: 5,
            total_billing_period_used: 0,
            expiring_grants: [],
            grant_type_balances: [{ grant_type: 'daily', granted: 5, remaining: 5 }],
        }), { status: 200 }));
        vi.stubGlobal('fetch', fetchSpy);

        const result = await fetchWorkspaceCreditBalance({ workspaceId: 'ws_123', plan: Plan.Ktlo, timeoutMs: 3000 });

        expect(getBearerTokenSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const init = fetchSpy.mock.calls[0][1] as RequestInit;
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok_abc123def4567890');
        expect(result.outcome).toBe(CreditFetchOutcome.ApiHit);
        expect(result.balance?.dailyRemaining).toBe(5);
    });

    it('returns MissingToken and logs without calling fetch when auth is absent', async () => {
        getBearerTokenSpy.mockResolvedValueOnce(null);
        const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchSpy);

        const result = await fetchWorkspaceCreditBalance({ workspaceId: 'ws_123', plan: Plan.Free, timeoutMs: 3000 });

        expect(result.outcome).toBe(CreditFetchOutcome.MissingToken);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(logErrorSpy).toHaveBeenCalledTimes(1);
        expect(String(logErrorSpy.mock.calls[0][1])).toContain('MissingToken');
    });

    it('marks bearer token expired on 401 and returns AuthError', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('denied', { status: 401 })));

        const result = await fetchWorkspaceCreditBalance({ workspaceId: 'ws_123', plan: Plan.Cancelled, timeoutMs: 3000 });

        expect(result.outcome).toBe(CreditFetchOutcome.AuthError);
        expect(markBearerTokenExpiredSpy).toHaveBeenCalledWith('credit-balance-update');
        expect(logErrorSpy).toHaveBeenCalledTimes(1);
        expect(String(logErrorSpy.mock.calls[0][1])).toContain('AuthError');
    });

    it('returns Timeout when AbortController cancels the request', async () => {
        const neverResolvingFetch = vi.fn((_: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            return new Promise<Response>(function (_resolve, reject): void {
                init?.signal?.addEventListener('abort', function (): void {
                    reject(new DOMException('Aborted', 'AbortError'));
                });
            });
        });
        vi.stubGlobal('fetch', neverResolvingFetch);

        const result = await fetchWorkspaceCreditBalance({ workspaceId: 'ws_123', plan: Plan.Ktlo, timeoutMs: 1 });

        expect(result.outcome).toBe(CreditFetchOutcome.Timeout);
        expect(logErrorSpy).toHaveBeenCalledTimes(1);
        expect(String(logErrorSpy.mock.calls[0][1])).toContain('Timeout');
    });
});
