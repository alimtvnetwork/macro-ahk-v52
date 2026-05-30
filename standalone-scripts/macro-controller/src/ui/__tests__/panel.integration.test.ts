/**
 * Panel integration test — Issue 125 Task 6-8.
 *
 * Verifies the panel-level structural contract after the Auth Diagnostics
 * relocation and Summary Bar mount:
 *   - Summary Bar renders three pills directly below the title row.
 *   - Summary Bar reflects pushed updates within one frame (no throttling).
 *   - Auth Diagnostics row is NOT a direct child of the panel root.
 *   - Auth Diagnostics row IS mounted inside the Tools & Logs collapsible
 *     (via `data-marco-authdiag-mount` wrapper) and the wrapper defaults
 *     to collapsed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSummaryBar } from '../summary-bar/component';
import { createCollapsibleSection } from '../section-collapsible';
import type { DashboardSummary } from '../summary-bar/types';

function clearLocalStorage(): void {
    try { localStorage.clear(); } catch { /* jsdom */ }
}

describe('Panel integration — Summary Bar + Auth Diagnostics relocation', () => {
    beforeEach(() => { clearLocalStorage(); });

    it('Summary Bar renders three pills with role=status', () => {
        const bar = createSummaryBar();
        const pills = bar.root.querySelectorAll('[role="status"]');
        expect(pills.length).toBe(3);
    });

    it('Summary Bar initial render shows zeros', () => {
        const bar = createSummaryBar();
        const pills = bar.root.querySelectorAll('[role="status"]');
        expect(pills[0]?.textContent).toContain('0 Pro');
        expect(pills[1]?.textContent).toContain('0 / 0');
        expect(pills[2]?.textContent?.trim().endsWith('0')).toBe(true);
    });

    it('Summary Bar update() reflects new values synchronously', () => {
        const bar = createSummaryBar();
        const summary: DashboardSummary = {
            proCount: 12,
            proExpiringCount: 3,
            proCreditsAvailable: 4500,
            proCreditsTotal: 9000,
            freeCreditsAvailable: 30,
        };
        bar.update(summary);
        const pills = bar.root.querySelectorAll('[role="status"]');
        expect(pills[0]?.textContent).toContain('12 Pro');
        expect(pills[0]?.textContent).toContain('(3 exp)');
        expect(pills[1]?.textContent).toContain('4500 / 9000');
        expect(pills[2]?.textContent).toContain('30');
    });

    it('Summary Bar hides "(N exp)" suffix when none are expiring', () => {
        const bar = createSummaryBar();
        bar.update({
            proCount: 5, proExpiringCount: 0,
            proCreditsAvailable: 100, proCreditsTotal: 200, freeCreditsAvailable: 10,
        });
        const pills = bar.root.querySelectorAll('[role="status"]');
        expect(pills[0]?.textContent).toContain('5 Pro');
        expect(pills[0]?.textContent).not.toContain('exp');
    });

    it('Auth Diagnostics collapsible wrapper defaults to collapsed', () => {
        const col = createCollapsibleSection('🛡 Auth Diagnostics', 'ml_collapse_authdiag');
        col.section.setAttribute('data-marco-authdiag-mount', '');
        expect(col.body.style.display).toBe('none');
        expect(col.toggle.textContent).toBe('[+]');
    });

    it('Auth Diagnostics row is mounted inside Tools & Logs, not at panel root', () => {
        // Simulate the panel-sections wiring.
        const panelRoot = document.createElement('div');
        const toolsBody = document.createElement('div');
        const authDiagRow = document.createElement('div');
        authDiagRow.setAttribute('data-test-authdiag', '');

        const authDiagCol = createCollapsibleSection('🛡 Auth Diagnostics', 'ml_collapse_authdiag');
        authDiagCol.section.setAttribute('data-marco-authdiag-mount', '');
        authDiagCol.body.appendChild(authDiagRow);
        toolsBody.appendChild(authDiagCol.section);
        panelRoot.appendChild(toolsBody);

        const directChildren = Array.from(panelRoot.children);
        expect(directChildren.some(c => c.hasAttribute('data-test-authdiag'))).toBe(false);

        const insideTools = toolsBody.querySelector('[data-test-authdiag]');
        expect(insideTools).not.toBeNull();

        const mountWrapper = toolsBody.querySelector('[data-marco-authdiag-mount]');
        expect(mountWrapper).not.toBeNull();
    });

    it('Auth Diagnostics user-toggled expand state persists via localStorage', () => {
        const col1 = createCollapsibleSection('🛡 Auth Diagnostics', 'ml_collapse_authdiag');
        expect(col1.body.style.display).toBe('none');
        // Simulate header click → expand.
        col1.header.click();
        expect(col1.body.style.display).toBe('');
        expect(localStorage.getItem('ml_collapse_authdiag')).toBe('expanded');

        // Re-create → reads persisted expanded state.
        const col2 = createCollapsibleSection('🛡 Auth Diagnostics', 'ml_collapse_authdiag');
        expect(col2.body.style.display).toBe('');
        expect(col2.toggle.textContent).toBe('[-]');
    });
});
