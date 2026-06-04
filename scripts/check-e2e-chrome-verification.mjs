#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const JSON_MODE = process.argv.includes('--json');

const requiredFiles = [
  'playwright.config.ts',
  'tests/e2e/fixtures.ts',
  'tests/e2e/global-setup.ts',
  '.github/workflows/ci.yml',
];

const checklist = [
  {
    id: 'popup-boot-status',
    label: 'Popup opens and displays boot/status content',
    files: ['tests/e2e/cold-start.spec.ts', 'tests/e2e/e2e-14-state-transitions.spec.ts'],
    patterns: [/openPopupPage|popupUrl|\{ popup \}/, /__PING__|GET_BOOT_DIAGNOSTICS|health-ping|state transition/i],
  },
  {
    id: 'options-tabs',
    label: 'Options page loads and exposes navigable sections',
    files: ['tests/e2e/e2e-02-project-crud.spec.ts', 'tests/e2e/e2e-19-options-crud.spec.ts'],
    patterns: [/openOptions|openOptionsPage|optionsUrl/, /Projects|Scripts|Configs|System|New Project/],
  },
  {
    id: 'project-crud',
    label: 'Project CRUD flow is covered',
    files: ['tests/e2e/e2e-02-project-crud.spec.ts'],
    patterns: [/Project CRUD|New Project|Project name/, /Create|Save project|Delete project/],
  },
  {
    id: 'script-injection',
    label: 'Script execution/injection is covered',
    files: ['tests/e2e/script-injection.spec.ts', 'tests/e2e/e2e-21-injection-pipeline-split.spec.ts'],
    patterns: [/INJECT_SCRIPTS|Injection Pipeline|executeScript/, /isSuccess|inlineSyntaxErrorDetected|preflight|result/],
  },
  {
    id: 'xpath-recorder',
    label: 'XPath recorder/capture flow is represented',
    files: ['tests/e2e/e2e-20-xpath-recorder.spec.ts', 'tests/e2e/e2e-21-xpath-capture.spec.ts', 'tests/e2e/e2e-22-recorder-xpath-batch.spec.ts'],
    patterns: [/XPath|recorder|Recorder/i, /capture|overlay|batch|Ctrl\+Shift\+R/i],
  },
  {
    id: 'diagnostic-export',
    label: 'Diagnostic/export flow is represented',
    files: ['tests/e2e/e2e-18-zip-export.spec.ts', 'src/test/import-export/sqlite-bundle-roundtrip.test.ts'],
    patterns: [/ZIP|JSON|export|bundle/i, /metadata|logs\.db|SQLite|roundtrip/i],
  },
  {
    id: 'context-menu-tab-state',
    label: 'Context menu / tab-state behavior is represented',
    files: ['tests/e2e/e2e-15-multi-tab.spec.ts', 'tests/e2e/e2e-23-multi-tab-sync.spec.ts'],
    patterns: [/Multi-Tab|tab/i, /context menu|active tab|sync|tracking|independent/i],
  },
  {
    id: 'hot-reload',
    label: 'Hot-reload/watch behavior is covered',
    files: ['tests/e2e/e2e-17-watch-mode.spec.ts'],
    patterns: [/hot-reload|watch|poller|new builds/i],
  },
  {
    id: 'headed-chromium-ci',
    label: 'CI runs headed Chromium under xvfb with extension loading',
    files: ['.github/workflows/ci.yml', 'playwright.config.ts'],
    patterns: [/xvfb-run|xvfb/i, /--load-extension|--disable-extensions-except/, /playwright test/],
  },
  {
    id: 'manifest-derived-navigation',
    label: 'Extension navigation uses manifest-derived helpers',
    files: ['tests/e2e/fixtures.ts', 'scripts/check-no-hardcoded-extension-paths.mjs', 'package.json'],
    patterns: [/action\?\.default_popup|options_ui\?\.page|popupUrl|optionsUrl/, /lint:e2e-paths|check-no-hardcoded-extension-paths/],
  },
];

function readRepoFile(file) {
  const abs = resolve(REPO_ROOT, file);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
}

function hasCoverage(item) {
  const sources = item.files
    .map((file) => ({ file, src: readRepoFile(file) }))
    .filter((entry) => entry.src !== null);
  if (sources.length === 0) {
    return {
      ok: false,
      reason: `CODE RED: no evidence files exist. Path(s): ${item.files.join(', ')}. Missing: checklist evidence. Reason: Chrome verification cannot be proven.`,
      filesPresent: [],
    };
  }
  const joined = sources.map((entry) => entry.src).join('\n');
  const missingPatterns = item.patterns
    .map((pattern) => pattern.toString())
    .filter((_, index) => !item.patterns[index].test(joined));
  return {
    ok: missingPatterns.length === 0,
    reason: missingPatterns.length === 0
      ? 'covered'
      : `Missing evidence pattern(s): ${missingPatterns.join(', ')}`,
    filesPresent: sources.map((entry) => entry.file),
  };
}

const missingRequired = requiredFiles.filter((file) => !existsSync(resolve(REPO_ROOT, file)));
const results = checklist.map((item) => ({ ...item, ...hasCoverage(item) }));
const failures = [
  ...missingRequired.map((file) => ({ id: 'required-file', label: file, reason: `CODE RED: required file missing at ${resolve(REPO_ROOT, file)}. Missing: ${file}. Reason: Chrome E2E verification gate cannot inspect it.` })),
  ...results.filter((item) => !item.ok),
];

const payload = {
  version: 1,
  ok: failures.length === 0,
  checkedAt: new Date(0).toISOString(),
  requiredFiles,
  checklist: results.map(({ id, label, ok, reason, filesPresent }) => ({ id, label, ok, reason, filesPresent })),
  failures: failures.map(({ id, label, reason }) => ({ id, label, reason })),
};

if (JSON_MODE) {
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  process.exit(payload.ok ? 0 : 1);
}

console.log('');
console.log('Chrome extension E2E verification gate');
console.log('─'.repeat(72));
for (const item of payload.checklist) {
  const mark = item.ok ? '✅' : '❌';
  console.log(`  ${mark} ${item.id} — ${item.label}`);
  if (!item.ok) console.log(`      ${item.reason}`);
}
console.log('─'.repeat(72));
if (payload.ok) {
  console.log(`  OK — ${payload.checklist.length} checklist item(s) covered by committed E2E/CI evidence.`);
  console.log('');
  process.exit(0);
}
console.error(`  FAILED — ${payload.failures.length} verification gap(s).`);
for (const failure of payload.failures) {
  console.error(`  - ${failure.id}: ${failure.reason}`);
}
console.error('');
process.exit(1);
