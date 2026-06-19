/**
 * Unit guard for the macro-controller content-script harness.
 *
 * The harness ships with hand-rolled chrome.* stubs and a Code-Red error
 * message for the missing-bundle case. Both are easy to break silently
 * because they only execute under Playwright. This test pins:
 *
 *   1. The chrome-stub source includes runtime/storage/tabs surfaces the
 *      macro-controller boot path requires (mem://architecture/injection-context-awareness).
 *   2. The missing-bundle error names the exact path + reason
 *      (mem://constraints/file-path-error-logging-code-red.md).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const HARNESS = resolve(REPO_ROOT, 'tests/e2e/utils/macro-controller-harness.ts');
const SHELL = resolve(REPO_ROOT, 'tests/e2e/fixtures/lovable-shell.html');

test('harness module ships at the expected path', () => {
    assert.ok(existsSync(HARNESS), `missing harness: ${HARNESS}`);
    assert.ok(existsSync(SHELL), `missing shell: ${SHELL}`);
});

test('chrome stub exposes runtime/storage/tabs surfaces required by the boot path', () => {
    const src = readFileSync(HARNESS, 'utf8');
    for (const needle of [
        'chrome.runtime',
        'chrome.storage',
        'chrome.tabs',
        'getManifest',
        'sendMessage',
        'storage.local',
        'onChanged',
    ]) {
        assert.ok(src.includes(needle), `chrome stub missing surface: ${needle}`);
    }
});

test('page stub exposes auth token and marco SDK surfaces required by the bundle boot path', () => {
    const src = readFileSync(HARNESS, 'utf8');
    for (const needle of [
        'marco_bearer_token',
        'lovable-session-id',
        'marco_token_saved_at',
        'window.marco.authUtils',
        'normalizeBearerToken',
        'isUsableToken',
        'window.marco.api.credits',
        'fetchWorkspaces',
        'fetchBalance',
        '/workspaces/',
        '/credit-balance',
        'window.marco.api.workspace',
        'markViewed',
    ]) {
        assert.ok(src.includes(needle), `page stub missing auth/SDK surface: ${needle}`);
    }
});

test('missing-bundle error follows Code-Red format (path + reason)', () => {
    const src = readFileSync(HARNESS, 'utf8');
    assert.match(src, /Missing IIFE bundle/, 'must name the missing artifact');
    assert.match(src, /path: \$\{bundlePath\}/, 'must include the exact path');
    assert.match(src, /reason:/, 'must include a reason string');
    assert.match(src, /build:macro-controller/, 'must point at the build script');
});

test('shell HTML provides workspace rows + project title testids', () => {
    const html = readFileSync(SHELL, 'utf8');
    assert.match(html, /data-testid="project-title"/);
    assert.match(html, /data-testid="workspace-sidebar"/);
    for (const id of ['ktlo-team', 'free-team', 'cancelled-team']) {
        assert.ok(html.includes(`data-workspace-id="${id}"`), `shell missing workspace row: ${id}`);
    }
});
