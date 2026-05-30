/**
 * Unit tests — loop-run-state (Issue 124).
 *
 * Verifies that isRunActive/isRunIdle correctly read the composer state
 * via XPath, and that waitForRunIdle polls without ever clicking the
 * Submit / STOP button.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    SEND_ICON_SVG_PATH_PREFIX,
    STOP_ICON_SVG_PATH_PREFIX,
    SUBMIT_BUTTON_ID,
} from '../selectors';
import { isRunActive, isRunIdle, waitForRunIdle } from '../index';

function mountComposer(opts: { submit: boolean; iconPath: string | null }): HTMLElement {
    const root = document.createElement('div');
    root.id = 'composer-test-root';
    if (opts.submit) {
        const btn = document.createElement('button');
        btn.id = SUBMIT_BUTTON_ID;
        btn.type = 'submit';
        if (opts.iconPath !== null) {
            const span = document.createElement('span');
            span.setAttribute('data-button-content', 'true');
            span.innerHTML = '<svg><path d="' + opts.iconPath + ' rest"/></svg>';
            btn.appendChild(span);
        }
        root.appendChild(btn);
    }
    document.body.appendChild(root);
    return root;
}

afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
});

describe('loop-run-state.isRunActive / isRunIdle', () => {
    it('idle: submit present with Send-arrow icon → isRunIdle true', () => {
        mountComposer({ submit: true, iconPath: SEND_ICON_SVG_PATH_PREFIX });
        expect(isRunIdle()).toBe(true);
        expect(isRunActive()).toBe(false);
    });

    it('running: submit button absent (composer hides it) → isRunActive true', () => {
        // No submit button mounted at all.
        expect(isRunActive()).toBe(true);
        expect(isRunIdle()).toBe(false);
    });

    it('detector never clicks the composer Submit button', () => {
        const root = mountComposer({ submit: true, iconPath: SEND_ICON_SVG_PATH_PREFIX });
        const btn = root.querySelector<HTMLButtonElement>('#' + SUBMIT_BUTTON_ID);
        const clickSpy = vi.fn();
        btn?.addEventListener('click', clickSpy);
        isRunActive();
        isRunIdle();
        expect(clickSpy).not.toHaveBeenCalled();
    });
});

describe('loop-run-state.waitForRunIdle', () => {
    it('resolves immediately when composer is already idle', async () => {
        mountComposer({ submit: true, iconPath: SEND_ICON_SVG_PATH_PREFIX });
        await expect(waitForRunIdle({ timeoutMs: 50, pollMs: 10 })).resolves.toBeUndefined();
    });

    it('rejects on timeout when run never goes idle', async () => {
        // No submit button mounted → permanently active.
        await expect(waitForRunIdle({ timeoutMs: 30, pollMs: 10 })).rejects.toThrow(/timeout/);
    });

    it('resolves once the submit button reappears (running → idle)', async () => {
        // Start active (no button), then mount idle composer after 20ms.
        const promise = waitForRunIdle({ timeoutMs: 200, pollMs: 10 });
        setTimeout(() => {
            mountComposer({ submit: true, iconPath: SEND_ICON_SVG_PATH_PREFIX });
        }, 20);
        await expect(promise).resolves.toBeUndefined();
    });
});

// Ensure the STOP icon prefix constant is what the spec mandates — guards
// against accidental edits in selectors.ts.
describe('loop-run-state.selectors', () => {
    it('STOP/SEND svg path prefixes match the spec', () => {
        expect(STOP_ICON_SVG_PATH_PREFIX).toBe('M20.75 17');
        expect(SEND_ICON_SVG_PATH_PREFIX).toBe('M11 19V7.415');
    });
});
