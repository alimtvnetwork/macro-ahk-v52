/**
 * Issue 129 Step 6 — Remix new-project cache.
 *
 * Verifies:
 *   - buildRemixRow produces a complete PascalCase row.
 *   - persistRemixNewProject writes to marco.kv with the correct key/JSON.
 *   - read returns the parsed row; clear deletes the key.
 *   - Missing kv / missing fields fail safely (no throw).
 *   - submitRemix wiring (static-source assertion).
 *
 * Honors mem://preferences/test-with-features.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface KvCall { op: string; key: string; value?: string }
const calls: KvCall[] = [];
const store = new Map<string, string>();

function installKv(): void {
    (globalThis as unknown as { window: unknown }).window = {
        marco: {
            kv: {
                get: async (key: string) => {
                    calls.push({ op: 'get', key });
                    return store.get(key) ?? null;
                },
                set: async (key: string, value: string) => {
                    calls.push({ op: 'set', key, value });
                    store.set(key, value);
                },
                delete: async (key: string) => {
                    calls.push({ op: 'delete', key });
                    store.delete(key);
                },
            },
        },
    };
}

vi.mock('../error-utils', () => ({ logError: () => {} }));
vi.mock('../logging', () => ({ log: () => {} }));

beforeEach(() => {
    calls.length = 0;
    store.clear();
});

describe('remix new-project cache', () => {
    it('builds a complete PascalCase row', async () => {
        installKv();
        const { buildRemixRow } = await import('../remix/new-project-cache');
        const row = buildRemixRow({
            sourceProjectId: 'src-1',
            newProjectId: 'new-1',
            redirectUrl: 'https://lovable.dev/projects/new-1',
            workspaceId: 'ws-1',
            projectName: 'My Remix',
        }, 1_700_000_000_000);
        expect(row).toEqual({
            SourceProjectId: 'src-1',
            NewProjectId: 'new-1',
            RedirectUrl: 'https://lovable.dev/projects/new-1',
            WorkspaceId: 'ws-1',
            ProjectName: 'My Remix',
            RemixedAtMs: 1_700_000_000_000,
        });
    });

    it('persists, reads, and clears under MacroRemixNewProject:{sourceId}', async () => {
        installKv();
        const mod = await import('../remix/new-project-cache');
        const ok = await mod.persistRemixNewProject({
            sourceProjectId: 'src-2',
            newProjectId: 'new-2',
            redirectUrl: 'https://lovable.dev/projects/new-2',
            workspaceId: 'ws-2',
            projectName: 'Test',
        });
        expect(ok).toBe(true);
        const setCall = calls.find(c => c.op === 'set');
        expect(setCall?.key).toBe('MacroRemixNewProject:src-2');
        const parsed = JSON.parse(setCall?.value ?? '{}');
        expect(parsed.SourceProjectId).toBe('src-2');
        expect(parsed.NewProjectId).toBe('new-2');

        const row = await mod.readRemixNewProject('src-2');
        expect(row?.NewProjectId).toBe('new-2');

        await mod.clearRemixNewProject('src-2');
        expect(await mod.readRemixNewProject('src-2')).toBeNull();
    });

    it('refuses to persist when required fields are blank', async () => {
        installKv();
        const { persistRemixNewProject } = await import('../remix/new-project-cache');
        const ok = await persistRemixNewProject({
            sourceProjectId: '',
            newProjectId: 'x',
            redirectUrl: 'y',
            workspaceId: 'z',
            projectName: 'n',
        });
        expect(ok).toBe(false);
        expect(calls.length).toBe(0);
    });

    it('returns false safely when marco.kv is unavailable', async () => {
        (globalThis as unknown as { window: unknown }).window = { marco: {} };
        const { persistRemixNewProject } = await import('../remix/new-project-cache');
        const ok = await persistRemixNewProject({
            sourceProjectId: 's', newProjectId: 'n', redirectUrl: 'u',
            workspaceId: 'w', projectName: 'p',
        });
        expect(ok).toBe(false);
    });

    it('remix-fetch.ts wires persistRemixNewProject after successful submitRemix', () => {
        const src = readFileSync(
            resolve(__dirname, '..', 'remix-fetch.ts'),
            'utf8',
        );
        expect(src).toMatch(/from\s+'\.\/remix\/new-project-cache'/);
        expect(src).toMatch(/persistRemixNewProject\(/);
        // Must be awaited (no fire-and-forget).
        expect(src).toMatch(/await\s+persistRemixNewProject\(/);
        // Must be guarded by newProjectId && redirectUrl truthy check.
        expect(src).toMatch(/newProjectId\s*&&\s*redirectUrl/);
    });
});
