/**
 * Workspace badge tone test — Issue 125 Task 10 / §2.4.
 *
 * Asserts the classifier-to-tone resolver produces the spec-mandated
 * distinct tokens per badge kind. Regression guard for the bug where
 * `expire-soon` rendered with the same critical red as `expired-hard`
 * and `canceled` risked drifting back to a red palette.
 */

import { describe, it, expect } from 'vitest';
import {
    WORKSPACE_BADGE_DISPLAY,
    type WorkspaceDisplayKind,
} from '../workspace-display-status';
import {
    resolveBadgeStyle,
    styleContainsRedPalette,
} from '../workspace-badge-styles';

function toneFor(kind: WorkspaceDisplayKind): string {
    return WORKSPACE_BADGE_DISPLAY[kind].tone;
}

describe('workspace badge tone resolver — Issue 125 §2.4', () => {
    it('expire-soon → amber (warning), NOT critical red', () => {
        expect(toneFor('expire-soon')).toBe('warning');
        const style = resolveBadgeStyle('warning');
        expect(styleContainsRedPalette(style)).toBe(false);
    });

    it('canceled → muted gray, NEVER red', () => {
        expect(toneFor('canceled')).toBe('muted');
        const style = resolveBadgeStyle('muted');
        expect(styleContainsRedPalette(style)).toBe(false);
    });

    it('expired → muted red-orange, NOT pure red (orange tone)', () => {
        expect(toneFor('expired')).toBe('orange');
        const style = resolveBadgeStyle('orange');
        // Orange tone is allowed to share NO red-palette fragment.
        expect(styleContainsRedPalette(style)).toBe(false);
    });

    it('expired-hard remains critical red (danger tone) for ≥ grace-window cases', () => {
        expect(toneFor('expired-hard')).toBe('danger');
        const style = resolveBadgeStyle('danger');
        expect(styleContainsRedPalette(style)).toBe(true);
    });

    it('past-due-expiring → amber (warning)', () => {
        expect(toneFor('past-due-expiring')).toBe('warning');
    });

    it('refill-soon → info (sky), unchanged', () => {
        expect(toneFor('refill-soon')).toBe('info');
    });

    it('normal → none (no badge)', () => {
        expect(toneFor('normal')).toBe('none');
        const style = resolveBadgeStyle('none');
        expect(style.bg).toBe('transparent');
    });

    it('every badge kind that visually expires uses a DISTINCT tone from expired-hard except past-due-expiring', () => {
        // expire-soon and expired must NOT collide with expired-hard's
        // critical red — that was the original bug.
        expect(toneFor('expire-soon')).not.toBe(toneFor('expired-hard'));
        expect(toneFor('expired')).not.toBe(toneFor('expired-hard'));
        expect(toneFor('canceled')).not.toBe(toneFor('expired-hard'));
    });
});
