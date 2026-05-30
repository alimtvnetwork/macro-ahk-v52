/**
 * Workspace Members Fetcher — v3.4.3
 *
 * Handles fetching the list of members for a given workspace.
 * Uses the marco.api.memberships SDK.
 */

import { CREDIT_API_BASE } from './shared-state';
import { log } from './logging';
import { logError } from './error-utils';

export interface WorkspaceMember {
  user_id: string;
  email: string;
  display_name: string;
  username: string;
  role: string;
  joined_at: string;
  invited_at: string;
  total_credits_used: number;
  total_credits_used_in_billing_period: number;
}

export const DEFAULT_MEMBERS_PAGE_LIMIT = 50;
export const MEMBERS_PAGE_LIMIT_STEPS = [50, 100, 250, 500];

const membersCache = new Map<string, { members: WorkspaceMember[]; total: number; expires: number }>();
const CACHE_TTL = 30000; // 30s

interface MarcoSdkShape {
  api?: { memberships?: { list: (wsId: string, options?: { limit?: number; baseUrl?: string }) => Promise<{ ok: boolean; status: number; data: any }> } };
}

function getMemberships() {
  const sdk = (window as unknown as { marco?: MarcoSdkShape }).marco;
  const api = sdk?.api?.memberships;
  if (!api) throw new Error('marco.api.memberships is not available');
  return api;
}

export async function fetchWorkspaceMembers(wsId: string, limit = DEFAULT_MEMBERS_PAGE_LIMIT): Promise<{ members: WorkspaceMember[]; total: number }> {
  const now = Date.now();
  const cached = membersCache.get(wsId);
  if (cached && cached.expires > now && cached.members.length >= limit) {
    return { members: cached.members.slice(0, limit), total: cached.total };
  }

  log('[Members] GET list wsId=' + wsId + ' limit=' + limit, 'delegate');
  const resp = await getMemberships().list(wsId, { limit, baseUrl: CREDIT_API_BASE });
  if (!resp.ok) {
    throw new Error('HTTP ' + resp.status + ' — ' + JSON.stringify(resp.data));
  }

  const members = (resp.data.members || []) as WorkspaceMember[];
  const total = resp.data.total || members.length;
  
  membersCache.set(wsId, { members, total, expires: now + CACHE_TTL });
  return { members, total };
}

export function clearMembersCache(wsId?: string): void {
  if (wsId) membersCache.delete(wsId);
  else membersCache.clear();
}

/** 
 * Multi-workspace fetcher — Issue 130 
 */
import type { WorkspaceCredit } from './types/credit-types';

export interface PerWsMembers {
  wsId: string;
  wsName: string;
  members: WorkspaceMember[];
  error?: string;
}

const bulkCache = new Map<string, PerWsMembers>();

export async function fetchMembersForMany(
  wsIds: string[],
  workspaces: ReadonlyArray<WorkspaceCredit>,
  options: { cap?: number } = {}
): Promise<PerWsMembers[]> {
  const cap = options.cap ?? 25;
  const targetIds = wsIds.slice(0, cap);
  const results: PerWsMembers[] = [];

  for (const id of targetIds) {
    const ws = workspaces.find(w => w.id === id);
    const wsName = ws?.fullName || ws?.name || id;

    if (bulkCache.has(id)) {
      results.push(bulkCache.get(id)!);
      continue;
    }

    try {
      const { members } = await fetchWorkspaceMembers(id, DEFAULT_MEMBERS_PAGE_LIMIT);
      const res = { wsId: id, wsName, members };
      bulkCache.set(id, res);
      results.push(res);
    } catch (e: any) {
      results.push({ wsId: id, wsName, members: [], error: String(e.message || e) });
    }
  }

  return results;
}

export function invalidateMembersCache(wsId?: string): void {
  if (wsId) {
      bulkCache.delete(wsId);
      membersCache.delete(wsId);
  } else {
      bulkCache.clear();
      membersCache.clear();
  }
}
