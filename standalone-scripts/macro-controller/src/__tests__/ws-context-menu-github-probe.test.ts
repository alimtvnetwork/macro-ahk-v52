/**
 * Issue 129 Step 4 — Right-click "GitHub" menu wired to progress-probe.
 *
 * Static source assertions guarantee the wire-up survives refactors:
 *   - ws-context-menu.ts imports resolveConnection from gitsync/progress-probe.
 *   - buildDynamicGithubItem(...) exists.
 *   - The three label states (Open / Connect / Syncing) are rendered.
 *   - Probe result with connected=true persists to gitsync-cache ('found').
 *
 * Honors mem://preferences/test-with-features.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
    resolve(__dirname, '..', 'ws-context-menu.ts'),
    'utf8',
);

describe('ws-context-menu — GitHub probe wire-up (Issue 129 Step 4)', () => {
    it('imports resolveConnection from gitsync/progress-probe', () => {
        expect(SRC).toMatch(/from\s+'\.\/gitsync\/progress-probe'/);
        expect(SRC).toMatch(/import\s*\{\s*resolveConnection\s*\}/);
    });

    it('defines buildDynamicGithubItem helper', () => {
        expect(SRC).toMatch(/function\s+buildDynamicGithubItem\s*\(/);
    });

    it('appendRemixAndGithubItems uses the dynamic helper (not a static Open item)', () => {
        expect(SRC).toMatch(/menu\.appendChild\(buildDynamicGithubItem\(/);
        // Legacy static "🐙 Open GitHub repo" appendChild line must be gone.
        expect(SRC).not.toMatch(
            /menu\.appendChild\(buildCtxMenuItem\('🐙 Open GitHub repo'/,
        );
    });

    it('renders all three probe-driven label states', () => {
        expect(SRC).toContain('🐙 GitHub: checking…');
        expect(SRC).toContain('🐙 Open GitHub repo');
        expect(SRC).toContain('🔗 Connect GitHub repo');
        expect(SRC).toContain('⏳ GitHub syncing…');
    });

    it('persists found probe result into gitsync-cache', () => {
        // applyConnected path must call setGitsyncCache(... 'found', url)
        expect(SRC).toMatch(/setGitsyncCache\([^)]*'found'[^)]*\)/);
    });

    it('handles deadline branch as syncing', () => {
        expect(SRC).toMatch(/state\.reason\s*===\s*'deadline'/);
        expect(SRC).toMatch(/applySyncing\(/);
    });

    it('falls back to Connect state on probe errors', () => {
        expect(SRC).toMatch(/catch\s*\([^)]*\)\s*\{[\s\S]*?applyConnect\(/);
    });
});
