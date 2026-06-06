import type { WorkspaceCredit } from '../types';
import { calcTotalCredits } from '../credit-api';
import { CreditFetchOutcome } from './credit-fetch-outcome';
import { readCreditBalanceUpdateCacheSync } from './credit-balance-cache';
import { hasInlineCredits } from './credit-fetch-controller';
import { mapPlanFromWire, shouldFetchCreditBalanceForPlan } from './plan-mapper';

export type CreditSummarySource = 'Inline' | 'Cache' | 'Timeout' | 'Missing' | 'Pending';

export interface CreditSummary {
    readonly available: number;
    readonly total: number;
    readonly daily: number;
    readonly dailyLimit: number;
    readonly billingAvailable: number;
    readonly billingLimit: number;
    readonly rollover: number;
    readonly rolloverLimit: number;
    readonly totalUsed: number;
    readonly source: CreditSummarySource;
    readonly renderDash: boolean;
}

function inlineTotal(ws: WorkspaceCredit): number {
    return Math.round(ws.totalCredits ?? calcTotalCredits(
        ws.freeGranted,
        ws.dailyLimit,
        ws.limit,
        ws.topupLimit,
        ws.rolloverLimit,
        ws.plan,
    ));
}

export function resolveCreditSummary(ws: WorkspaceCredit): CreditSummary {
    const cached = ws.id ? readCreditBalanceUpdateCacheSync(ws.id) : null;
    if (cached?.balance) {
        return {
            available: Math.max(0, Math.round(cached.balance.totalRemaining)),
            total: Math.max(0, Math.round(cached.balance.totalGranted)),
            daily: Math.max(0, Math.round(cached.balance.dailyRemaining)),
            dailyLimit: Math.max(0, Math.round(cached.balance.dailyLimit)),
            billingAvailable: Math.max(0, Math.round(cached.balance.totalRemaining - cached.balance.dailyRemaining)),
            billingLimit: Math.max(0, Math.round(cached.balance.totalGranted - cached.balance.dailyLimit)),
            rollover: Math.max(0, Math.round(ws.rollover || 0)),
            rolloverLimit: Math.max(0, Math.round(ws.rolloverLimit || 0)),
            totalUsed: Math.max(0, Math.round(cached.balance.totalBillingPeriodUsed)),
            source: 'Cache',
            renderDash: false,
        };
    }

    if (cached?.outcome === CreditFetchOutcome.Timeout) {
        return {
            available: 0,
            total: 0,
            daily: 0,
            dailyLimit: 0,
            billingAvailable: 0,
            billingLimit: 0,
            rollover: 0,
            rolloverLimit: 0,
            totalUsed: 0,
            source: 'Timeout',
            renderDash: true,
        };
    }

    const total = inlineTotal(ws);
    const available = Math.max(0, Math.round(ws.available || 0));
    // RCA 2026-06-06 #1/#2: when a workspace has neither inline credit data
    // nor a cached `/credit-balance` row yet (new free / Lite / Cancelled
    // accounts before enrichment fans out), emit a `Pending` summary so
    // the renderer shows a skeleton dash instead of pinning the bar to 0/0
    // and confusing the user into thinking they have no credits.
    if (available === 0 && total === 0) {
        const plan = mapPlanFromWire(ws.plan);
        const enrichmentApplies = shouldFetchCreditBalanceForPlan(plan) && !hasInlineCredits(ws);
        if (enrichmentApplies) {
            return {
                available: 0,
                total: 0,
                daily: 0,
                dailyLimit: 0,
                billingAvailable: 0,
                billingLimit: 0,
                rollover: 0,
                rolloverLimit: 0,
                totalUsed: 0,
                source: 'Pending',
                renderDash: true,
            };
        }
    }
    return {
        available,
        total,
        daily: Math.max(0, Math.round(ws.dailyFree || 0)),
        dailyLimit: Math.max(0, Math.round(ws.dailyLimit || 0)),
        billingAvailable: Math.max(0, Math.round(ws.billingAvailable || 0)),
        billingLimit: Math.max(0, Math.round(ws.limit || 0)),
        rollover: Math.max(0, Math.round(ws.rollover || 0)),
        rolloverLimit: Math.max(0, Math.round(ws.rolloverLimit || 0)),
        totalUsed: Math.max(0, Math.round(ws.totalCreditsUsed || 0)),
        source: available === 0 && total === 0 ? 'Missing' : 'Inline',
        renderDash: false,
    };
}
