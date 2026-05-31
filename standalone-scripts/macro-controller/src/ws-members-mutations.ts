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
import { showToast } from './toast';


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
 * Bulk operations — sequential fail-fast per workspace.
 */

export interface BulkOpResult {
    success: number;
    fail: number;
    total: number;
    failures: Array<{ wsId: string; wsName: string; reason: string; reasonDetail?: string }>;
}

export async function inviteMemberMany(
    wsIds: string[], 
    emails: string[], 
    role: MemberRole,
    workspaces: ReadonlyArray<import('./types/credit-types').WorkspaceCredit> = []
): Promise<BulkOpResult> {
    const results: BulkOpResult = { success: 0, fail: 0, total: wsIds.length * emails.length, failures: [] };
    
    for (const wsId of wsIds) {
        const ws = workspaces.find(w => w.id === wsId);
        const wsName = ws?.fullName || ws?.name || wsId;

        for (const email of emails) {
            try {
                await inviteMember(wsId, email, role);
                results.success++;
            } catch (e: unknown) {
                results.fail++;
                const reason = e instanceof Error ? e.message : String(e);
                const reasonDetail = (e as { data?: unknown }).data ? JSON.stringify((e as { data?: unknown }).data) : undefined;
                results.failures.push({ wsId, wsName, reason, reasonDetail });
                logError('Members.BulkInvite', `Failed to invite ${email} to ${wsName}: ${reason}`);
            }
        }
    }

    
    invalidateMembersCache();
    
    if (results.fail > 0) {
        showToast(`Bulk invite partial: ${results.success} ok, ${results.fail} failed`, 'warn');
    } else if (results.success > 0) {
        showToast(`Successfully invited to ${results.success} targets`, 'success');
    }

    return results;
}

export async function updateMemberRoleMany(
    wsIds: string[], 
    userId: string, 
    role: MemberRole,
    workspaces: ReadonlyArray<import('./types/credit-types').WorkspaceCredit> = []
): Promise<BulkOpResult> {
    const results: BulkOpResult = { success: 0, fail: 0, total: wsIds.length, failures: [] };
    
    for (const wsId of wsIds) {
        const ws = workspaces.find(w => w.id === wsId);
        const wsName = ws?.fullName || ws?.name || wsId;
        try {
            await updateMemberRole(wsId, userId, role);
            results.success++;
        } catch (e: unknown) {
            results.fail++;
            const reason = e instanceof Error ? e.message : String(e);
            const reasonDetail = (e as { data?: unknown }).data ? JSON.stringify((e as { data?: unknown }).data) : undefined;
            results.failures.push({ wsId, wsName, reason, reasonDetail });
            logError('Members.BulkUpdate', `Failed to update ${userId} in ${wsName}: ${reason}`);

        }
    }
    
    invalidateMembersCache();
    return results;
}

/** 
 * Bulk promote/demote (Task 12) 
 * Wraps updateMemberRoleMany with toast feedback.
 */
export async function promoteMemberMany(wsIds: string[], userId: string, workspaces: unknown[] = []): Promise<void> {
    showToast(`Promoting member in ${wsIds.length} workspaces...`, 'info');
    const res = await updateMemberRoleMany(wsIds, userId, 'owner', workspaces as WorkspaceCredit[]);
    if (res.fail > 0) {
        showToast(`Promotion partial: ${res.success} ok, ${res.fail} failed`, 'warn');
    } else {
        showToast(`Successfully promoted in ${res.success} workspaces`, 'success');
    }
}

export async function demoteMemberMany(wsIds: string[], userId: string, workspaces: unknown[] = []): Promise<void> {
    showToast(`Demoting member in ${wsIds.length} workspaces...`, 'info');
    const res = await updateMemberRoleMany(wsIds, userId, 'member', workspaces as WorkspaceCredit[]);
    if (res.fail > 0) {
        showToast(`Demotion partial: ${res.success} ok, ${res.fail} failed`, 'warn');
    } else {
        showToast(`Successfully demoted in ${res.success} workspaces`, 'success');
    }
}


export async function removeMemberMany(
    wsIds: string[], 
    userId: string,
    workspaces: ReadonlyArray<import('./types/credit-types').WorkspaceCredit> = []
): Promise<BulkOpResult> {
    const results: BulkOpResult = { success: 0, fail: 0, total: wsIds.length, failures: [] };
    
    for (const wsId of wsIds) {
        const ws = workspaces.find(w => w.id === wsId);
        const wsName = ws?.fullName || ws?.name || wsId;
        try {
            await removeMember(wsId, userId);
            results.success++;
        } catch (e: unknown) {
            results.fail++;
            const reason = e instanceof Error ? e.message : String(e);
            const reasonDetail = (e as { data?: unknown }).data ? JSON.stringify((e as { data?: unknown }).data) : undefined;
            results.failures.push({ wsId, wsName, reason, reasonDetail });
            logError('Members.BulkRemove', `Failed to remove ${userId} from ${wsName}: ${reason}`);
        }

    }
    
    invalidateMembersCache();
    return results;
}

