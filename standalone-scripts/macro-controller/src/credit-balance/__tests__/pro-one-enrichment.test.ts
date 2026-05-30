/**
 * Unit tests — credit-balance/pro-one-enrichment (Issue 122a)
 *
 * Spec: spec/22-app-issues/122a-credit-balance-throttle-and-persistence.md
 *
 * Mirrors the pro_0 enrichment test pattern. Verifies that
 * enrichProOneWorkspaces() overlays cached /credit-balance values from
 * the SQLite-backed cache onto every workspace whose plan === 'pro_1',
 * leaves other plans untouched, and gracefully no-ops on cache miss.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WorkspaceCredit } from '../../types';
import { enrichProOneWorkspaces } from '../pro-one-enrichment';

// In-memory marco.kv mock
const kvStore = new Map<string, string>();

beforeEach(() => {
    kvStore.clear();
    (globalThis as unknown as { window: Window }).window = (globalThis as unknown as { window?: Window }).window ?? ({} as Window);
    (window as unknown as { marco: { kv: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void>; delete: (k: string) => Promise<void> } } }).marco = {
        kv: {
            get: vi.fn(async (k: string) => kvStore.get(k) ?? null),
            set: vi.fn(async (k: string, v: string) => { kvStore.set(k, v); }),
            delete: vi.fn(async (k: string) => { kvStore.delete(k); }),
        },
    };
});

function seedCache(wsId: string, row: Partial<{ TotalGranted: number; TotalRemaining: number; TotalBillingUsed: number; DailyLimit: number; DailyRemaining: number }>): void {
    kvStore.set('MacroCreditBalanceCache:' + wsId, JSON.stringify({
        WorkspaceId: wsId,
        FetchedAtMs: 1_000_000,
        Source: 'auto',
        TotalGranted: row.TotalGranted ?? 0,
        TotalRemaining: row.TotalRemaining ?? 0,
        TotalBillingUsed: row.TotalBillingUsed ?? 0,
        DailyLimit: row.DailyLimit ?? 0,
        DailyRemaining: row.DailyRemaining ?? 0,
        RawJson: '{}',
    }));
}

function mkWs(overrides: Partial<WorkspaceCredit>): WorkspaceCredit {
    return {
        id: 'ws_X',
        name: 'X',
        fullName: 'X',
        plan: 'pro_1',
        totalCredits: 0,
        available: 0,
        used: 0,
        totalCreditsUsed: 0,
        dailyLimit: 0,
        dailyUsed: 0,
        dailyFree: 0,
        ...overrides,
    } as WorkspaceCredit;
}

describe('enrichProOneWorkspaces', () => {
    it('returns 0 and is safe on empty input', async () => {
        await expect(enrichProOneWorkspaces([])).resolves.toBe(0);
    });

    it('overlays cached totals onto pro_1 rows', async () => {
        seedCache('ws_A', {
            TotalGranted: 500,
            TotalRemaining: 123,
            TotalBillingUsed: 377,
            DailyLimit: 50,
            DailyRemaining: 30,
        });
        const ws = mkWs({ id: 'ws_A', plan: 'pro_1' });
        const mutated = await enrichProOneWorkspaces([ws]);
        expect(mutated).toBe(1);
        expect(ws.totalCredits).toBe(500);
        expect(ws.available).toBe(123);
        expect(ws.totalCreditsUsed).toBe(377);
        expect(ws.used).toBe(377);
        expect(ws.dailyLimit).toBe(50);
        expect(ws.dailyFree).toBe(30);
        expect(ws.dailyUsed).toBe(20); // 50 - 30
    });

    it('case-insensitive + trims whitespace on plan literal', async () => {
        seedCache('ws_C', { TotalGranted: 10, TotalRemaining: 4 });
        const ws = mkWs({ id: 'ws_C', plan: '  PRO_1  ' });
        const mutated = await enrichProOneWorkspaces([ws]);
        expect(mutated).toBe(1);
        expect(ws.totalCredits).toBe(10);
    });

    it('leaves non-pro_1 rows untouched', async () => {
        seedCache('ws_B', { TotalGranted: 999, TotalRemaining: 999 });
        const ws = mkWs({ id: 'ws_B', plan: 'pro_0', totalCredits: 42, available: 7 });
        const mutated = await enrichProOneWorkspaces([ws]);
        expect(mutated).toBe(0);
        expect(ws.totalCredits).toBe(42);
        expect(ws.available).toBe(7);
    });

    it('skips pro_1 rows with cache miss without throwing', async () => {
        const ws = mkWs({ id: 'ws_MISS', plan: 'pro_1', totalCredits: 8, available: 5 });
        const mutated = await enrichProOneWorkspaces([ws]);
        expect(mutated).toBe(0);
        expect(ws.totalCredits).toBe(8);
        expect(ws.available).toBe(5);
    });

    it('skips rows without an id', async () => {
        const ws = mkWs({ id: '', plan: 'pro_1' });
        const mutated = await enrichProOneWorkspaces([ws]);
        expect(mutated).toBe(0);
    });

    it('clamps negative TotalRemaining and dailyUsed to 0', async () => {
        seedCache('ws_NEG', {
            TotalGranted: 100,
            TotalRemaining: -5,
            TotalBillingUsed: -3,
            DailyLimit: 10,
            DailyRemaining: 50, // remaining > limit → dailyUsed would go negative
        });
        const ws = mkWs({ id: 'ws_NEG', plan: 'pro_1' });
        await enrichProOneWorkspaces([ws]);
        expect(ws.available).toBe(0);
        expect(ws.totalCreditsUsed).toBe(0);
        expect(ws.dailyUsed).toBe(0);
    });

    it('rounds fractional API values', async () => {
        seedCache('ws_F', {
            TotalGranted: 100.7,
            TotalRemaining: 33.4,
            TotalBillingUsed: 66.6,
            DailyLimit: 9.8,
            DailyRemaining: 4.2,
        });
        const ws = mkWs({ id: 'ws_F', plan: 'pro_1' });
        await enrichProOneWorkspaces([ws]);
        expect(ws.totalCredits).toBe(101);
        expect(ws.available).toBe(33);
        expect(ws.totalCreditsUsed).toBe(67);
        expect(ws.dailyLimit).toBe(10);
        expect(ws.dailyFree).toBe(4);
    });

    it('processes multiple pro_1 rows in a single batch and counts mutations', async () => {
        seedCache('ws_1', { TotalGranted: 1, TotalRemaining: 1 });
        seedCache('ws_2', { TotalGranted: 2, TotalRemaining: 2 });
        const rows = [
            mkWs({ id: 'ws_1', plan: 'pro_1' }),
            mkWs({ id: 'ws_2', plan: 'pro_1' }),
            mkWs({ id: 'ws_3', plan: 'pro_2' }), // ignored
        ];
        const mutated = await enrichProOneWorkspaces(rows);
        expect(mutated).toBe(2);
        expect(rows[0].totalCredits).toBe(1);
        expect(rows[1].totalCredits).toBe(2);
        expect(rows[2].totalCredits).toBe(0); // untouched
    });
});
