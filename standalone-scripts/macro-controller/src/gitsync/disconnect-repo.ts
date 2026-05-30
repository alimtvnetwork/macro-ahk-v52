/**
 * MacroLoop Controller — Gitsync Disconnect (Issue 129 / Step 9)
 *
 * Issues `DELETE /workspaces/{wsId}/projects/{pid}/gitsync` via the
 * centralized marco-sdk and invalidates the local gitsync cache so the
 * UI immediately reflects a "not_linked" state.
 *
 * Standards:
 *   - `mem://constraints/no-retry-policy` — single attempt, fail-fast.
 *   - `mem://auth/unified-auth-contract` — auth via `marco.api.call`.
 *   - `mem://architecture/logging-data-contract` — PascalCase logs.
 *
 * A `confirm()` prompt is exposed via `confirmAndDisconnectGithubRepo`
 * so callers (project-name ▾ dropdown, Step 10) can gate the destructive
 * call behind the user's explicit acknowledgement. The bare
 * `disconnectGithubRepo` is exported for tests and for callers that
 * already have their own confirmation UX.
 */

import { logError } from '../error-utils';
import { log } from '../logging';
import { CREDIT_API_BASE } from '../shared-state';
import { invalidateGitsyncCache } from '../gitsync-cache';

export type GitsyncDisconnectOutcome =
  | { status: 'ok' }
  | { status: 'not_linked' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string; httpStatus?: number };

interface SdkApiResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly data: unknown;
}

interface SdkBridge {
  api: {
    call(
      path: string,
      options: { method?: string; params: Record<string, string>; baseUrl: string },
    ): Promise<SdkApiResponse>;
  };
}

function getSdk(): SdkBridge | null {
  const sdk = (window as unknown as { marco?: SdkBridge }).marco;
  if (!sdk || !sdk.api || typeof sdk.api.call !== 'function') return null;
  return sdk;
}

const DEFAULT_CONFIRM_MESSAGE =
  'Disconnect this Lovable project from its GitHub repository?\n\n' +
  'The repo on GitHub is NOT deleted, but this project will stop syncing to it.';

/**
 * Disconnect a project from its linked GitHub repo. Single attempt,
 * never throws. Cache is invalidated on every non-error outcome.
 */
export async function disconnectGithubRepo(
  wsId: string,
  pid: string,
): Promise<GitsyncDisconnectOutcome> {
  if (!wsId || !pid) {
    return { status: 'error', message: 'missing wsId or projectId' };
  }
  const sdk = getSdk();
  if (!sdk) {
    logError('GitsyncDisconnect', 'marco.api.call unavailable for ws=' + wsId + ' pid=' + pid);
    return { status: 'error', message: 'sdk_unavailable' };
  }

  let resp: SdkApiResponse;
  try {
    resp = await sdk.api.call('projects.gitsync', {
      method: 'DELETE',
      params: { wsId, projectId: pid },
      baseUrl: CREDIT_API_BASE,
    });
  } catch (err: unknown) {
    logError('GitsyncDisconnect', 'sdk.api.call threw for ws=' + wsId + ' pid=' + pid, err);
    return { status: 'error', message: 'network_error' };
  }

  if (resp.status === 404) {
    invalidateGitsyncCache(wsId, pid);
    log('[GitsyncDisconnect] HTTP 404 ws=' + wsId + ' pid=' + pid + ' → already not_linked', 'info');
    return { status: 'not_linked' };
  }
  if (!resp.ok) {
    logError('GitsyncDisconnect',
      'HTTP ' + resp.status + ' for ws=' + wsId + ' pid=' + pid
      + ' bodyPreview=' + JSON.stringify(resp.data).substring(0, 200));
    return { status: 'error', message: 'http_' + resp.status, httpStatus: resp.status };
  }

  invalidateGitsyncCache(wsId, pid);
  log('[GitsyncDisconnect] disconnected ws=' + wsId + ' pid=' + pid, 'info');
  return { status: 'ok' };
}

/**
 * Show a native confirm() dialog; on confirm, call disconnectGithubRepo.
 * Returns `{ status: 'cancelled' }` if the user dismisses the prompt.
 *
 * `confirmFn` is injectable for tests (jsdom's window.confirm is a no-op).
 */
export async function confirmAndDisconnectGithubRepo(
  wsId: string,
  pid: string,
  confirmFn?: (msg: string) => boolean,
  message: string = DEFAULT_CONFIRM_MESSAGE,
): Promise<GitsyncDisconnectOutcome> {
  const askFn = confirmFn
    ?? (typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm.bind(window)
      : null);
  if (!askFn) {
    logError('GitsyncDisconnect.confirm', 'window.confirm unavailable — refusing to disconnect ws='
      + wsId + ' pid=' + pid);
    return { status: 'error', message: 'confirm_unavailable' };
  }
  const ok = askFn(message);
  if (!ok) {
    log('[GitsyncDisconnect] user cancelled ws=' + wsId + ' pid=' + pid, 'info');
    return { status: 'cancelled' };
  }
  return disconnectGithubRepo(wsId, pid);
}
