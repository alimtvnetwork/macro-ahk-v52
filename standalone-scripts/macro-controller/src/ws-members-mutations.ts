/**
 * Workspace Members Mutations — v3.4.3 (spec 113 tasks 13/14)
 *
 * Thin wrappers around `marco.api.memberships.{invite,remove,updateRole}` that
 * also invalidate the per-workspace members cache so the next fetch reflects
 * the change. Fail-fast per `mem://constraints/no-retry-policy`.
 */

import { CREDIT_API_BASE } from './shared-state';
import { log } from './logging';
import { logError } from './error-utils';
import { clearMembersCache, invalidateMembersCache } from './ws-members-fetch';

type MemberRole = 'member' | 'owner';

interface MembershipsApi {
  invite: (wsId: string, email: string, role: MemberRole, options?: { baseUrl?: string }) => Promise<{ ok: boolean; status: number; data: unknown }>;
  remove: (wsId: string, userId: string, options?: { baseUrl?: string }) => Promise<{ ok: boolean; status: number; data: unknown }>;
  updateRole: (wsId: string, userId: string, role: MemberRole, options?: { baseUrl?: string }) => Promise<{ ok: boolean; status: number; data: unknown }>;
}

interface MarcoSdkShape {
  api?: { memberships?: MembershipsApi };
}

function getMemberships(): MembershipsApi {
  const sdk = (window as unknown as { marco?: MarcoSdkShape }).marco;
  const api = sdk?.api?.memberships;
  if (!api) {
    throw new Error('marco.api.memberships is not available — SDK not loaded');
  }
  return api;
}

function previewBody(data: unknown): string {
  try { return JSON.stringify(data).substring(0, 200); } catch { return String(data); }
}

/** POST /workspaces/{wsId}/memberships — invite by email. */
export async function inviteMember(wsId: string, email: string, role: MemberRole): Promise<void> {
  if (!wsId) throw new Error('inviteMember: wsId is required');
  if (!email) throw new Error('inviteMember: email is required');
  log('[Members] POST invite ' + email + ' (' + role + ') → ' + wsId, 'delegate');
  const resp = await getMemberships().invite(wsId, email, role, { baseUrl: CREDIT_API_BASE });
  if (!resp.ok) {
    const body = previewBody(resp.data);
    logError('Members', 'invite HTTP ' + resp.status + ': ' + body);
    throw new Error('HTTP ' + resp.status + ' — ' + body);
  }
  clearMembersCache(wsId);
  log('[Members] ✅ invited ' + email, 'success');
}

/** DELETE /workspaces/{wsId}/memberships/{userId} — remove a member. */
export async function removeMember(wsId: string, userId: string): Promise<void> {
  if (!wsId) throw new Error('removeMember: wsId is required');
  if (!userId) throw new Error('removeMember: userId is required');
  log('[Members] DELETE ' + userId + ' ← ' + wsId, 'delegate');
  const resp = await getMemberships().remove(wsId, userId, { baseUrl: CREDIT_API_BASE });
  if (!resp.ok) {
    const body = previewBody(resp.data);
    logError('Members', 'remove HTTP ' + resp.status + ': ' + body);
    throw new Error('HTTP ' + resp.status + ' — ' + body);
  }
  clearMembersCache(wsId);
  log('[Members] ✅ removed ' + userId, 'success');
}

/** PATCH /workspaces/{wsId}/memberships/{userId} — change role (promote to owner). */
export async function updateMemberRole(wsId: string, userId: string, role: MemberRole): Promise<void> {
  if (!wsId) throw new Error('updateMemberRole: wsId is required');
  if (!userId) throw new Error('updateMemberRole: userId is required');
  log('[Members] PATCH role=' + role + ' ' + userId + ' @ ' + wsId, 'delegate');
  const resp = await getMemberships().updateRole(wsId, userId, role, { baseUrl: CREDIT_API_BASE });
  if (!resp.ok) {
    const body = previewBody(resp.data);
    logError('Members', 'updateRole HTTP ' + resp.status + ': ' + body);
    throw new Error('HTTP ' + resp.status + ' — ' + body);
  }
  clearMembersCache(wsId);
  log('[Members] ✅ role=' + role + ' for ' + userId, 'success');
}

/** 
 * Bulk operations — sequential fail-fast. 
 */

export async function inviteMemberMany(wsIds: string[], emails: string[], role: MemberRole): Promise<{ success: number; fail: number }> {
    const results = { success: 0, fail: 0 };
    for (const wsId of wsIds) {
        for (const email of emails) {
            try {
                await inviteMember(wsId, email, role);
                results.success++;
            } catch (e: any) {
                results.fail++;
            }
        }
    }
    invalidateMembersCache();
    return results;
}

export async function updateMemberRoleMany(wsIds: string[], userId: string, role: MemberRole): Promise<{ success: number; fail: number }> {
    const results = { success: 0, fail: 0 };
    for (const wsId of wsIds) {
        try {
            await updateMemberRole(wsId, userId, role);
            results.success++;
        } catch (e: any) {
            results.fail++;
        }
    }
    invalidateMembersCache();
    return results;
}

export async function removeMemberMany(wsIds: string[], userId: string): Promise<{ success: number; fail: number }> {
    const results = { success: 0, fail: 0 };
    for (const wsId of wsIds) {
        try {
            await removeMember(wsId, userId);
            results.success++;
        } catch (e: any) {
            results.fail++;
        }
    }
    invalidateMembersCache();
    return results;
}
