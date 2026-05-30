/**
 * project-lock — shared types (Issue 124 §2.4).
 */

export type ProjectLockReason = 'api-423' | 'api-body-locked' | 'dom-banner';

export interface ProjectLockEvent {
    readonly WorkspaceId: string;
    readonly ProjectId: string;
    readonly DetectedAtMs: number;
    readonly Reason: ProjectLockReason;
    readonly ReasonDetail: string;
}

/** Optional DOM banner XPath; not yet discovered (see spec §3). */
export const LOCKED_BANNER_XPATH: string | null = null;
