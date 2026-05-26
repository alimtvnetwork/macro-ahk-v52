import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright Global Setup — Chrome Extension
 *
 * Runs once before all tests:
 *   1. Builds the extension into chrome-extension/ (vite.config.extension.ts DIST_DIR)
 *   2. Validates manifest.json structure
 *
 * Enable in playwright.config.ts:
 *   globalSetup: './tests/e2e/global-setup.ts'
 */

// IMPORTANT: this MUST stay in sync with vite.config.extension.ts (`DIST_DIR`).
// We probe both `chrome-extension/` (current) and `dist/` (legacy) so the setup
// keeps working through any future rename — first match wins.
const EXTENSION_CANDIDATES = [
  path.resolve(__dirname, '../../chrome-extension'),
  path.resolve(__dirname, '../../dist'),
];
function pickExtensionDir(): string {
  for (const dir of EXTENSION_CANDIDATES) {
    if (existsSync(path.join(dir, 'manifest.json'))) return dir;
  }
  return EXTENSION_CANDIDATES[0];
}
const EXTENSION_DIR = pickExtensionDir();

const REQUIRED_MANIFEST_KEYS = [
  'manifest_version',
  'name',
  'version',
  'permissions',
] as const;

const REQUIRED_PERMISSIONS = [
  'storage',
  'cookies',
  'scripting',
  'activeTab',
];

async function globalSetup() {
  console.log('\n🔨 Building extension…');

  const repoRoot = path.resolve(__dirname, '../..');

  // Detect package manager: composite scripts (e.g. build:macro-controller) call `pnpm run …`
  // internally, so we prefer pnpm when available and fall back to npm otherwise.
  const pm = (() => {
    try {
      execSync('pnpm --version', { stdio: 'ignore' });
      return 'pnpm';
    } catch {
      return 'npm';
    }
  })();
  console.log(`📦 Using package manager: ${pm}`);

  // build:extension requires every standalone dist artifact checked by
  // scripts/check-standalone-dist.mjs to already exist on disk. CI builds them in parallel jobs; for local/playwright runs we
  // must build them sequentially first, then run the extension build.
  const buildSteps: { label: string; script: string; timeout: number }[] = [
    { label: 'marco-sdk',        script: 'build:sdk',              timeout: 180_000 },
    { label: 'xpath',            script: 'build:xpath',            timeout: 180_000 },
    { label: 'payment-banner-hider', script: 'build:payment-banner-hider', timeout: 180_000 },
    { label: 'lovable-common',   script: 'build:lovable-common',   timeout: 180_000 },
    { label: 'lovable-owner-switch', script: 'build:lovable-owner-switch', timeout: 180_000 },
    { label: 'lovable-user-add',  script: 'build:lovable-user-add', timeout: 180_000 },
    { label: 'lovable-dashboard', script: 'build:lovable-dashboard', timeout: 180_000 },
    { label: 'macro-controller', script: 'build:macro-controller', timeout: 240_000 },
    { label: 'extension',        script: 'build:extension',        timeout: 240_000 },
  ];

  for (const step of buildSteps) {
    const cmd = `${pm} run ${step.script}`;
    console.log(`\n→ Building ${step.label} (${cmd})…`);
    try {
      execSync(cmd, {
        cwd: repoRoot,
        stdio: 'inherit',
        timeout: step.timeout,
      });
    } catch (err) {
      throw new Error(
        `Build step "${step.label}" failed (command: ${cmd}).\n` +
        `Ensure the corresponding npm script exists in package.json and that prior steps produced their dist/ output.\n${err}`
      );
    }

    // Per-step dist verification — catches the case where the build
    // command exits 0 but the expected primary bundle is missing
    // (CI run #45 regression: lovable-dashboard.js absent after a
    // green build:lovable-dashboard, surfaced 2 steps later inside
    // `build:extension > check-standalone-dist.mjs` with no breadcrumb
    // to the silent step).
    const expectedBundle: Record<string, { dir: string; file: string }> = {
      'marco-sdk':            { dir: 'standalone-scripts/marco-sdk/dist',            file: 'marco-sdk.js' },
      'xpath':                { dir: 'standalone-scripts/xpath/dist',                file: 'xpath.js' },
      'payment-banner-hider': { dir: 'standalone-scripts/payment-banner-hider/dist', file: 'payment-banner-hider.js' },
      'lovable-common':       { dir: 'standalone-scripts/lovable-common/dist',       file: 'lovable-common.js' },
      'lovable-owner-switch': { dir: 'standalone-scripts/lovable-owner-switch/dist', file: 'lovable-owner-switch.js' },
      'lovable-user-add':     { dir: 'standalone-scripts/lovable-user-add/dist',     file: 'lovable-user-add.js' },
      'lovable-dashboard':    { dir: 'standalone-scripts/lovable-dashboard/dist',    file: 'lovable-dashboard.js' },
      'macro-controller':     { dir: 'standalone-scripts/macro-controller/dist',     file: 'macro-looping.js' },
    };
    const want = expectedBundle[step.label];
    if (want) {
      const abs = path.join(repoRoot, want.dir, want.file);
      if (!existsSync(abs)) {
        throw new Error(
          `Build step "${step.label}" exited 0 but expected bundle is MISSING.\n` +
          `  missing item: ${want.file}\n` +
          `  expected path: ${abs}\n` +
          `  Reason=BuildOutputMissing; ReasonDetail=tsc/vite reported success without emitting the IIFE bundle. ` +
          `Re-run with STANDALONE_BUILD_NO_CACHE=1 to bypass cached-build.mjs cache and inspect vite output.`
        );
      }
      const { statSync } = await import('fs');
      const sz = statSync(abs).size;
      if (sz < 100) {
        throw new Error(
          `Build step "${step.label}" produced a suspiciously small bundle (${sz} bytes).\n` +
          `  path: ${abs}\n` +
          `  Reason=BuildOutputEmpty; ReasonDetail=vite output is below the 100-byte sanity threshold.`
        );
      }
      console.log(`   ✓ ${step.label} produced ${want.file} (${sz} bytes)`);
    }
  }


  // Step 2: Re-resolve extension dir AFTER the build (build:extension may have created it).
  const builtDir = pickExtensionDir();
  const builtManifest = path.join(builtDir, 'manifest.json');
  if (!existsSync(builtDir) || !existsSync(builtManifest)) {
    throw new Error(
      `Build output missing.\n` +
      `Expected manifest.json at one of: ${EXTENSION_CANDIDATES.map(d => path.join(d, 'manifest.json')).join(', ')}.\n` +
      `Reason: vite.config.extension.ts emits to chrome-extension/; ensure DIST_DIR matches.`
    );
  }

  console.log('📋 Validating manifest.json…');

  let manifest: Record<string, unknown>;
  try {
    const raw = readFileSync(builtManifest, 'utf-8');
    manifest = JSON.parse(raw);
  } catch (err) {
    throw new Error(`manifest.json is not valid JSON: ${err}`);
  }

  // Required top-level keys
  for (const key of REQUIRED_MANIFEST_KEYS) {
    if (!(key in manifest)) {
      throw new Error(`manifest.json missing required key: "${key}"`);
    }
  }

  // MV3 check
  if (manifest.manifest_version !== 3) {
    throw new Error(
      `Expected manifest_version 3, got ${manifest.manifest_version}`
    );
  }

  // Required permissions
  const permissions = manifest.permissions as string[] | undefined;
  if (!Array.isArray(permissions)) {
    throw new Error('manifest.json "permissions" must be an array');
  }

  const missing = REQUIRED_PERMISSIONS.filter(p => !permissions.includes(p));
  if (missing.length > 0) {
    throw new Error(
      `manifest.json missing required permissions: ${missing.join(', ')}`
    );
  }

  // Service worker background
  const background = manifest.background as Record<string, unknown> | undefined;
  if (!background?.service_worker) {
    console.warn('⚠️  manifest.json has no background.service_worker — SW rehydration tests will fail');
  }

  console.log(
    `✅ Extension ready: ${manifest.name} v${manifest.version} (MV${manifest.manifest_version})\n`
  );
}

export default globalSetup;
