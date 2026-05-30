/**
 * Visible-workspaces store — pub/sub tests (Issue 125 Task 9).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    publishVisibleWorkspaces,
    subscribeVisibleWorkspaces,
    getLastVisibleWorkspaces,
    __resetVisibleWorkspacesStore,
} from '../visible-workspaces-store';
import { computeDashboardSummary } from '../ui/summary-bar/compute-summary';
import type { WorkspaceCredit } from '../types/credit-types';

function ws(id: string, plan: string, available = 0, total = 0): WorkspaceCredit {
    return { id, plan, available, totalCredits: total } as WorkspaceCredit;
}

describe('visible-workspaces-store', () => {
    beforeEach(() => { __resetVisibleWorkspacesStore(); });

    it('publish updates the snapshot and notifies subscribers', () => {
        const received: number[] = [];
        subscribeVisibleWorkspaces(rows => received.push(rows.length));
        publishVisibleWorkspaces([ws('a', 'pro_1'), ws('b', 'pro_2')]);
        expect(received).toEqual([2]);
        expect(getLastVisibleWorkspaces().length).toBe(2);
    });

    it('late subscriber immediately receives the last snapshot', () => {
        publishVisibleWorkspaces([ws('a', 'pro_1')]);
        const received: number[] = [];
        subscribeVisibleWorkspaces(rows => received.push(rows.length));
        expect(received).toEqual([1]);
    });

    it('unsubscribe stops further callbacks', () => {
        const received: number[] = [];
        const off = subscribeVisibleWorkspaces(rows => received.push(rows.length));
        publishVisibleWorkspaces([ws('a', 'pro_1')]);
        off();
        publishVisibleWorkspaces([ws('a', 'pro_1'), ws('b', 'pro_2')]);
        expect(received).toEqual([1]);
    });

    it('throwing subscriber does not break publish for others', () => {
        const received: number[] = [];
        subscribeVisibleWorkspaces(() => { throw new Error('boom'); });
        subscribeVisibleWorkspaces(rows => received.push(rows.length));
        publishVisibleWorkspaces([ws('a', 'pro_1')]);
        expect(received).toEqual([1]);
    });

    it('filter-reactive recompute: SummaryBar consumer sees fresh totals on each publish', () => {
        const all = [
            ws('a', 'pro_1', 100, 200),
            ws('b', 'pro_2', 300, 600),
            ws('c', 'free', 0, 0),
        ];
        let summary = computeDashboardSummary([]);
        subscribeVisibleWorkspaces(rows => { summary = computeDashboardSummary(rows); });

        publishVisibleWorkspaces(all);
        expect(summary.proCount).toBe(2);
        expect(summary.proCreditsAvailable).toBe(400);
        expect(summary.proCreditsTotal).toBe(800);

        // Simulate a filter change that narrows the visible list.
        publishVisibleWorkspaces([all[0]]);
        expect(summary.proCount).toBe(1);
        expect(summary.proCreditsAvailable).toBe(100);
        expect(summary.proCreditsTotal).toBe(200);

        // Filter to FREE only.
        publishVisibleWorkspaces([all[2]]);
        expect(summary.proCount).toBe(0);
        expect(summary.proCreditsAvailable).toBe(0);
        expect(summary.proCreditsTotal).toBe(0);
    });
});
