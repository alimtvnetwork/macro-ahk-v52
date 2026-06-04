/**
 * Macro-controller content-script harness for E2E (Option A from
 * `.lovable/question-and-ambiguity/61-credit-totals-content-script-harness.md`).
 *
 * Mounts the production macro-controller IIFE bundle inside a Playwright page
 * that *pretends* to be `https://lovable.dev/projects/<id>` without touching
 * real lovable.dev (auth, network, account state, anti-bot). Specifically:
 *
 *   1. Routes `https://lovable.dev/projects/<id>` to the local
 *      `fixtures/lovable-shell.html` payload.
 *   2. addInitScript installs a `chrome.runtime`/`chrome.storage`/`chrome.tabs`
 *      stub *before* any page script runs, so the bundle's MAIN-world guards
 *      (`mem://architecture/injection-context-awareness`) succeed.
 *   3. After the shell loads, addScriptTag injects the IIFE bundle directly
 *      from disk, mirroring what the 7-stage injector does in production
 *      (`mem://architecture/script-injection-lifecycle`).
 *
 * Network stubs for `/credit-balance`, `/workspaces`, etc. are layered on top
 * via `installCreditBalanceStub` — the harness only handles bootstrapping.
 *
 * Limitations (intentional):
 *   - No SQLite OPFS persistence; chrome.storage.local is an in-memory Map.
 *   - No service-worker. Messaging round-trips resolve synchronously.
 *   - Single project/workspace context per page.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { BrowserContext, Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const SHELL_HTML_PATH = path.resolve(__dirname, '../fixtures/lovable-shell.html');
const BUNDLE_PATH = path.resolve(
    REPO_ROOT,
    'standalone-scripts/macro-controller/dist/macro-looping.js',
);

export interface HarnessOptions {
    /** Project id reflected in the simulated URL (`/projects/<projectId>`). */
    projectId?: string;
    /** Override the bundle path. Defaults to the production IIFE output. */
    bundlePath?: string;
    /**
     * Skip the IIFE injection step. Useful for tests that only need the
     * simulated lovable.dev page + chrome.* stubs (e.g. asserting the
     * harness contract itself before the macro bundle boots).
     */
    skipBundle?: boolean;
}

export interface HarnessHandle {
    page: Page;
    /** Resolved bundle path actually injected, or null when skipBundle=true. */
    bundlePath: string | null;
    /**
     * Page-script error captured during bundle injection, if any. Tests can
     * assert this is null when the bundle is expected to boot cleanly, or
     * inspect it during regression triage. The harness never throws on
     * bundle exceptions itself — that would mask the real failure.
     */
    bundleError: Error | null;
}

/**
 * Builds the chrome.* surface the macro-controller relies on during boot.
 * Kept as a stringified init-script so it runs in the page context before
 * any other code, matching how Chrome itself exposes `chrome`.
 */
function buildChromeStubSource(extensionId: string): string {
    // NOTE: This source executes inside the page — no closures over harness state.
    return `(() => {
        if (window.chrome && window.chrome.runtime && window.chrome.runtime.id) return;
        const storageBacking = new Map();
        const wrap = (area) => ({
            get(keys, cb) {
                const out = {};
                const wanted = !keys ? [...storageBacking.keys()]
                    : Array.isArray(keys) ? keys
                    : typeof keys === 'string' ? [keys]
                    : Object.keys(keys);
                for (const k of wanted) {
                    if (storageBacking.has(k)) out[k] = storageBacking.get(k);
                    else if (keys && typeof keys === 'object' && !Array.isArray(keys)) out[k] = keys[k];
                }
                const result = Promise.resolve(out);
                if (typeof cb === 'function') result.then(cb);
                return result;
            },
            set(items, cb) {
                for (const [k, v] of Object.entries(items || {})) storageBacking.set(k, v);
                const result = Promise.resolve();
                if (typeof cb === 'function') result.then(cb);
                return result;
            },
            remove(keys, cb) {
                const list = Array.isArray(keys) ? keys : [keys];
                for (const k of list) storageBacking.delete(k);
                const result = Promise.resolve();
                if (typeof cb === 'function') result.then(cb);
                return result;
            },
            clear(cb) {
                storageBacking.clear();
                const result = Promise.resolve();
                if (typeof cb === 'function') result.then(cb);
                return result;
            },
        });
        const noopEvent = { addListener() {}, removeListener() {}, hasListener: () => false };
        window.chrome = {
            runtime: {
                id: ${JSON.stringify(extensionId)},
                getURL: (p) => 'chrome-extension://${extensionId}/' + String(p || '').replace(/^\\//, ''),
                getManifest: () => ({ manifest_version: 3, name: 'macro-controller-harness', version: '0.0.0-e2e' }),
                sendMessage: (_msg, cb) => { const r = Promise.resolve(undefined); if (typeof cb === 'function') r.then(cb); return r; },
                onMessage: noopEvent,
                onInstalled: noopEvent,
                lastError: undefined,
            },
            storage: { local: wrap('local'), session: wrap('session'), sync: wrap('sync'), onChanged: noopEvent },
            tabs: {
                query: (_q, cb) => { const r = Promise.resolve([{ id: 1, url: location.href }]); if (typeof cb === 'function') r.then(cb); return r; },
                sendMessage: (_id, _msg, cb) => { const r = Promise.resolve(undefined); if (typeof cb === 'function') r.then(cb); return r; },
                onUpdated: noopEvent, onRemoved: noopEvent, onActivated: noopEvent,
            },
            scripting: { executeScript: () => Promise.resolve([]) },
        };
    })();`;
}

/**
 * Mount the macro-controller IIFE on a fake lovable.dev page.
 *
 * Throws (no retry, no backoff — per the no-retry policy) with the exact path
 * if the prebuilt bundle is missing. The caller's E2E setup is responsible for
 * having run `npm run build:macro-controller` before tests execute.
 */
export async function mountMacroControllerHarness(
    context: BrowserContext,
    opts: HarnessOptions = {},
): Promise<HarnessHandle> {
    const projectId = opts.projectId ?? 'e2e-harness-project';
    const bundlePath = opts.bundlePath ?? BUNDLE_PATH;
    const skipBundle = opts.skipBundle === true;

    let bundleSource = '';
    if (!skipBundle) {
        // Code-Red: surface the exact missing path + reason per
        // `mem://constraints/file-path-error-logging-code-red.md`.
        try {
            await fs.access(bundlePath);
        } catch (cause) {
            throw new Error(
                `[macro-controller-harness] Missing IIFE bundle.\n` +
                `  path: ${bundlePath}\n` +
                `  reason: file not found — run \`npm run build:macro-controller\` first.\n` +
                `  cause: ${(cause as Error)?.message ?? String(cause)}`,
            );
        }
        bundleSource = await fs.readFile(bundlePath, 'utf8');
    }

    const shellHtml = await fs.readFile(SHELL_HTML_PATH, 'utf8');

    const targetUrl = `https://lovable.dev/projects/${encodeURIComponent(projectId)}`;
    // Use any installed extension id if Chromium exposes one — falls back to a
    // stable fake id so chrome.runtime.getURL stays deterministic in logs.
    const extensionId = context.serviceWorkers()[0]?.url().split('/')[2] ?? 'e2eharnessextensionid000000000000';

    // 1. Inject chrome.* stubs before *any* document scripts run.
    await context.addInitScript(buildChromeStubSource(extensionId));

    // 2. Route the simulated lovable.dev URL to our local shell.
    await context.route(targetUrl, async (route) => {
        await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: shellHtml });
    });

    // 3. Navigate and (optionally) inject the bundle. addScriptTag with
    //    `content` keeps the script's origin as the page (not file://), so
    //    MAIN-world guards see `location.hostname === 'lovable.dev'`.
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    let bundleError: Error | null = null;
    if (!skipBundle) {
        // Capture page-script errors thrown during bundle boot WITHOUT failing
        // the harness — the calling test decides whether bundleError is fatal.
        const errorPromise = new Promise<Error | null>((resolve) => {
            const onPageError = (err: Error): void => { resolve(err); };
            page.once('pageerror', onPageError);
            // Resolve to null on next tick if no error fires.
            setTimeout(() => { page.off('pageerror', onPageError); resolve(null); }, 0);
        });
        await page.addScriptTag({ content: bundleSource });
        bundleError = await errorPromise;
    }

    return { page, bundlePath: skipBundle ? null : bundlePath, bundleError };
}
