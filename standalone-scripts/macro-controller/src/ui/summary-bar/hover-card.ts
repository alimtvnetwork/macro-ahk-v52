/**
 * Summary-bar hover tooltip (Issue 130).
 *
 * Singleton hover card anchored beneath whichever summary pill the user
 * is hovering. Renders three flavours of breakdown — Pro, Pro credits,
 * Free credits — driven by `SummaryDetails`. The tooltip is purely
 * presentational; data comes from `computeSummaryDetails()` in the same
 * pass as `computeDashboardSummary()` so the headline numbers and the
 * tooltip are always consistent.
 *
 * Standards:
 *   - `mem://preferences/dark-only-theme` — dark surfaces only.
 *   - `mem://features/macro-controller/workspace-tooltip-members-popup`
 *     — singleton pattern reused so only one hover card exists at a time.
 *   - `mem://standards/formatting-and-logic` — defensive guards on every
 *     numeric input.
 */

import {
    cPanelBg,
    cPanelFg,
    cPanelFgDim,
    cPrimaryLight,
    tFont,
    tFontMicro,
} from '../../shared-state';
import type { SummaryDetails } from './types';

export type SummaryPillKind = 'pro' | 'proCredits' | 'freeCredits';

const CARD_ID = 'marco-summary-hover-card';

/** Map raw display-kind keys → human labels for the tooltip. */
const KIND_LABELS: Readonly<Record<string, string>> = {
    'canceled': 'Canceled',
    'expire-soon': 'Expire soon',
    'expired': 'Expired',
    'expired-hard': 'Expired (hard)',
    'past-due-expiring': 'Past due',
};

function labelForKind(kind: string): string {
    return KIND_LABELS[kind] ?? kind;
}

function fmt(n: number): string {
    if (!Number.isFinite(n)) {
        return '0';
    }
    return Math.round(n).toLocaleString('en-US');
}

function row(label: string, value: string, valueColor?: string): string {
    const color = valueColor ?? cPanelFg;
    return ''
        + '<div style="display:flex;justify-content:space-between;gap:14px;padding:1px 0;">'
        + '<span style="color:' + cPanelFgDim + ';">' + label + '</span>'
        + '<span style="color:' + color + ';font-weight:600;">' + value + '</span>'
        + '</div>';
}

function sectionTitle(text: string): string {
    return ''
        + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;'
        + 'letter-spacing:0.5px;color:' + cPrimaryLight + ';'
        + 'padding:6px 0 3px 0;border-top:1px solid rgba(148,163,184,0.20);margin-top:4px;">'
        + text + '</div>';
}

function emptyHint(text: string): string {
    return '<div style="color:' + cPanelFgDim + ';font-style:italic;padding:2px 0;">' + text + '</div>';
}

function renderProCard(d: SummaryDetails): string {
    const parts: string[] = [];
    parts.push(row('Total Pro workspaces', fmt(d.pro.count)));
    parts.push(row('Expiring / canceled', fmt(d.pro.expiringCount), '#fbbf24'));

    const kinds = Object.keys(d.pro.expiringByKind);
    if (kinds.length > 0) {
        parts.push(sectionTitle('Expiring breakdown'));
        for (const k of kinds) {
            parts.push(row(labelForKind(k), fmt(d.pro.expiringByKind[k] ?? 0)));
        }
    }

    const plans = Object.keys(d.pro.byPlan).sort();
    if (plans.length > 0) {
        parts.push(sectionTitle('By plan'));
        for (const p of plans) {
            parts.push(row(p, fmt(d.pro.byPlan[p] ?? 0)));
        }
    }
    return parts.join('');
}

function renderProCreditsCard(d: SummaryDetails): string {
    const parts: string[] = [];
    parts.push(row('Pro available',  fmt(d.pro.creditsAvailable),  '#86efac'));
    parts.push(row('Pro total',      fmt(d.pro.creditsTotal),      '#a78bfa'));
    parts.push(row('Pro used',
        fmt(Math.max(0, d.pro.creditsTotal - d.pro.creditsAvailable)),
        '#fb923c'));
    parts.push(sectionTitle('At risk'));
    parts.push(row('Expiring credits',
        fmt(d.pro.creditsExpiringAvailable),
        d.pro.creditsExpiringAvailable > 0 ? '#fbbf24' : cPanelFgDim));
    if (d.pro.expiringCount === 0) {
        parts.push(emptyHint('No expiring pro workspaces.'));
    }
    return parts.join('');
}

function renderFreeCard(d: SummaryDetails): string {
    const parts: string[] = [];
    parts.push(row('Free credits available', fmt(d.free.dailyAvailable), '#86efac'));
    parts.push(row('Workspaces with free',   fmt(d.free.workspacesWithFree)));
    parts.push(sectionTitle('Combined'));
    parts.push(row('Pro + Free spendable',   fmt(d.grand.availableSpendable), '#86efac'));
    return parts.join('');
}

function renderBody(kind: SummaryPillKind, d: SummaryDetails): string {
    if (kind === 'pro')         { return renderProCard(d); }
    if (kind === 'proCredits')  { return renderProCreditsCard(d); }
    return renderFreeCard(d);
}

function titleFor(kind: SummaryPillKind): string {
    if (kind === 'pro')        { return '🪪 Pro workspaces'; }
    if (kind === 'proCredits') { return '💳 Pro credits'; }
    return '⚡ Free credits';
}

/** Remove the hover card from the DOM if present. */
export function removeSummaryHoverCard(): void {
    const old = document.getElementById(CARD_ID);
    if (old) {
        old.remove();
    }
}

/**
 * Show (or replace) the hover card under `anchorEl` for the given pill.
 * Returns the rendered root for testing.
 */
export function showSummaryHoverCard(
    anchorEl: HTMLElement,
    kind: SummaryPillKind,
    details: SummaryDetails,
): HTMLElement {
    removeSummaryHoverCard();
    const rect = anchorEl.getBoundingClientRect();
    const card = document.createElement('div');
    card.id = CARD_ID;
    card.setAttribute('data-summary-pill', kind);
    card.style.cssText = [
        'position:fixed',
        'top:' + (rect.bottom + 4) + 'px',
        'left:' + Math.max(8, rect.left) + 'px',
        'z-index:100002',
        'min-width:220px',
        'max-width:280px',
        'background:' + cPanelBg,
        'color:' + cPanelFg,
        'border:1px solid ' + cPrimaryLight,
        'border-radius:6px',
        'box-shadow:0 6px 16px rgba(0,0,0,0.55)',
        'padding:8px 10px',
        'font-family:' + tFont,
        'font-size:' + tFontMicro,
        'pointer-events:none',
    ].join(';') + ';';
    card.innerHTML = ''
        + '<div style="font-weight:700;color:' + cPrimaryLight + ';padding-bottom:4px;">'
        + titleFor(kind) + '</div>'
        + renderBody(kind, details);
    document.body.appendChild(card);
    return card;
}
