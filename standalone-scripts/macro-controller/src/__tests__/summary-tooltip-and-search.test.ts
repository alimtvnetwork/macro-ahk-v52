/**
 * Issue 130 — summary-bar hover tooltips + credit-totals search filter.
 *
 * Verifies:
 *   - computeSummaryDetails breakdown (pro/free/grand) matches the
 *     headline DashboardSummary on the same input.
 *   - hover-card singleton: only one card exists at a time, removed on
 *     teardown, content varies by pill kind.
 *   - applyFilters honours the new `query` substring search (name, plan,
 *     id, fullName), case-insensitive, AND-ed with chip filters.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { computeSummaryDetails } from '../ui/summary-bar/compute-summary';
import {
    removeSummaryHoverCard,
    showSummaryHoverCard,
} from '../ui/summary-bar/hover-card';
import { applyFilters, type FilterState } from '../ui/credit-totals-modal';

import type { WorkspaceCredit } from '../types/credit-types';
import type { WorkspaceDisplayKind } from '../workspace-display-status';

function ws(over: Partial<WorkspaceCredit>): WorkspaceCredit {
    return {
        id: 'ws-' + Math.random().toString(36).slice(2, 7),
        name: 'Anon', fullName: 'Anon Workspace',
        plan: 'pro_0', planId: 'pro_0',
        available: 100, totalCredits: 200, totalCreditsUsed: 100,
        numProjects: 1, dailyFree: 0,
        hasFree: false,
        ...over,
    } as WorkspaceCredit;
}

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('computeSummaryDetails', () => {
    it('returns EMPTY shape for empty input', () => {
        const d = computeSummaryDetails([]);
        expect(d.pro.count).toBe(0);
        expect(d.free.dailyAvailable).toBe(0);
        expect(d.grand.availableSpendable).toBe(0);
    });

    it('aggregates pro counts, byPlan, and grand spendable', () => {
        const rows = [
            ws({ plan: 'pro_0', available: 100, totalCredits: 300, dailyFree: 5 }),
            ws({ plan: 'pro_1', available: 50,  totalCredits: 200, dailyFree: 0 }),
            ws({ plan: 'free',  available: 0,   totalCredits: 0,   dailyFree: 30 }),
        ];
        const d = computeSummaryDetails(rows);
        expect(d.pro.count).toBe(2);
        expect(d.pro.byPlan).toEqual({ pro_0: 1, pro_1: 1 });
        expect(d.pro.creditsAvailable).toBe(150);
        expect(d.pro.creditsTotal).toBe(500);
        expect(d.free.dailyAvailable).toBe(35);
        expect(d.free.workspacesWithFree).toBe(2);
        expect(d.grand.availableSpendable).toBe(185);
    });

    it('tallies expiringByKind + creditsExpiringAvailable using resolver', () => {
        const rows = [
            ws({ id: 'a', plan: 'pro_0', available: 100 }),
            ws({ id: 'b', plan: 'pro_0', available: 40 }),
            ws({ id: 'c', plan: 'pro_1', available: 60 }),
        ];
        const resolver = (w: WorkspaceCredit): WorkspaceDisplayKind => {
            if (w.id === 'b') return 'canceled';
            if (w.id === 'c') return 'expire-soon';
            return 'normal';
        };
        const d = computeSummaryDetails(rows, resolver);
        expect(d.pro.expiringCount).toBe(2);
        expect(d.pro.expiringByKind).toEqual({ canceled: 1, 'expire-soon': 1 });
        expect(d.pro.creditsExpiringAvailable).toBe(100);
    });
});

describe('summary hover card', () => {
    const details = computeSummaryDetails([
        ws({ plan: 'pro_0', available: 100, totalCredits: 200, dailyFree: 0 }),
        ws({ plan: 'free',  available: 0,   totalCredits: 0,   dailyFree: 20 }),
    ]);

    it('renders a singleton card anchored under the pill', () => {
        const anchor = document.createElement('div');
        document.body.appendChild(anchor);
        const c1 = showSummaryHoverCard(anchor, 'pro', details);
        const c2 = showSummaryHoverCard(anchor, 'proCredits', details);
        expect(document.querySelectorAll('#marco-summary-hover-card').length).toBe(1);
        expect(c2.getAttribute('data-summary-pill')).toBe('proCredits');
        expect(c1.isConnected).toBe(false); // first card was replaced
    });

    it('removeSummaryHoverCard tears it down', () => {
        const anchor = document.createElement('div');
        document.body.appendChild(anchor);
        showSummaryHoverCard(anchor, 'freeCredits', details);
        removeSummaryHoverCard();
        expect(document.getElementById('marco-summary-hover-card')).toBeNull();
    });

    it('content reflects requested pill kind', () => {
        const anchor = document.createElement('div');
        document.body.appendChild(anchor);
        const pro = showSummaryHoverCard(anchor, 'pro', details);
        expect(pro.textContent).toContain('Pro workspaces');
        removeSummaryHoverCard();
        const free = showSummaryHoverCard(anchor, 'freeCredits', details);
        expect(free.textContent).toContain('Free credits');
        expect(free.textContent).toContain('Pro + Free spendable');
    });
});

describe('credit-totals applyFilters: search query', () => {
    const rows: WorkspaceCredit[] = [
        ws({ id: 'w1', name: 'Acme HQ',    fullName: 'Acme Corp HQ',    plan: 'pro_0', available: 200 }),
        ws({ id: 'w2', name: 'Beta Team',  fullName: 'Beta Team Inc',   plan: 'pro_1', available: 50 }),
        ws({ id: 'w3', name: 'Side',       fullName: 'Side Hustle',     plan: 'free',  available: 0, hasFree: true }),
    ];
    const base: FilterState = { low: false, empty: false, free: false, query: '' };

    it('empty query → returns all rows', () => {
        expect(applyFilters(rows, base).length).toBe(3);
    });

    it('matches by name (case-insensitive)', () => {
        const out = applyFilters(rows, { ...base, query: 'beta' });
        expect(out.map(r => r.id)).toEqual(['w2']);
    });

    it('matches by plan code', () => {
        const out = applyFilters(rows, { ...base, query: 'pro_1' });
        expect(out.map(r => r.id)).toEqual(['w2']);
    });

    it('matches by id', () => {
        const out = applyFilters(rows, { ...base, query: 'w3' });
        expect(out.map(r => r.id)).toEqual(['w3']);
    });

    it('AND-combines with chip filters', () => {
        const out = applyFilters(rows, { ...base, free: true, query: 'side' });
        expect(out.map(r => r.id)).toEqual(['w3']);
        // query matches w3, but `low` chip excludes it (rem == 0, not in 0<rem<100)
        const noMatch = applyFilters(rows, { ...base, low: true, query: 'side' });
        expect(noMatch.length).toBe(0);
    });

    it('whitespace-only query is treated as empty', () => {
        expect(applyFilters(rows, { ...base, query: '   ' }).length).toBe(3);
    });
});
