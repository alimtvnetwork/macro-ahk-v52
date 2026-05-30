/**
 * Unit tests — credit-balance/throttle (Issue 122a)
 *
 * Spec: spec/22-app-issues/122a-credit-balance-throttle-and-persistence.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    PER_WS_MIN_INTERVAL_MS,
    INTER_WS_GAP_MS,
    shouldFetch,
    recordFetch,
    seedLastFetched,
    getLastFetched,
    getLastAnyFetchAt,
    __resetThrottleForTests,
} from '../credit-balance/throttle';

const WS_A = 'workspace_AAA';
const WS_B = 'workspace_BBB';

beforeEach(() => __resetThrottleForTests());

describe('throttle.shouldFetch', () => {
    it('allows the very first fetch for a workspace', () => {
        const d = shouldFetch(WS_A, PER_WS_MIN_INTERVAL_MS);
        expect(d.allowed).toBe(true);
        expect(d.reason).toBe('ok');
    });

    it('blocks same-ws fetch within PER_WS_MIN_INTERVAL_MS', () => {
        recordFetch(WS_A, 10_000);
        const d = shouldFetch(WS_A, 10_000 + PER_WS_MIN_INTERVAL_MS - 1);
        expect(d.allowed).toBe(false);
        expect(d.reason).toBe('per-ws-cooldown');
        expect(d.waitMs).toBe(1);
    });

    it('allows same-ws fetch exactly at PER_WS_MIN_INTERVAL_MS', () => {
        recordFetch(WS_A, 10_000);
        // inter-ws gate also satisfied (5s < 10s elapsed)
        const d = shouldFetch(WS_A, 10_000 + PER_WS_MIN_INTERVAL_MS);
        expect(d.allowed).toBe(true);
    });

    it('blocks a different ws via INTER_WS_GAP_MS', () => {
        recordFetch(WS_A, 10_000);
        const d = shouldFetch(WS_B, 10_000 + INTER_WS_GAP_MS - 1);
        expect(d.allowed).toBe(false);
        expect(d.reason).toBe('inter-ws-cooldown');
    });

    it('force bypasses both gates', () => {
        recordFetch(WS_A, 10_000);
        const d = shouldFetch(WS_A, 10_500, true);
        expect(d.allowed).toBe(true);
        expect(d.reason).toBe('forced');
    });
});

describe('throttle.recordFetch / seedLastFetched', () => {
    it('recordFetch updates per-ws + global timestamps', () => {
        recordFetch(WS_A, 42_000);
        expect(getLastFetched(WS_A)).toBe(42_000);
        expect(getLastAnyFetchAt()).toBe(42_000);
    });

    it('ignores empty workspaceId', () => {
        recordFetch('', 99_000);
        expect(getLastAnyFetchAt()).toBe(0);
    });

    it('seedLastFetched seeds per-ws but NOT global', () => {
        seedLastFetched(WS_A, 5_000);
        expect(getLastFetched(WS_A)).toBe(5_000);
        expect(getLastAnyFetchAt()).toBe(0);
    });

    it('seedLastFetched never regresses an existing newer value', () => {
        recordFetch(WS_A, 20_000);
        seedLastFetched(WS_A, 10_000);
        expect(getLastFetched(WS_A)).toBe(20_000);
    });
});
