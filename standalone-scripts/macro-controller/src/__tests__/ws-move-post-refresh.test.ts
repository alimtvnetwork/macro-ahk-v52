/**
 * Unit test — ws-move post-move credit-balance refresh (Issue 122a)
 *
 * Spec: spec/22-app-issues/122a-credit-balance-throttle-and-persistence.md
 *
 * Confirms that on a successful `moveToWorkspace()` the destination
 * workspace's `/credit-balance` is force-refreshed and persisted via
 * `fetchAndPersist(targetWorkspaceId, { force: true, source: 'manual' })`,
 * bypassing the 10s throttle gate.
 *
 * Strategy: vi.mock() the heavy collaborators (auth, MacroController,
 * toast, logging, fetcher, credit-balance, workspace-detection) and
 * stub `window.marco.api.workspace.move` to return a 200 ok response.
 * Then await `moveToWorkspace()` and assert the fetcher spy received
 * the expected (id, { force: true, source: 'manual' }) call.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- mocks (declared before SUT import) ----------
vi.mock('../auth', () => ({
    resolveToken: vi.fn(() => 'tok_abc123def456'),
    invalidateSessionBridgeKey: vi.fn(() => 'fallback'),
    recoverAuthOnce: vi.fn(async () => 'tok_abc123def456'),
}));

vi.mock('../workspace-detection', () => ({
    extractProjectIdFromUrl: vi.fn(() => 'proj_TEST'),
}));

vi.mock('../toast', () => ({
    showToast: vi.fn(),
}));

vi.mock('../logging', () => ({
    log: vi.fn(),
    logSub: vi.fn(),
}));

vi.mock('../error-utils', () => ({
    logError: vi.fn(),
}));

vi.mock('../credit-balance', () => ({
    clearResolvedWorkspace: vi.fn(),
}));

const { fetchAndPersistSpy } = vi.hoisted(() => ({
    fetchAndPersistSpy: vi.fn(async () => undefined),
}));
vi.mock('../credit-balance/fetcher', () => ({
    fetchAndPersist: fetchAndPersistSpy,
}));

vi.mock('../core/MacroController', () => ({
    MacroController: {
        getInstance: () => ({
            workspaces: { addChangeEntry: vi.fn() },
            credits: { fetch: vi.fn() },
            ui: { populateDropdown: vi.fn() },
            updateUI: vi.fn(),
        }),
    },
}));

vi.mock('../shared-state', () => ({
    CREDIT_API_BASE: 'https://example.test',
    state: {
        running: true, // bypasses the UI confirm dialog
        isDelegating: false,
        forceDirection: null,
        delegateStartTime: 0,
        workspaceName: 'origin-ws',
        workspaceFromApi: false,
    },
}));

// ---------- SUT ----------
import { moveToWorkspace } from '../ws-move';

beforeEach(() => {
    fetchAndPersistSpy.mockClear();
    (globalThis as unknown as { window: Window }).window = (globalThis as unknown as { window?: Window }).window ?? ({} as Window);
    (window as unknown as { marco: { api: { workspace: { move: (p: string, w: string) => Promise<{ ok: boolean; status: number; data: unknown }> } } } }).marco = {
        api: {
            workspace: {
                move: vi.fn(async () => ({ ok: true, status: 200, data: { ok: true } })),
            } as unknown as { move: (p: string, w: string) => Promise<{ ok: boolean; status: number; data: unknown }> },
        },
    };
});

describe('moveToWorkspace — post-move credit-balance refresh', () => {
    it('force-refreshes the destination workspace after a successful move', async () => {
        await moveToWorkspace('ws_DEST_999', 'Destination WS');

        expect(fetchAndPersistSpy).toHaveBeenCalledTimes(1);
        expect(fetchAndPersistSpy).toHaveBeenCalledWith(
            'ws_DEST_999',
            { force: true, source: 'manual' },
        );
    });

    it('refresh is fire-and-forget — moveToWorkspace resolves even if refresh rejects', async () => {
        fetchAndPersistSpy.mockImplementationOnce(async () => { throw new Error('boom'); });
        await expect(moveToWorkspace('ws_DEST_42', 'Other')).resolves.toBeUndefined();
        expect(fetchAndPersistSpy).toHaveBeenCalledWith(
            'ws_DEST_42',
            { force: true, source: 'manual' },
        );
    });
});
