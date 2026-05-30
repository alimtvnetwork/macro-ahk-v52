/**
 * Dashboard summary bar — public types (Issue 125 §2.2 / §4).
 */

import type { WorkspaceDisplayKind } from '../../workspace-display-status';

/**
 * The three values rendered by the summary strip below the title row.
 * `proExpiringCount` includes `canceled`, `expire-soon`, `expired`, and
 * `expired-hard` (the spec's "expire / expire-soon / canceled" set,
 * widened to the actual display-kind enum).
 */
export interface DashboardSummary {
    readonly proCount: number;
    readonly proExpiringCount: number;
    readonly proCreditsAvailable: number;
    readonly proCreditsTotal: number;
    readonly freeCreditsAvailable: number;
}

/** Display kinds that count toward `proExpiringCount`. */
export const PRO_EXPIRING_KINDS: ReadonlySet<WorkspaceDisplayKind> = new Set<WorkspaceDisplayKind>([
    'canceled',
    'expired',
    'expired-hard',
    'expire-soon',
    'past-due-expiring',
]);

/**
 * Rich per-pill breakdown surfaced in the hover tooltips (Issue 130).
 * Computed alongside `DashboardSummary` from the same visible-workspaces
 * pass so the hover card never lags behind the headline numbers.
 *
 * - `pro.expiringByKind` keys are stringified `WorkspaceDisplayKind`s.
 *   Only kinds present in the visible set appear, so the tooltip lists
 *   real categories (e.g. "Canceled: 3, Expire soon: 1") without empties.
 * - `pro.byPlan` is a count of workspaces per plan code (`pro_0`,
 *   `pro_1`, ...). Ordered by callers if needed; the raw map is the
 *   contract.
 * - `pro.creditsExpiringAvailable` is the sum of `available` over the
 *   pro workspaces that fall into `PRO_EXPIRING_KINDS` — the "credits
 *   you are about to lose" number the user explicitly asked for.
 * - `grand.available` is `pro + free` so the hover can show a single
 *   "total spendable" line.
 */
export interface SummaryDetails {
    readonly pro: {
        readonly count: number;
        readonly expiringCount: number;
        readonly expiringByKind: Readonly<Record<string, number>>;
        readonly byPlan: Readonly<Record<string, number>>;
        readonly creditsAvailable: number;
        readonly creditsTotal: number;
        readonly creditsExpiringAvailable: number;
    };
    readonly free: {
        readonly dailyAvailable: number;
        readonly workspacesWithFree: number;
    };
    readonly grand: {
        readonly availableSpendable: number;
    };
}
