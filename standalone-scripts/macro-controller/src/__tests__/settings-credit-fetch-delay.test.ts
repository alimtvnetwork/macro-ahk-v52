/**
 * Phase B Step 48 — settings-credit-fetch-delay.
 *
 * Verifies the sanitizer clamps `creditFetchDelayMs` to [500, 15000],
 * persists across save/load, and hot-reloads into the controller.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface StorageShape { [k: string]: unknown }
const storage: StorageShape = {};

beforeEach(function () {
    for (const k of Object.keys(storage)) delete storage[k];
    vi.resetModules();
    (globalThis as unknown as { chrome: unknown }).chrome = {
        storage: {
            local: {
                get: (key: string) => Promise.resolve({ [key]: storage[key] }),
                set: (entries: Record<string, unknown>) => {
                    Object.assign(storage, entries);
                    return Promise.resolve();
                },
            },
        },
    } as unknown;
});

describe('settings creditFetchDelayMs', function () {
    it('clamps below-min to 500', async function () {
        const mod = await import('../settings-store');
        await mod.saveSettingsOverrides({ creditFetchDelayMs: 100 });
        expect(mod.getSettingsOverrides().creditFetchDelayMs).toBe(500);
    });

    it('clamps above-max to 15000', async function () {
        const mod = await import('../settings-store');
        await mod.saveSettingsOverrides({ creditFetchDelayMs: 99999 });
        expect(mod.getSettingsOverrides().creditFetchDelayMs).toBe(15000);
    });

    it('rejects non-finite', async function () {
        const mod = await import('../settings-store');
        await mod.saveSettingsOverrides({ creditFetchDelayMs: Number.NaN });
        expect(mod.getSettingsOverrides().creditFetchDelayMs).toBeUndefined();
    });

    it('persists default 3000 round-trip', async function () {
        const mod = await import('../settings-store');
        await mod.saveSettingsOverrides({ creditFetchDelayMs: 3000 });
        const reloaded = await mod.loadSettingsOverrides();
        expect(reloaded.creditFetchDelayMs).toBe(3000);
    });

    it('hot-reloads into credit-fetch-controller via subscribe', async function () {
        const settings = await import('../settings-store');
        const ctrl = await import('../credit-balance-update/credit-fetch-controller');
        ctrl.__resetCreditFetchControllerForTests();
        ctrl.subscribeCreditFetchSettings();
        await settings.saveSettingsOverrides({ creditFetchDelayMs: 7000 });
        expect(ctrl.getTimeoutMs()).toBe(7000);
        // Out-of-range write does NOT propagate because clamp happens on save.
        await settings.saveSettingsOverrides({ creditFetchDelayMs: 50 });
        expect(ctrl.getTimeoutMs()).toBe(500);
        ctrl.__resetCreditFetchControllerForTests();
    });
});
