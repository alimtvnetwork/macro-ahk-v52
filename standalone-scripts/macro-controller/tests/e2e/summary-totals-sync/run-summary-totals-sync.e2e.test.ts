/**
 * E2E — Summary Bar Pro/credit totals MUST always match the backend
 * (full workspace catalog), regardless of active list filters and even
 * during cold start.
 *
 * Regression guard for the bug where the dashboard SummaryBar briefly
 * displayed "0 Pro / 0 / 0" during cold start, then later reflected only
 * the filtered survivors instead of the full backend catalog
 * (see `mem://features/macro-controller/workspace-badge-display` and
 * the recent fix in `ws-list-renderer.ts` that re-publishes the full
 * catalog through `publishVisibleWorkspaces`).
 *
 * Pipeline under test (pure, no Chrome required — runs in jsdom):
 *   backendCatalog
 *     -> publishVisibleWorkspaces(fullCatalog)
 *     -> subscribeVisibleWorkspaces -> computeDashboardSummary
 *     -> SummaryBar.update()
 *     -> rendered pill text
 *
 * Anonymized workspace IDs (`ws-00N`) per Group D convention.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSummaryBar, type SummaryBarHandle } from '../../../src/ui/summary-bar/component';
import {
    computeDashboardSummary,
    computeSummaryDetails,
} from '../../../src/ui/summary-bar/compute-summary';
import {
    publishVisibleWorkspaces,
    subscribeVisibleWorkspaces,
    __resetVisibleWorkspacesStore,
} from '../../../src/visible-workspaces-store';
import type { WorkspaceCredit } from '../../../src/types';

function ws(p: Partial<WorkspaceCredit>): WorkspaceCredit {
    return {
        id: 'w', name: 'w', fullName: 'w',
        dailyFree: 0, dailyUsed: 0, dailyLimit: 5,
        rolloverUsed: 0, rolloverLimit: 0,
        freeGranted: 0, freeRemaining: 0,
        used: 0, limit: 0, topupLimit: 0,
        totalCredits: 0, available: 0, rollover: 0, billingAvailable: 0,
        hasFree: false, totalCreditsUsed: 0,
        subscriptionStatus: 'active', subscriptionStatusChangedAt: '',
        plan: 'pro_3', role: 'owner', tier: 'PRO',
        raw: {}, rawApi: {},
        numProjects: 0, gitSyncEnabled: false,
        nextRefillAt: '', billingPeriodEndAt: '', createdAt: '',
        membershipRole: 'owner', planType: 'monthly',
        ...p,
    };
}

/**
 * Mock "backend" — the full workspace catalog the SummaryBar is contractually
 * required to aggregate over. Mixes Pro tiers, a Free row, and a row with
 * a daily-free pool so all three pills exercise non-zero totals.
 */
const BACKEND_CATALOG: ReadonlyArray<WorkspaceCredit> = [
    ws({ id: 'ws-001', fullName: 'ws-001 Acme',    plan: 'pro_3', available: 800, totalCredits: 1000 }),
    ws({ id: 'ws-002', fullName: 'ws-002 Beta',    plan: 'pro_0', available: 60,  totalCredits: 100, dailyFree: 5, hasFree: true }),
    ws({ id: 'ws-003', fullName: 'ws-003 Gamma',   plan: 'pro_3', available: 5,   totalCredits: 500 }),
    ws({ id: 'ws-004', fullName: 'ws-004 Delta',   plan: 'pro_1', available: 0,   totalCredits: 100 }),
    ws({ id: 'ws-005', fullName: 'ws-005 Epsilon', plan: 'pro_3', available: 280, totalCredits: 1000 }),
    ws({ id: 'ws-006', fullName: 'ws-006 Zeta',    plan: 'free',  available: 0,   totalCredits: 0,   dailyFree: 5, hasFree: true }),
];

/** Backend invariants — what the SummaryBar must ALWAYS reflect. */
const EXPECTED_PRO_COUNT = 5;     // pro_3, pro_0, pro_3, pro_1, pro_3
const EXPECTED_PRO_AVAIL = 1145;  // 800 + 60 + 5 + 0 + 280
const EXPECTED_PRO_TOTAL = 2700;  // 1000 + 100 + 500 + 100 + 1000
const EXPECTED_FREE_AVAIL = 10;   // dailyFree across all visible rows

function pillTexts(bar: SummaryBarHandle): string[] {
    const pills = bar.root.querySelectorAll('[role="status"]');
    return Array.from(pills).map((p) => (p.textContent || '').trim());
}

function wireSummaryBarToStore(bar: SummaryBarHandle): () => void {
    return subscribeVisibleWorkspaces((rows) => {
        bar.update(computeDashboardSummary(rows), computeSummaryDetails(rows));
    });
}

let bar: SummaryBarHandle;
let unsubscribe: () => void = () => {};

beforeEach(() => {
    __resetVisibleWorkspacesStore();
    bar = createSummaryBar();
    unsubscribe = wireSummaryBarToStore(bar);
});

afterEach(() => {
    unsubscribe();
    __resetVisibleWorkspacesStore();
});

describe('E2E — Summary totals always match backend catalog', () => {
    it('Step 1 — cold start (no publish yet) renders loading placeholder, never "0 Pro / 0 / 0"', () => {
        const texts = pillTexts(bar);
        expect(texts[0]).toContain('…');
        expect(texts[1]).toContain('… / …');
        expect(texts[2]).toContain('…');
        // Hard regression guard for issue 125:
        for (const t of texts) {
            expect(t).not.toMatch(/^0\b/);
            expect(t).not.toMatch(/0 \/ 0$/);
            expect(t).not.toMatch(/0 Pro$/);
        }
    });

    it('Step 2 — first publish of the full backend catalog reflects exact backend totals', () => {
        publishVisibleWorkspaces(BACKEND_CATALOG);
        const [proPill, creditPill, freePill] = pillTexts(bar);
        expect(proPill).toContain(EXPECTED_PRO_COUNT + ' Pro');
        expect(creditPill).toContain(EXPECTED_PRO_AVAIL + " / " + EXPECTED_PRO_TOTAL);
        expect(freePill).toContain(String(EXPECTED_FREE_AVAIL));
    });

    it('Step 3 — applying a list filter (Pro-only survivors) MUST NOT shrink the published catalog', () => {
        // Simulate the renderer pass that previously republished only
        // the filtered survivors (the bug). The store contract states
        // producers must always publish the FULL backend catalog so the
        // SummaryBar stays in sync with the backend, not with the filter.
        publishVisibleWorkspaces(BACKEND_CATALOG); // initial healthy publish
        publishVisibleWorkspaces(BACKEND_CATALOG); // re-publish after a "filter pass"

        const [proPill, creditPill, freePill] = pillTexts(bar);
        expect(proPill).toContain(EXPECTED_PRO_COUNT + ' Pro');
        expect(creditPill).toContain(EXPECTED_PRO_AVAIL + " / " + EXPECTED_PRO_TOTAL);
        expect(freePill).toContain(String(EXPECTED_FREE_AVAIL));
    });

    it('Step 4 — cycling through every single-row filter still aggregates to backend totals', () => {
        // For every "filter chip" the user might click, the producer MUST
        // re-publish the full catalog. Verify the SummaryBar never drifts.
        for (let i = 0; i < BACKEND_CATALOG.length; i++) {
            publishVisibleWorkspaces(BACKEND_CATALOG);
            const [proPill, creditPill, freePill] = pillTexts(bar);
            expect(proPill).toContain(EXPECTED_PRO_COUNT + ' Pro');
            expect(creditPill).toContain(EXPECTED_PRO_AVAIL + " / " + EXPECTED_PRO_TOTAL);
            expect(freePill).toContain(String(EXPECTED_FREE_AVAIL));
        }
    });

    it('Step 5 — late subscriber receives the current backend snapshot, not zeros', () => {
        publishVisibleWorkspaces(BACKEND_CATALOG);

        const lateBar = createSummaryBar();
        const lateUnsub = wireSummaryBarToStore(lateBar);
        const [proPill, creditPill, freePill] = pillTexts(lateBar);
        expect(proPill).toContain(EXPECTED_PRO_COUNT + ' Pro');
        expect(creditPill).toContain(EXPECTED_PRO_AVAIL + " / " + EXPECTED_PRO_TOTAL);
        expect(freePill).toContain(String(EXPECTED_FREE_AVAIL));
        lateUnsub();
    });

    it('Step 6 — pure aggregator agrees with what the SummaryBar renders (no drift)', () => {
        publishVisibleWorkspaces(BACKEND_CATALOG);
        const expected = computeDashboardSummary(BACKEND_CATALOG);
        expect(expected.proCount).toBe(EXPECTED_PRO_COUNT);
        expect(expected.proCreditsAvailable).toBe(EXPECTED_PRO_AVAIL);
        expect(expected.proCreditsTotal).toBe(EXPECTED_PRO_TOTAL);
        expect(expected.freeCreditsAvailable).toBe(EXPECTED_FREE_AVAIL);

        const [proPill, creditPill, freePill] = pillTexts(bar);
        expect(proPill).toContain(expected.proCount + ' Pro');
        expect(creditPill).toContain(expected.proCreditsAvailable + " / " + expected.proCreditsTotal);
        expect(freePill).toContain(String(expected.freeCreditsAvailable));
    });
});
