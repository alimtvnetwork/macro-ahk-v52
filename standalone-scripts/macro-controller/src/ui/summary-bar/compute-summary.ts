/**
 * computeDashboardSummary — pure aggregator over the currently visible
 * workspace list (Issue 125 §2.2 / §4).
 *
 * Contract (single pass, O(n)):
 *   - proCount: rows whose `plan` starts with `pro_`
 *     (case-insensitive, whitespace-trimmed).
 *   - proExpiringCount: subset of proCount whose computed display badge is
 *     in `PRO_EXPIRING_KINDS` (canceled / expired / expired-hard /
 *     expire-soon / past-due-expiring). Per `mem://features/macro-controller/workspace-badge-display`.
 *   - proCreditsAvailable / proCreditsTotal: sum of `available` /
 *     `totalCredits` across pro rows. FREE tier is excluded by definition
 *     (a pro_* plan is never FREE), per
 *     `mem://features/macro-controller/credit-totals-exclude-free`.
 *   - freeCreditsAvailable: sum of `dailyFree` across ALL visible rows
 *     (FREE-only signal, but pro rows can also report a daily free pool).
 *
 * The display-kind classifier is injected via `getDisplayKind` so this file
 * stays free of the lifecycle / date machinery used by `workspace-display-status.ts`.
 * Production callers should pass a thin wrapper around `computeDisplayStatus`.
 */

import type { WorkspaceCredit } from '../../types/credit-types';
import type { WorkspaceDisplayKind } from '../../workspace-display-status';
import { PRO_EXPIRING_KINDS, type DashboardSummary, type SummaryDetails } from './types';

export type DisplayKindResolver = (ws: WorkspaceCredit) => WorkspaceDisplayKind;

function num0(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function isProPlan(plan: string | undefined): boolean {
    if (typeof plan !== 'string') {
        return false;
    }
    return plan.trim().toLowerCase().startsWith('pro_');
}

const EMPTY: DashboardSummary = {
    proCount: 0,
    proExpiringCount: 0,
    proCreditsAvailable: 0,
    proCreditsTotal: 0,
    freeCreditsAvailable: 0,
};

export function computeDashboardSummary(
    rows: ReadonlyArray<WorkspaceCredit>,
    getDisplayKind: DisplayKindResolver = () => 'normal',
): DashboardSummary {
    if (!Array.isArray(rows) || rows.length === 0) {
        return EMPTY;
    }
    let proCount = 0;
    let proExpiringCount = 0;
    let proCreditsAvailable = 0;
    let proCreditsTotal = 0;
    let freeCreditsAvailable = 0;

    for (const ws of rows) {
        freeCreditsAvailable += num0(ws.dailyFree);

        if (!isProPlan(ws.plan)) {
            continue;
        }
        proCount += 1;
        proCreditsAvailable += num0(ws.available);
        proCreditsTotal += num0(ws.totalCredits);

        const kind = getDisplayKind(ws);
        if (PRO_EXPIRING_KINDS.has(kind)) {
            proExpiringCount += 1;
        }
    }

    return {
        proCount,
        proExpiringCount,
        proCreditsAvailable: Math.round(proCreditsAvailable),
        proCreditsTotal: Math.round(proCreditsTotal),
        freeCreditsAvailable: Math.round(freeCreditsAvailable),
    };
}

const EMPTY_DETAILS: SummaryDetails = {
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

/**
 * Rich per-pill breakdown for the hover tooltips. Computed in the same
 * shape/style as `computeDashboardSummary` so callers can compute both
 * in a single pass over the visible workspaces.
 */
export function computeSummaryDetails(
    rows: ReadonlyArray<WorkspaceCredit>,
    getDisplayKind: DisplayKindResolver = () => 'normal',
): SummaryDetails {
    if (!Array.isArray(rows) || rows.length === 0) {
        return EMPTY_DETAILS;
    }
    let proCount = 0;
    let proExpiringCount = 0;
    let proCreditsAvailable = 0;
    let proCreditsTotal = 0;
    let proExpiringAvailable = 0;
    let freeDaily = 0;
    let freeWorkspaces = 0;
    const expiringByKind: Record<string, number> = {};
    const byPlan: Record<string, number> = {};

    for (const ws of rows) {
        const daily = num0(ws.dailyFree);
        freeDaily += daily;
        if (daily > 0) {
            freeWorkspaces += 1;
        }
        if (!isProPlan(ws.plan)) {
            continue;
        }
        proCount += 1;
        const avail = num0(ws.available);
        proCreditsAvailable += avail;
        proCreditsTotal += num0(ws.totalCredits);
        const planKey = String(ws.plan).trim().toLowerCase();
        byPlan[planKey] = (byPlan[planKey] ?? 0) + 1;
        const kind = getDisplayKind(ws);
        if (PRO_EXPIRING_KINDS.has(kind)) {
            proExpiringCount += 1;
            proExpiringAvailable += avail;
            expiringByKind[kind] = (expiringByKind[kind] ?? 0) + 1;
        }
    }

    const proAvail = Math.round(proCreditsAvailable);
    const freeAvail = Math.round(freeDaily);
    return {
        pro: {
            count: proCount,
            expiringCount: proExpiringCount,
            expiringByKind,
            byPlan,
            creditsAvailable: proAvail,
            creditsTotal: Math.round(proCreditsTotal),
            creditsExpiringAvailable: Math.round(proExpiringAvailable),
        },
        free: { dailyAvailable: freeAvail, workspacesWithFree: freeWorkspaces },
        grand: { availableSpendable: proAvail + freeAvail },
    };
}
