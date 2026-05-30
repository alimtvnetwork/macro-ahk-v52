/**
 * MacroLoop Controller — ensureGithubRepo helper (Issue 129 Step 5)
 *
 * Spec: spec/22-app-issues/129-prompts-cache-plan-task-gitsync-remix.md
 *       § Step 5 — connection-aware sync trigger.
 *
 * Contract:
 *   1. Probe `gitsync.progress` first (resolveConnection). If already
 *      connected, persist the cached `found` row and short-circuit — we
 *      never POST `/sync` for a connected project (that would create a
 *      duplicate repo).
 *   2. Otherwise POST `gitsync.syncProject` ONCE to obtain a job_id.
 *      No retries, no backoff (`mem://constraints/no-retry-policy`).
 *   3. Poll progress sequentially within a single deadline. On success
 *      (`status==='completed' && result.repo_url`), persist gitsync-cache
 *      and return the URL. On `failed` / deadline, persist `error` and
 *      surface the reason.
 *
 * SDK contract: routes through `window.marco.api.call` so auth/base-url
 * are identical to every other API call.
 */

import { logError } from '../error-utils';
import { log } from '../logging';
import { CREDIT_API_BASE } from '../shared-state';
import { setGitsyncCache, invalidateGitsyncCache } from '../gitsync-cache';
import {
    resolveConnection,
    probeProgress,
    wellKnownJobId,
    PROBE_POLL_INTERVAL_MS,
    DEFAULT_PROBE_DEADLINE_MS,
    type GitsyncProgressBody,
} from './progress-probe';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EnsureRepoOptions {
    /** Total sync-poll budget (default {@link DEFAULT_ENSURE_DEADLINE_MS}). */
    readonly deadlineMs?: number;
    /** When true, drop any cached row before probing. */
    readonly forceRefresh?: boolean;
}

export type EnsureRepoOutcome =
    | { status: 'connected'; repoUrl: string; created: boolean }
    | { status: 'syncing'; jobId: string; reason: 'deadline' }
    | { status: 'failed'; reason: string; httpStatus?: number };

interface SdkApiResponse {
    readonly ok: boolean;
    readonly status: number;
    readonly data: unknown;
}

interface SdkBridge {
    api: {
        call(path: string, options: { params: Record<string, string>; baseUrl: string }): Promise<SdkApiResponse>;
    };
}

interface SyncPostBody {
    readonly job_id?: string;
    readonly jobId?: string;
    readonly id?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Longer than progress-probe default — POST + repo creation takes time. */
export const DEFAULT_ENSURE_DEADLINE_MS = 30_000;

/* ------------------------------------------------------------------ */
/*  SDK accessor                                                       */
/* ------------------------------------------------------------------ */

function getSdk(): SdkBridge | null {
    const sdk = (window as unknown as { marco?: SdkBridge }).marco;
    if (!sdk || !sdk.api || typeof sdk.api.call !== 'function') return null;
    return sdk;
}

function pickJobId(body: SyncPostBody | null): string | null {
    if (!body) return null;
    return body.job_id ?? body.jobId ?? body.id ?? null;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/*  postSync — single POST to /sync (no retry)                          */
/* ------------------------------------------------------------------ */

interface PostSyncResult {
    readonly ok: boolean;
    readonly jobId: string | null;
    readonly httpStatus: number;
    readonly reason: string;
}

async function postSync(
    wsId: string,
    connId: string,
    projectId: string,
): Promise<PostSyncResult> {
    const sdk = getSdk();
    if (!sdk) {
        const reason = 'sdk_unavailable';
        logError('EnsureRepo', 'postSync: marco.api.call unavailable'
            + ' [ws=' + wsId + ' conn=' + connId + ' pid=' + projectId + ']');
        return { ok: false, jobId: null, httpStatus: 0, reason };
    }

    let resp: SdkApiResponse;
    try {
        resp = await sdk.api.call('gitsync.syncProject', {
            params: { wsId, connId, projectId },
            baseUrl: CREDIT_API_BASE,
        });
    } catch (err: unknown) {
        logError('EnsureRepo', 'postSync sdk.api.call threw'
            + ' [ws=' + wsId + ' conn=' + connId + ' pid=' + projectId + ']', err);
        return { ok: false, jobId: null, httpStatus: 0, reason: 'network_error' };
    }

    if (!resp.ok) {
        const preview = JSON.stringify(resp.data).substring(0, 200);
        logError('EnsureRepo', 'postSync HTTP ' + resp.status
            + ' [ws=' + wsId + ' conn=' + connId + ' pid=' + projectId + ']'
            + ' bodyPreview=' + preview);
        return { ok: false, jobId: null, httpStatus: resp.status, reason: 'http_' + resp.status };
    }

    const jobId = pickJobId(resp.data as SyncPostBody);
    if (!jobId) {
        // Server may key job by the well-known id even when not returned.
        log('[EnsureRepo] postSync ok but no job_id in body → using well-known id', 'info');
        return { ok: true, jobId: wellKnownJobId(projectId), httpStatus: resp.status, reason: 'ok' };
    }
    return { ok: true, jobId, httpStatus: resp.status, reason: 'ok' };
}

/* ------------------------------------------------------------------ */
/*  pollUntilTerminal — sequential polling within deadline             */
/* ------------------------------------------------------------------ */

function isTerminal(body: GitsyncProgressBody | null): boolean {
    if (!body) return false;
    const s = body.status;
    return s === 'completed' || s === 'failed';
}

async function pollUntilTerminal(
    wsId: string,
    projectId: string,
    jobId: string,
    deadlineMs: number,
): Promise<GitsyncProgressBody | null | 'deadline'> {
    const start = Date.now();

    while (Date.now() - start < deadlineMs) {
        let body: GitsyncProgressBody | null;
        try {
            body = await probeProgress(wsId, projectId, jobId);
        } catch (err: unknown) {
            logError('EnsureRepo', 'pollUntilTerminal probe failed'
                + ' [ws=' + wsId + ' pid=' + projectId + ' job=' + jobId + ']', err);
            return null;
        }
        if (isTerminal(body)) return body;
        await sleep(PROBE_POLL_INTERVAL_MS);
    }
    return 'deadline';
}

/* ------------------------------------------------------------------ */
/*  ensureGithubRepo — public entry point                              */
/* ------------------------------------------------------------------ */

/**
 * Ensure the given (wsId, connId, projectId) has a GitHub repo wired up.
 *
 * Probes first; only POSTs `/sync` when the project is not already
 * connected (so we never create duplicate repos). Persists results into
 * the gitsync-cache so subsequent right-clicks open offline.
 */
export async function ensureGithubRepo(
    wsId: string,
    connId: string,
    projectId: string,
    options: EnsureRepoOptions = {},
): Promise<EnsureRepoOutcome> {
    if (!wsId || !connId || !projectId) {
        logError('EnsureRepo', 'missing required arg(s) ws=' + wsId
            + ' conn=' + connId + ' pid=' + projectId);
        return { status: 'failed', reason: 'missing_args' };
    }
    const deadlineMs = options.deadlineMs ?? DEFAULT_ENSURE_DEADLINE_MS;

    if (options.forceRefresh) invalidateGitsyncCache(wsId, projectId);

    // ── 1) Probe first — never POST /sync for already-connected projects.
    const probed = await resolveConnection(wsId, connId, projectId);
    if (probed.connected) {
        setGitsyncCache(wsId, projectId, 'found', probed.repoUrl);
        return { status: 'connected', repoUrl: probed.repoUrl, created: false };
    }

    // ── 2) POST /sync once (no retry).
    const posted = await postSync(wsId, connId, projectId);
    if (!posted.ok || !posted.jobId) {
        setGitsyncCache(wsId, projectId, 'error');
        return { status: 'failed', reason: posted.reason, httpStatus: posted.httpStatus };
    }

    // ── 3) Poll the returned job_id until terminal or deadline.
    const terminal = await pollUntilTerminal(wsId, projectId, posted.jobId, deadlineMs);
    if (terminal === 'deadline') {
        log('[EnsureRepo] deadline ws=' + wsId + ' pid=' + projectId
            + ' job=' + posted.jobId + ' after ' + deadlineMs + 'ms', 'info');
        return { status: 'syncing', jobId: posted.jobId, reason: 'deadline' };
    }
    if (terminal === null) {
        setGitsyncCache(wsId, projectId, 'error');
        return { status: 'failed', reason: 'poll_error' };
    }
    if (terminal.status === 'failed') {
        setGitsyncCache(wsId, projectId, 'error');
        return { status: 'failed', reason: 'sync_failed' };
    }
    const url = terminal.result?.repo_url;
    if (typeof url === 'string' && url.length > 0) {
        setGitsyncCache(wsId, projectId, 'found', url);
        return { status: 'connected', repoUrl: url, created: true };
    }
    setGitsyncCache(wsId, projectId, 'error');
    return { status: 'failed', reason: 'no_repo_url' };
}
