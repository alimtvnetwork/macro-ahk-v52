/**
 * Unit tests — project-lock/detector (Issue 124 §2.4).
 */

import { describe, expect, it } from 'vitest';
import { detectProjectLocked } from '../detector';

const WS = 'ws-1';
const PROJ = 'proj-1';

describe('detectProjectLocked', () => {
    it('recognises HTTP 423 Locked', () => {
        const ev = detectProjectLocked({ workspaceId: WS, projectId: PROJ, status: 423, body: '', nowMs: 100 });
        expect(ev).not.toBeNull();
        expect(ev?.Reason).toBe('api-423');
        expect(ev?.WorkspaceId).toBe(WS);
        expect(ev?.ProjectId).toBe(PROJ);
        expect(ev?.DetectedAtMs).toBe(100);
    });

    it('recognises body containing "project_locked"', () => {
        const body = '{"error":"project_locked","message":"try again"}';
        const ev = detectProjectLocked({ workspaceId: WS, projectId: PROJ, status: 409, body });
        expect(ev?.Reason).toBe('api-body-locked');
        expect(ev?.ReasonDetail).toBe(body);
    });

    it('recognises body containing "project is locked" (case insensitive)', () => {
        const ev = detectProjectLocked({ workspaceId: WS, projectId: PROJ, status: 409, body: 'Project IS Locked right now' });
        expect(ev?.Reason).toBe('api-body-locked');
    });

    it('recognises DOM banner text', () => {
        const ev = detectProjectLocked({ workspaceId: WS, projectId: PROJ, status: 200, body: '', bannerText: 'This project is locked by another user' });
        expect(ev?.Reason).toBe('dom-banner');
    });

    it('returns null on success responses with no lock signal', () => {
        expect(detectProjectLocked({ workspaceId: WS, projectId: PROJ, status: 200, body: '{"ok":true}' })).toBeNull();
    });

    it('returns null on missing workspaceId / projectId', () => {
        expect(detectProjectLocked({ workspaceId: '', projectId: PROJ, status: 423 })).toBeNull();
        expect(detectProjectLocked({ workspaceId: WS, projectId: '', status: 423 })).toBeNull();
    });

    it('prioritises HTTP 423 over body matching', () => {
        const ev = detectProjectLocked({ workspaceId: WS, projectId: PROJ, status: 423, body: 'project_locked' });
        expect(ev?.Reason).toBe('api-423');
    });
});
