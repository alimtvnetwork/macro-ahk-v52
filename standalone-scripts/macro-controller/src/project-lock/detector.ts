/**
 * project-lock/detector — classifies a move-API response (or optional DOM
 * banner) as a "project locked" event. Pure: no I/O, no logging.
 *
 * Detection rules (Issue 124 §2.4):
 *   - HTTP 423                                → 'api-423'
 *   - Response body contains 'project_locked' or 'project is locked'
 *                                              → 'api-body-locked'
 *   - DOM banner text contains 'project is locked' (when XPath wired)
 *                                              → 'dom-banner'
 */

import type { ProjectLockEvent, ProjectLockReason } from './types';

export interface DetectInput {
    readonly workspaceId: string;
    readonly projectId: string;
    readonly status?: number;
    readonly body?: string | null;
    readonly bannerText?: string | null;
    readonly nowMs?: number;
}

const LOCK_PHRASES = ['project_locked', 'project is locked'];

function bodyMatches(body: string | null | undefined): boolean {
    if (typeof body !== 'string' || body.length === 0) {
        return false;
    }
    const lower = body.toLowerCase();
    for (const phrase of LOCK_PHRASES) {
        if (lower.indexOf(phrase) !== -1) {
            return true;
        }
    }
    return false;
}

function bannerMatches(text: string | null | undefined): boolean {
    if (typeof text !== 'string' || text.length === 0) {
        return false;
    }
    return text.toLowerCase().indexOf('project is locked') !== -1;
}

export function detectProjectLocked(input: DetectInput): ProjectLockEvent | null {
    if (!input.workspaceId || !input.projectId) {
        return null;
    }
    let reason: ProjectLockReason | null = null;
    let detail = '';
    if (input.status === 423) {
        reason = 'api-423';
        detail = (input.body ?? '').slice(0, 500) || 'HTTP 423 Locked';
    } else if (bodyMatches(input.body)) {
        reason = 'api-body-locked';
        detail = (input.body ?? '').slice(0, 500);
    } else if (bannerMatches(input.bannerText)) {
        reason = 'dom-banner';
        detail = (input.bannerText ?? '').slice(0, 500);
    }
    if (reason === null) {
        return null;
    }
    return {
        WorkspaceId: input.workspaceId,
        ProjectId: input.projectId,
        DetectedAtMs: input.nowMs ?? Date.now(),
        Reason: reason,
        ReasonDetail: detail,
    };
}
