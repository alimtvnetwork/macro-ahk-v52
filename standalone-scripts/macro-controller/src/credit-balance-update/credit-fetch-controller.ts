import type { WorkspaceCredit } from '../types';
import { onSettingsChange } from '../settings-store';
import { CreditFetchOutcome } from './credit-fetch-outcome';
import { fetchWorkspaceCreditBalance } from './credit-balance-fetcher';
import { readCreditBalanceUpdateCache, writeCreditBalanceUpdateCache, makeCachedResult, invalidateCreditBalanceUpdateCache, CREDIT_BALANCE_UPDATE_CACHE_TTL_MS } from './credit-balance-cache';
import { mapPlanFromWire, shouldFetchCreditBalanceForPlan } from './plan-mapper';
import { Plan } from './plan';
import type { CreditBalance, CreditFetchResult } from './credit-balance-types';
import { logError } from '../error-utils';

const DEFAULT_TIMEOUT_MS = 3000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 15_000;
const SOURCE_INLINE = 'inline:/user/workspaces';

let timeoutMs = DEFAULT_TIMEOUT_MS;
const inFlight = new Map<string, Promise<CreditFetchResult>>();
let settingsUnsubscribe: (() => void) | null = null;

interface CreditFetchSettingsShape {
    readonly creditFetchDelayMs?: number;
}

function clampTimeoutMs(value: number): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_TIMEOUT_MS;
    }
    if (value < MIN_TIMEOUT_MS) {
        return MIN_TIMEOUT_MS;
    }
    if (value > MAX_TIMEOUT_MS) {
        return MAX_TIMEOUT_MS;
    }
    return Math.floor(value);
}

function readRawGrantTypeBalances(ws: WorkspaceCredit): ReadonlyArray<object> | null {
    const fromRawApi = ws.rawApi.grant_type_balances;
    if (Array.isArray(fromRawApi)) {
        return fromRawApi as ReadonlyArray<object>;
    }
    const fromRaw = ws.raw.grant_type_balances;
    if (Array.isArray(fromRaw)) {
        return fromRaw as ReadonlyArray<object>;
    }
    return null;
}

/**
 * A grant-type-balance row counts as "inline data" only if it carries a
 * non-zero number. New free / Lite (ktlo) / Cancelled accounts can ship
 * `grant_type_balances: [{ total_granted: 0, total_remaining: 0, ... }]`
 * — a zero-row that previously short-circuited the /credit-balance fetch
 * and pinned the UI at 0/0. See `.lovable/plan.md` 2026-06-06 RCA #3.
 */
function isNonZeroGrantRow(row: object): boolean {
    const r = row as Record<string, unknown>;
    const keys = ['total_granted', 'total_remaining', 'total_billing_period_used', 'daily_limit', 'daily_remaining'];
    for (const k of keys) {
        const v = Number(r[k]);
        if (Number.isFinite(v) && v > 0) {
            return true;
        }
    }
    return false;
}

export function hasInlineCredits(ws: WorkspaceCredit): boolean {
    if (Number(ws.limit || 0) > 0) {
        return true;
    }
    const balances = readRawGrantTypeBalances(ws);
    if (!Array.isArray(balances) || balances.length === 0) {
        return false;
    }
    return balances.some(isNonZeroGrantRow);
}

function buildInlineBalance(ws: WorkspaceCredit): CreditBalance {
    return {
        totalRemaining: Math.max(0, Math.round(ws.available || 0)),
        totalGranted: Math.max(0, Math.round(ws.totalCredits || 0)),
        dailyRemaining: Math.max(0, Math.round(ws.dailyFree || 0)),
        dailyLimit: Math.max(0, Math.round(ws.dailyLimit || 0)),
        totalBillingPeriodUsed: Math.max(0, Math.round(ws.totalCreditsUsed || ws.used || 0)),
        expiringGrants: [],
        grantTypeBalances: [],
    };
}

function buildResult(outcome: CreditFetchOutcome, balance: CreditBalance | null, errorDetail: string | null): CreditFetchResult {
    return {
        outcome,
        balance,
        fetchedAt: Date.now(),
        sourceUrl: SOURCE_INLINE,
        errorDetail,
    };
}

export function overlayCreditBalanceOnWorkspace(ws: WorkspaceCredit, balance: CreditBalance): void {
    const dailyLimit = Math.max(0, Math.round(balance.dailyLimit));
    const dailyRemaining = Math.max(0, Math.round(balance.dailyRemaining));
    ws.totalCredits = Math.max(0, Math.round(balance.totalGranted));
    ws.available = Math.max(0, Math.round(balance.totalRemaining));
    ws.totalCreditsUsed = Math.max(0, Math.round(balance.totalBillingPeriodUsed));
    ws.used = ws.totalCreditsUsed;
    ws.dailyLimit = dailyLimit;
    ws.dailyFree = dailyRemaining;
    ws.dailyUsed = Math.max(0, dailyLimit - dailyRemaining);
}

function cacheTtlFor(result: CreditFetchResult): number {
    if (result.balance) {
        return CREDIT_BALANCE_UPDATE_CACHE_TTL_MS;
    }
    return Math.max(MIN_TIMEOUT_MS, timeoutMs);
}

async function fetchWithSingleAuthRetry(ws: WorkspaceCredit, plan: Plan): Promise<CreditFetchResult> {
    const first = await fetchWorkspaceCreditBalance({ workspaceId: ws.id, plan, timeoutMs });
    if (first.outcome !== CreditFetchOutcome.AuthError) {
        return first;
    }
    return fetchWorkspaceCreditBalance({ workspaceId: ws.id, plan, timeoutMs, forceTokenRefresh: true });
}

async function requestCreditsUncached(ws: WorkspaceCredit, plan: Plan): Promise<CreditFetchResult> {
    const result = await fetchWithSingleAuthRetry(ws, plan);
    void writeCreditBalanceUpdateCache(ws.id, result, cacheTtlFor(result));
    if (result.balance) {
        overlayCreditBalanceOnWorkspace(ws, result.balance);
    }
    return result;
}

export async function requestCredits(ws: WorkspaceCredit): Promise<CreditFetchResult> {
    if (!ws.id) {
        return buildResult(CreditFetchOutcome.Skipped, null, 'Missing workspace id');
    }

    const plan = mapPlanFromWire(ws.plan);
    if (!shouldFetchCreditBalanceForPlan(plan)) {
        return buildResult(CreditFetchOutcome.Skipped, null, 'Plan does not require /credit-balance');
    }

    if (hasInlineCredits(ws)) {
        return buildResult(CreditFetchOutcome.InlineHit, buildInlineBalance(ws), null);
    }

    const cached = await readCreditBalanceUpdateCache(ws.id);
    if (cached) {
        if (cached.balance) {
            overlayCreditBalanceOnWorkspace(ws, cached.balance);
        }
        return makeCachedResult(cached);
    }

    const existing = inFlight.get(ws.id);
    if (existing) {
        return existing;
    }

    const promise = requestCreditsUncached(ws, plan)
        .catch(function (caught: CaughtError): CreditFetchResult {
            const detail = caught instanceof Error ? caught.message : String(caught);
            logError(
                'CreditBalanceUpdate.controller',
                'Path: standalone-scripts/macro-controller/src/credit-balance-update/credit-fetch-controller.ts. Missing item: credit-balance result for workspace ' + ws.id + '. Reason: controller fetch failed without a structured result.',
                caught,
            );
            return buildResult(CreditFetchOutcome.HttpError, null, detail);
        })
        .finally(function (): void {
            inFlight.delete(ws.id);
        });
    inFlight.set(ws.id, promise);
    return promise;
}

export function setTimeoutMs(nextTimeoutMs: number): void {
    timeoutMs = clampTimeoutMs(nextTimeoutMs);
}

export function getTimeoutMs(): number {
    return timeoutMs;
}

export async function invalidateCredits(workspaceId: string): Promise<void> {
    inFlight.delete(workspaceId);
    await invalidateCreditBalanceUpdateCache(workspaceId);
}

export function subscribeCreditFetchSettings(): void {
    if (settingsUnsubscribe) {
        return;
    }
    settingsUnsubscribe = onSettingsChange(function (overrides: CreditFetchSettingsShape): void {
        if (typeof overrides.creditFetchDelayMs === 'number') {
            setTimeoutMs(overrides.creditFetchDelayMs);
        }
    });
}

export function __resetCreditFetchControllerForTests(): void {
    timeoutMs = DEFAULT_TIMEOUT_MS;
    inFlight.clear();
    if (settingsUnsubscribe) {
        settingsUnsubscribe();
        settingsUnsubscribe = null;
    }
}
