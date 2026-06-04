import { getBearerToken, markBearerTokenExpired } from '../auth';
import { CREDIT_API_BASE } from '../shared-state';
import { CreditFetchOutcome } from './credit-fetch-outcome';
import { Plan } from './plan';
import { parseCreditBalance, type CreditBalanceWire } from './credit-balance-parser';
import { logCreditFetchFailure, logCreditParseFailure, sanitizeBearerPrefix } from './credit-balance-logger';
import type { CreditBalance, CreditFailureLogPayload, CreditFetchResult } from './credit-balance-types';

const CREDIT_BALANCE_PATH_SUFFIX = '/credit-balance';
const DEFAULT_FETCH_TIMEOUT_MS = 3000;

export interface FetchCreditBalanceOptions {
    readonly workspaceId: string;
    readonly plan: Plan;
    readonly timeoutMs?: number;
    readonly forceTokenRefresh?: boolean;
}

function buildCreditBalanceUrl(workspaceId: string): string {
    return CREDIT_API_BASE + '/workspaces/' + encodeURIComponent(workspaceId) + CREDIT_BALANCE_PATH_SUFFIX;
}

function elapsedSince(startMs: number): number {
    return Math.max(0, Date.now() - startMs);
}

function isAbortError(caught: CaughtError): boolean {
    return caught instanceof DOMException && caught.name === 'AbortError';
}

function toCaughtMessage(caught: CaughtError): string {
    if (caught instanceof Error) {
        return caught.message;
    }
    if (typeof caught === 'string') {
        return caught;
    }
    return String(caught);
}

function buildFailurePayload(
    reason: string,
    detail: string,
    options: FetchCreditBalanceOptions,
    path: string,
    token: string | null,
    status: number | null,
    bodyPreview: string | null,
    startMs: number,
): CreditFailureLogPayload {
    return {
        Reason: reason,
        ReasonDetail: detail,
        Path: path,
        WorkspaceId: options.workspaceId,
        Plan: options.plan,
        BearerPrefix: sanitizeBearerPrefix(token),
        Status: status,
        BodyPreview: bodyPreview,
        TimeoutMs: options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
        ElapsedMs: elapsedSince(startMs),
    };
}

async function readBodyPreview(response: Response): Promise<string | null> {
    try {
        const text = await response.text();
        return text ? text.substring(0, 500) : null;
    } catch (caught: CaughtError) {
        return 'Unable to read error body: ' + toCaughtMessage(caught);
    }
}

export async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(function (): void {
        controller.abort();
    }, timeoutMs);

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function buildResult(
    outcome: CreditFetchOutcome,
    balance: CreditBalance | null,
    sourceUrl: string,
    errorDetail: string | null,
): CreditFetchResult {
    return { outcome, balance, fetchedAt: Date.now(), sourceUrl, errorDetail };
}

function classifyHttpReason(status: number): 'AuthError' | 'Http5xx' | 'Http4xx' {
    if (status === 401 || status === 403) return 'AuthError';
    if (status >= 500) return 'Http5xx';
    return 'Http4xx';
}

async function handleNonOkResponse(
    response: Response,
    options: FetchCreditBalanceOptions,
    url: string,
    token: string,
    startMs: number,
): Promise<CreditFetchResult> {
    const bodyPreview = await readBodyPreview(response);
    const reason = classifyHttpReason(response.status);
    const detail = 'HTTP ' + response.status + ' from /workspaces/{id}/credit-balance';
    if (reason === 'AuthError') {
        markBearerTokenExpired('credit-balance-update');
    }
    logCreditFetchFailure(buildFailurePayload(reason, detail, options, url, token, response.status, bodyPreview, startMs));
    const outcome = reason === 'AuthError' ? CreditFetchOutcome.AuthError : CreditFetchOutcome.HttpError;
    return buildResult(outcome, null, url, detail);
}

async function parseOkResponse(
    response: Response,
    options: FetchCreditBalanceOptions,
    url: string,
    token: string,
    startMs: number,
): Promise<CreditFetchResult> {
    const raw = await response.json() as CreditBalanceWire;
    try {
        return buildResult(CreditFetchOutcome.ApiHit, parseCreditBalance(raw), url, null);
    } catch (caught: CaughtError) {
        const detail = 'ParseError: ' + toCaughtMessage(caught);
        logCreditParseFailure(buildFailurePayload('ParseError', detail, options, url, token, response.status, null, startMs), caught);
        return buildResult(CreditFetchOutcome.ParseError, null, url, detail);
    }
}

function handleCaughtError(
    caught: CaughtError,
    options: FetchCreditBalanceOptions,
    url: string,
    token: string | null,
    startMs: number,
    timeoutMs: number,
): CreditFetchResult {
    if (isAbortError(caught)) {
        const detail = 'Exceeded ' + timeoutMs + ' ms budget for workspace ' + options.workspaceId;
        logCreditFetchFailure(buildFailurePayload('Timeout', detail, options, url, token, null, null, startMs), caught);
        return buildResult(CreditFetchOutcome.Timeout, null, url, detail);
    }
    const detail = 'Network error: ' + toCaughtMessage(caught);
    logCreditFetchFailure(buildFailurePayload('NetworkError', detail, options, url, token, null, null, startMs), caught);
    return buildResult(CreditFetchOutcome.HttpError, null, url, detail);
}

export async function fetchWorkspaceCreditBalance(
    options: FetchCreditBalanceOptions,
): Promise<CreditFetchResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
    const url = buildCreditBalanceUrl(options.workspaceId);
    const startMs = Date.now();
    const token = await getBearerToken(options.forceTokenRefresh ? { force: true } : undefined);

    if (!token) {
        const detail = 'No bearer token returned by unified getBearerToken() contract';
        logCreditFetchFailure(buildFailurePayload('MissingToken', detail, options, url, null, null, null, startMs));
        return buildResult(CreditFetchOutcome.MissingToken, null, url, detail);
    }

    try {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            credentials: 'include',
            mode: 'cors',
            headers: {
                Accept: '*/*',
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
        }, timeoutMs);

        if (!response.ok) {
            return await handleNonOkResponse(response, options, url, token, startMs);
        }
        return await parseOkResponse(response, options, url, token, startMs);
    } catch (caught: CaughtError) {
        return handleCaughtError(caught, options, url, token, startMs, timeoutMs);
    }
}

