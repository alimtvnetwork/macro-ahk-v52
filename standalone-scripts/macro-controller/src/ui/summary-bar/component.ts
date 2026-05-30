/**
 * Dashboard Summary Bar — DOM component shell (Issue 125 §2.2).
 *
 * Renders three compact pills (Pro count, Pro credits, Free credits) in a
 * horizontal flex row directly below the title row. Pure presentation —
 * data is pushed in via `update(summary)`; live wiring to the
 * `visibleWorkspaces$` selector is performed by Task 9 (filter-reactive
 * recomputation).
 *
 * Dark-theme tokens only: `cSectionBg`, `cPanelBorder`, `cPanelFg`,
 * `cPrimaryLight`. No raw hex outside shared-state.
 */

import {
    cPanelBg,
    cPanelBorder,
    cPanelFg,
    cPrimaryLight,
    cSectionBg,
    tFont,
    tFontMicro,
} from '../../shared-state';
import type { DashboardSummary, SummaryDetails } from './types';
import {
    removeSummaryHoverCard,
    showSummaryHoverCard,
    type SummaryPillKind,
} from './hover-card';

export interface SummaryBarHandle {
    readonly root: HTMLElement;
    update(summary: DashboardSummary, details?: SummaryDetails): void;
}

const ZERO_SUMMARY: DashboardSummary = {
    proCount: 0,
    proExpiringCount: 0,
    proCreditsAvailable: 0,
    proCreditsTotal: 0,
    freeCreditsAvailable: 0,
};

const ZERO_DETAILS: SummaryDetails = {
    pro: {
        count: 0,
        expiringCount: 0,
        expiringByKind: {},
        byPlan: {},
        creditsAvailable: 0,
        creditsTotal: 0,
        creditsExpiringAvailable: 0,
    },
    free: { dailyAvailable: 0, workspacesWithFree: 0 },
    grand: { availableSpendable: 0 },
};

function pill(icon: string, ariaLabel: string): { el: HTMLElement; text: HTMLElement } {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-label', ariaLabel);
    el.style.cssText = ''
        + 'flex:1 1 0;min-width:0;'
        + 'display:flex;align-items:center;gap:4px;'
        + 'padding:3px 8px;border-radius:6px;'
        + 'background:' + cSectionBg + ';'
        + 'border:1px solid ' + cPanelBorder + ';'
        + 'color:' + cPanelFg + ';'
        + 'font-family:' + tFont + ';font-size:' + tFontMicro + ';'
        + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    const ico = document.createElement('span');
    ico.textContent = icon;
    ico.style.cssText = 'flex:0 0 auto;color:' + cPrimaryLight + ';';
    const text = document.createElement('span');
    text.style.cssText = 'flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;';
    el.appendChild(ico);
    el.appendChild(text);
    return { el, text };
}

function fmtPro(s: DashboardSummary): string {
    const base = s.proCount + ' Pro';
    return s.proExpiringCount > 0 ? base + ' (' + s.proExpiringCount + ' exp)' : base;
}

function fmtProCredits(s: DashboardSummary): string {
    return s.proCreditsAvailable + ' / ' + s.proCreditsTotal;
}

function fmtFreeCredits(s: DashboardSummary): string {
    return String(s.freeCreditsAvailable);
}

/**
 * Build the summary bar DOM. Initial render uses zeros; callers must invoke
 * `update()` after subscribing to the visible-workspaces selector.
 */
export function createSummaryBar(): SummaryBarHandle {
    const root = document.createElement('div');
    root.setAttribute('data-marco-summary-bar', '');
    root.style.cssText = ''
        + 'display:flex;align-items:stretch;gap:6px;'
        + 'padding:4px 6px;margin:4px 0;border-radius:4px;'
        + 'background:' + cPanelBg + ';';

    const pro = pill('🪪', 'Pro workspace count');
    const proCredits = pill('💳', 'Pro credits available over total');
    const freeCredits = pill('⚡', 'Free credits available');

    root.appendChild(pro.el);
    root.appendChild(proCredits.el);
    root.appendChild(freeCredits.el);

    function update(summary: DashboardSummary): void {
        const s = summary ?? ZERO_SUMMARY;
        pro.text.textContent = fmtPro(s);
        proCredits.text.textContent = fmtProCredits(s);
        freeCredits.text.textContent = fmtFreeCredits(s);
    }

    update(ZERO_SUMMARY);

    return { root, update };
}
