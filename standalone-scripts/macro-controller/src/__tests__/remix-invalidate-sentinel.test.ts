/**
 * Issue 129 Step 8 — Injection-sentinel invalidator.
 *
 * Verifies:
 *   - DOM sentinel `<div id="__marco_sentinel__">` is removed when present.
 *   - MAIN-world flag `window.__marcoRelayActive` is deleted when set.
 *   - `INVALIDATE_CACHE` message is sent via sendToExtension.
 *   - All three steps run even when earlier ones return false (no abort).
 *   - Returns a result struct showing which layers were active.
 *
 * Honors mem://preferences/test-with-features +
 * mem://constraints/no-retry-policy.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const sendCalls: Array<{ type: string; payload: unknown }> = [];

vi.mock('../ui/prompt-loader', () => ({
    sendToExtension: async (type: string, payload: unknown) => {
        sendCalls.push({ type, payload });
        return { ok: true };
    },
}));
vi.mock('../error-utils', () => ({ logError: () => {} }));
vi.mock('../logging', () => ({ log: () => {} }));

function installDom(opts: { withSentinel: boolean; withRelayFlag: boolean }): {
    sentinelEl: { remove: () => void; removed: boolean } | null;
} {
    let removed = false;
    const sentinelEl = opts.withSentinel
        ? {
            remove: () => { removed = true; },
            get removed() { return removed; },
        }
        : null;
    (globalThis as unknown as { document: unknown }).document = {
        getElementById: (id: string) => (id === '__marco_sentinel__' ? sentinelEl : null),
    };
    const win: Record<string, unknown> = {};
    if (opts.withRelayFlag) win.__marcoRelayActive = true;
    (globalThis as unknown as { window: unknown }).window = win;
    return { sentinelEl };
}

beforeEach(() => {
    sendCalls.length = 0;
});

describe('invalidateInjectionSentinel', () => {
    it('removes DOM sentinel, clears relay flag, sends INVALIDATE_CACHE', async () => {
        const { sentinelEl } = installDom({ withSentinel: true, withRelayFlag: true });
        const { invalidateInjectionSentinel } = await import('../remix/invalidate-sentinel');
        const res = await invalidateInjectionSentinel();
        expect(res).toEqual({
            removedDomSentinel: true,
            clearedRelayFlag: true,
            sentInvalidateMessage: true,
        });
        expect(sentinelEl?.removed).toBe(true);
        expect((globalThis as unknown as { window: Record<string, unknown> }).window.__marcoRelayActive)
            .toBeUndefined();
        expect(sendCalls).toEqual([{ type: 'INVALIDATE_CACHE', payload: {} }]);
    });

    it('reports false flags when nothing is present, still sends background message', async () => {
        installDom({ withSentinel: false, withRelayFlag: false });
        const { invalidateInjectionSentinel } = await import('../remix/invalidate-sentinel');
        const res = await invalidateInjectionSentinel();
        expect(res.removedDomSentinel).toBe(false);
        expect(res.clearedRelayFlag).toBe(false);
        expect(res.sentInvalidateMessage).toBe(true);
        expect(sendCalls.length).toBe(1);
    });

    it('continues to background invalidation even if relay flag is missing', async () => {
        installDom({ withSentinel: true, withRelayFlag: false });
        const { invalidateInjectionSentinel } = await import('../remix/invalidate-sentinel');
        const res = await invalidateInjectionSentinel();
        expect(res.removedDomSentinel).toBe(true);
        expect(res.clearedRelayFlag).toBe(false);
        expect(res.sentInvalidateMessage).toBe(true);
    });

    it('returns sentInvalidateMessage=false when the message bridge throws', async () => {
        installDom({ withSentinel: false, withRelayFlag: false });
        vi.resetModules();
        vi.doMock('../ui/prompt-loader', () => ({
            sendToExtension: async () => { throw new Error('bridge down'); },
        }));
        vi.doMock('../error-utils', () => ({ logError: () => {} }));
        vi.doMock('../logging', () => ({ log: () => {} }));
        const { invalidateInjectionSentinel } = await import('../remix/invalidate-sentinel');
        const res = await invalidateInjectionSentinel();
        expect(res.sentInvalidateMessage).toBe(false);
        // Restore mocks for any subsequent tests.
        vi.resetModules();
    });
});
