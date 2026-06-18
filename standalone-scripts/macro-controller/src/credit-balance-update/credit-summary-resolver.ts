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

function buildCachedSummary(ws: WorkspaceCredit, balance: NonNullable<ReturnType<typeof readCreditBalanceUpdateCacheSync>>['balance']): CreditSummary {
    const b = balance!;
    return {
        available: Math.max(0, Math.round(b.totalRemaining)),
        total: Math.max(0, Math.round(b.totalGranted)),
        daily: Math.max(0, Math.round(b.dailyRemaining)),
        dailyLimit: Math.max(0, Math.round(b.dailyLimit)),
        billingAvailable: Math.max(0, Math.round(b.totalRemaining - b.dailyRemaining)),
        billingLimit: Math.max(0, Math.round(b.totalGranted - b.dailyLimit)),
        rollover: Math.max(0, Math.round(ws.rollover || 0)),
        rolloverLimit: Math.max(0, Math.round(ws.rolloverLimit || 0)),
        totalUsed: Math.max(0, Math.round(b.totalBillingPeriodUsed)),
        source: 'Cache',
        renderDash: false,
    };
}

function zeroSummary(source: CreditSummary['source'], renderDash: boolean): CreditSummary {
    return {
        available: 0, total: 0, daily: 0, dailyLimit: 0,
        billingAvailable: 0, billingLimit: 0, rollover: 0, rolloverLimit: 0,
        totalUsed: 0, source, renderDash,
    };
}

export function resolveCreditSummary(ws: WorkspaceCredit): CreditSummary {
    const cached = ws.id ? readCreditBalanceUpdateCacheSync(ws.id) : null;
    if (cached?.balance) { return buildCachedSummary(ws, cached.balance); }
    if (cached?.outcome === CreditFetchOutcome.Timeout) { return zeroSummary('Timeout', true); }

    const total = inlineTotal(ws);
    const available = Math.max(0, Math.round(ws.available || 0));
    if (available === 0 && total === 0) {
        const plan = mapPlanFromWire(ws.plan);
        if (shouldFetchCreditBalanceForPlan(plan) && !hasInlineCredits(ws)) {
            return zeroSummary('Pending', true);
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

