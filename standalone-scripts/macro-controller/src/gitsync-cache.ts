/**
 * MacroLoop Controller — Workspace Gitsync Cache (SQLite via marco.kv)
 *
 * Spec: spec/22-app-issues/workspace-github-open/01-overview.md (v3.10.0)
 *
 * Persists `gitsync` lookups per (wsId, projectId) so the right-click
 * "Open GitHub repo" action never re-hits the network for a result we
 * already know — including negative results ("not_linked") which would
 * otherwise be re-fetched on every right-click.
 *
 * Storage shape (PascalCase per `mem://architecture/logging-data-contract`):
 *   `MacroGitsyncCache:{wsId}:{projectId}` →
 *     {
 *       WorkspaceId, ProjectId, Status: 'found' | 'not_linked' | 'error',
 *       RepoUrl?: string, FetchedAt (ISO), ExpiresAt (epoch ms)
 *     }
 *
 * TTL tiers (spec §6):
 *   - 'found'      → effectively infinite (Number.MAX_SAFE_INTEGER) so
 *                    repeated right-clicks open the cached URL directly.
 *   - 'not_linked' → 24h. Repo links rarely change; the explicit
 *                    "Refresh gitsync" menu entry forces a re-fetch.
 *   - 'error'      → 5 minutes. Transient failures shouldn't pin a bad
 *                    state but mustn't hammer the API either.
 *
 * Standards:
 *   - `mem://constraints/no-retry-policy` — single attempt; caller
 *     surfaces the failure as a toast.
 *   - `mem://constraints/no-storage-pascalcase-migration` — NEW kv-key
 *     family; policy allows it.
 */

import { logError } from './error-utils';
import { log } from './logging';

const KEY_PREFIX = 'MacroGitsyncCache:';

export const GITSYNC_TTL_FOUND_MS = Number.MAX_SAFE_INTEGER;
export const GITSYNC_TTL_NOT_LINKED_MS = 24 * 60 * 60 * 1000;
export const GITSYNC_TTL_ERROR_MS = 5 * 60 * 1000;

export type GitsyncStatus = 'found' | 'not_linked' | 'error';

export interface GitsyncCacheRow {
  readonly WorkspaceId: string;
  readonly ProjectId: string;
  readonly Status: GitsyncStatus;
  readonly RepoUrl?: string;
  readonly FetchedAt: string;
  readonly ExpiresAt: number;
}

interface KvBridge {
  kv: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
}

function getKv(): KvBridge['kv'] | null {
  const sdk = (window as unknown as { marco?: KvBridge }).marco;
  return sdk && sdk.kv ? sdk.kv : null;
}

function buildKey(wsId: string, pid: string): string {
  return KEY_PREFIX + wsId + ':' + pid;
}

function ttlFor(status: GitsyncStatus): number {
  if (status === 'found') return GITSYNC_TTL_FOUND_MS;
  if (status === 'not_linked') return GITSYNC_TTL_NOT_LINKED_MS;
  return GITSYNC_TTL_ERROR_MS;
}

/**
 * Read a cached gitsync row for a (wsId, projectId). Returns `null` when
 * absent, malformed, or expired (expired rows are deleted lazily).
 */
export async function getGitsyncCache(
  wsId: string,
  pid: string,
): Promise<GitsyncCacheRow | null> {
  if (!wsId || !pid) return null;
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(buildKey(wsId, pid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GitsyncCacheRow>;
    if (typeof parsed.ExpiresAt !== 'number' || typeof parsed.Status !== 'string') return null;
    if (parsed.ExpiresAt <= Date.now()) {
      log('GitsyncCache: expired ws=' + wsId + ' pid=' + pid, 'info');
      kv.delete(buildKey(wsId, pid)).catch(function (e: unknown): void {
        logError('GitsyncCache.read.delete', 'kv.delete failed for expired row', e);
      });
      return null;
    }
    return parsed as GitsyncCacheRow;
  } catch (err: unknown) {
    logError('GitsyncCache.read', 'kv.get failed for ws=' + wsId + ' pid=' + pid, err);
    return null;
  }
}

/**
 * Upsert a gitsync cache row. Fire-and-forget — errors are logged but do
 * not block the calling open flow.
 */
export function setGitsyncCache(
  wsId: string,
  pid: string,
  status: GitsyncStatus,
  repoUrl?: string,
): void {
  if (!wsId || !pid) return;
  const kv = getKv();
  if (!kv) {
    logError('GitsyncCache.write', 'marco.kv unavailable — skipping write for ws=' + wsId + ' pid=' + pid);
    return;
  }
  const now = Date.now();
  const ttl = ttlFor(status);
  const expires = ttl === Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : now + ttl;
  const row: GitsyncCacheRow = {
    WorkspaceId: wsId,
    ProjectId: pid,
    Status: status,
    RepoUrl: repoUrl,
    FetchedAt: new Date(now).toISOString(),
    ExpiresAt: expires,
  };
  kv.set(buildKey(wsId, pid), JSON.stringify(row)).then(function (): void {
    log('GitsyncCache: wrote ws=' + wsId + ' pid=' + pid + ' status=' + status, 'info');
  }).catch(function (e: unknown): void {
    logError('GitsyncCache.write', 'kv.set failed for ws=' + wsId + ' pid=' + pid, e);
  });
}

/** Drop a cached row so the next lookup re-fetches. */
export function invalidateGitsyncCache(wsId: string, pid: string): void {
  if (!wsId || !pid) return;
  const kv = getKv();
  if (!kv) return;
  kv.delete(buildKey(wsId, pid)).catch(function (e: unknown): void {
    logError('GitsyncCache.invalidate', 'kv.delete failed for ws=' + wsId + ' pid=' + pid, e);
  });
}
