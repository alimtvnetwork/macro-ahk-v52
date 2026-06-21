/**
 * Plan 01 Step 8c — component regression for the real 💰 click path.
 *
 * Locks the chain that helper-only tests cannot prove:
 * click 💰 → /user/workspaces completion → enrichment fan-out →
 * /credit-balance result → CreditResolved repaint → row renders a non-zero
 * semantic progress bar instead of the Pending skeleton.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import type { WorkspaceCredit } from '../types';
import { CreditFetchOutcome } from '../credit-balance-update/credit-fetch-outcome';
import { buildButtonRow } from '../ui/panel-controls';
import { loopCreditState, state } from '../shared-state';

const hoisted = vi.hoisted(() => ({
    fetchSpy: vi.fn(),
    getBearerTokenSpy: vi.fn(),
    proOneRefreshSpy: vi.fn(),
}));

vi.mock('../auth', () => ({
    getBearerToken: hoisted.getBearerTokenSpy,
    updateAuthBadge: vi.fn(),
}));

vi.mock('../api-namespace', () => ({ nsWrite: vi.fn() }));

vi.mock('../async-utils', () => ({
    pollUntil: vi.fn((condition: () => true | null) => {
        condition();
        return Promise.resolve(true);
    }),
}));

vi.mock('../credit-balance/batch-refresh', () => ({
    batchRefreshProOneCreditBalances: hoisted.proOneRefreshSpy,
}));

vi.mock('../credit-balance-update/credit-balance-fetcher', () => ({
    fetchWorkspaceCreditBalance: hoisted.fetchSpy,
}));

vi.mock('../ui/check-button', () => ({
    createCheckButton: () => {
        const checkBtn = document.createElement('button');
        checkBtn.textContent = '✓';
        return { checkBtn };
    },
}));

vi.mock('../ui/countdown', () => ({
    createCountdownCtx: vi.fn(() => ({})),
    updateStartStopBtn: vi.fn(),
}));

vi.mock('../ui/error-overlay', () => ({
    ensureErrorOverlay: vi.fn(),
    getOverlayErrorCount: vi.fn(() => 0),
    setOverlayVisible: vi.fn(),
}));

vi.mock('../ui/menu-builder', () => ({
    buildHamburgerMenu: () => {
        const menuContainer = document.createElement('div');
        const menuBtn = document.createElement('button');
        menuBtn.textContent = '☰';
        menuContainer.appendChild(menuBtn);
        return { menuContainer, menuBtn };
    },
}));

vi.mock('../ui/prompt-manager', () => ({
    getPromptsConfig: vi.fn(() => ({})),
    isPromptsCached: vi.fn(() => true),
    loadPromptsFromJson: vi.fn(async () => []),
    openPromptCreationModal: vi.fn(),
    renderPromptsDropdown: vi.fn(),
    sendToExtension: vi.fn(async () => ({})),
    setRevalidateContext: vi.fn(),
}));

vi.mock('../ui/save-prompt', () => ({ injectSavePromptButton: vi.fn() }));
vi.mock('../ui/skeleton', () => ({ createPromptsListSkeleton: () => document.createElement('div') }));
vi.mock('../ui/task-next-ui', () => ({ loadTaskNextSettings: vi.fn(), setupTaskNextCancelHandler: vi.fn() }));
vi.mock('../ui/ui-updaters', () => ({ attachButtonHoverFx: vi.fn() }));
vi.mock('../toast', () => ({ showToast: vi.fn() }));

function newFreeWorkspace(): WorkspaceCredit {
    return {
        id: 'ws_step_8c_new_free', name: 'New Free', fullName: 'New Free', plan: 'free', role: 'owner', tier: 'FREE',
        dailyFree: 0, dailyUsed: 0, dailyLimit: 0, rolloverUsed: 0, rolloverLimit: 0,
        freeGranted: 0, freeRemaining: 0, used: 0, limit: 0, topupLimit: 0,
        totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
        hasFree: false, totalCreditsUsed: 0, subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
        raw: {}, rawApi: { grant_type_balances: [{ available: 0, total: 0, grant_type: 'free' }] },
        numProjects: 0, gitSyncEnabled: false, nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
        membershipRole: 'owner', planType: 'monthly',
    } as WorkspaceCredit;
}

async function flushMicrotasks(): Promise<void> {
    for (let index = 0; index < 8; index++) {
        await Promise.resolve();
    }
}

async function drainRepaintBudget(): Promise<void> {
    for (let index = 0; index < 6; index++) {
        await flushMicrotasks();
        await vi.advanceTimersByTimeAsync(130);
    }
}

beforeEach(async () => {
    vi.useFakeTimers();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
    document.body.innerHTML = '<div id="loop-ws-count-label"></div><input id="loop-ws-search" value=""><div id="loop-ws-list"></div>';
    loopCreditState.perWorkspace = [newFreeWorkspace()];
    loopCreditState.lastCheckedAt = 1;
    state.workspaceName = 'New Free';
    hoisted.getBearerTokenSpy.mockResolvedValue('bearer-token');
    hoisted.proOneRefreshSpy.mockResolvedValue(undefined);
    hoisted.fetchSpy.mockResolvedValue({
        outcome: CreditFetchOutcome.ApiHit,
        balance: {
            totalRemaining: 25, totalGranted: 50,
            dailyRemaining: 5, dailyLimit: 10,
            totalBillingPeriodUsed: 25,
            expiringGrants: [], grantTypeBalances: [],
        },
        fetchedAt: Date.now(),
        sourceUrl: '/workspaces/ws_step_8c_new_free/credit-balance',
        errorDetail: null,
    });
    const controller = await import('../credit-balance-update/credit-fetch-controller');
    controller.__resetCreditFetchControllerForTests();
    const cache = await import('../credit-balance-update/credit-balance-cache');
    cache.clearCreditBalanceUpdateMemoryCache();
    const renderer = await import('../ws-list-renderer');
    renderer.invalidateWsDropdownHash();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('💰 Credits button — new-free row render after fan-out (plan 01 step 8c)', () => {
    it('replaces the Pending skeleton with a non-zero progressbar within the repaint budget', async () => {
        const renderer = await import('../ws-list-renderer');
        renderer.renderLoopWorkspaceList(loopCreditState.perWorkspace, state.workspaceName, '');
        expect(document.querySelector('#loop-ws-list .marco-skeleton')).not.toBeNull();

        const deps = {
            startLoop: vi.fn(), stopLoop: vi.fn(), forceSwitch: vi.fn(),
            fetchLoopCreditsWithDetect: vi.fn(() => { loopCreditState.lastCheckedAt = Date.now() + 1000; }),
            autoDetectLoopCurrentWorkspace: vi.fn(), updateProjectButtonXPath: vi.fn(), updateProgressXPath: vi.fn(),
            updateWorkspaceXPath: vi.fn(), executeJs: vi.fn(), navigateLoopJsHistory: vi.fn(),
            populateLoopWorkspaceDropdown: vi.fn(), updateWsSelectionUI: vi.fn(), renderBulkRenameDialog: vi.fn(),
        } as Parameters<typeof buildButtonRow>[0];
        const { btnRow } = buildButtonRow(deps);
        document.body.appendChild(btnRow);
        const creditBtn = Array.from(btnRow.querySelectorAll('button')).find((button) => button.textContent?.includes('Credits'));

        creditBtn?.click();
        await drainRepaintBudget();

        const progress = document.querySelector('#loop-ws-list [role="progressbar"]') as HTMLElement | null;
        expect(hoisted.fetchSpy).toHaveBeenCalledTimes(1);
        expect(document.querySelector('#loop-ws-list .marco-skeleton')).toBeNull();
        expect(progress).not.toBeNull();
        expect(Number(progress?.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
        expect(document.getElementById('loop-ws-list')?.innerHTML).toContain('⚡25/50');
    });
});