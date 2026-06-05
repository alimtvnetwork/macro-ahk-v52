#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { ACCEPTANCE_EXEMPT_RE, getAcceptanceFailure } from './acceptance-contract.mjs';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const APPLY_ARG = '--apply';
const AUDIT_FOOTER_RE = /\n---\n\n<!-- audit: numeric constants source-of-truth -->[\s\S]*$/;
const HEADING_RE = /^#\s+(.+)$/m;
const ACCEPTANCE_HEADING_RE = /^##\s+Acceptance\b.*$/m;
const CHECK_COMMAND = 'node scripts/audit/check-acceptance.mjs --root=spec/2026-spec';
const SPEC_ROOT = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const isApply = process.argv.includes(APPLY_ARG);

function processFile(filePath) {
  if (ACCEPTANCE_EXEMPT_RE.test(filePath)) {
    return [];
  }

  const fileText = readFileSync(filePath, 'utf8');
  const missingItem = getAcceptanceFailure(fileText);
  if (missingItem === '') {
    return [];
  }

  const nextText = buildNextText(filePath, fileText, missingItem);
  if (isApply) {
    writeFileSync(filePath, nextText);
  }

  return [filePath];
}

function buildNextText(filePath, fileText, missingItem) {
  const block = buildAcceptanceBlock(filePath, fileText);
  if (missingItem === 'machine-checkable bullet (- [ ])') {
    return addBulletsToExistingSection(fileText, block);
  }

  return appendAcceptanceSection(fileText, block);
}

function buildAcceptanceBlock(filePath, fileText) {
  const title = extractTitle(filePath, fileText);
  const context = resolveContext(filePath);

  return [
    '## Acceptance',
    '',
    `- [ ] The implementation satisfies the \`${title}\` contract in this file and the folder-level acceptance target: ${context.summary}.`,
    `- [ ] Verification passes when \`${context.proof}\` passes, and \`${CHECK_COMMAND}\` reports this file has a machine-checkable acceptance contract.`,
  ].join('\n');
}

function addBulletsToExistingSection(fileText, block) {
  const bullets = block.split('\n').slice(2).join('\n');

  return fileText.replace(ACCEPTANCE_HEADING_RE, (heading) => `${heading}\n\n${bullets}`);
}

function appendAcceptanceSection(fileText, block) {
  const text = fileText.trimEnd();
  const footerMatch = text.match(AUDIT_FOOTER_RE);
  if (footerMatch?.index !== undefined) {
    return `${text.slice(0, footerMatch.index).trimEnd()}\n\n${block}\n${footerMatch[0]}`;
  }

  return `${text}\n\n${block}\n`;
}

function extractTitle(filePath, fileText) {
  const title = fileText.match(HEADING_RE)?.[1] ?? basename(filePath, '.md');

  return title.replace(/[`*_]/g, '').trim();
}

function resolveContext(filePath) {
  const relativePath = relative(SPEC_ROOT, filePath).replaceAll('\\', '/');
  const context = ACCEPTANCE_CONTEXTS.find((item) => relativePath.startsWith(item.prefix));

  return context ?? DEFAULT_CONTEXT;
}

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const ACCEPTANCE_CONTEXTS = [
  { prefix: '01-prompt-spec/01-glossary/', summary: 'all downstream terms, actors, states, and banned vocabulary stay defined and consistently named', proof: 'LINT-glossary-coverage' },
  { prefix: '01-prompt-spec/02-data-model/', summary: 'Prompt, PromptCategory, and PromptStore contracts hold across storage implementations', proof: 'UT-data-001..010' },
  { prefix: '01-prompt-spec/03-prompt-source-format/', summary: 'prompt source files round-trip through parse and emit without semantic drift', proof: 'UT-source-001..008' },
  { prefix: '01-prompt-spec/04-loader-contract/', summary: 'loader calls return typed successes, typed errors, and bounded cache behavior', proof: 'UT-loader-001..012' },
  { prefix: '01-prompt-spec/05-ui-contract/', summary: 'trigger, dropdown, keyboard, search, and accessibility behavior remains user-verifiable', proof: 'CT-ui-001..009 and E2E-ui-001..003' },
  { prefix: '01-prompt-spec/06-injection-contract/', summary: 'all supported paste strategies inject and verify prompt text without corrupting selection state', proof: 'UT-inject-001..008 and E2E-inject-001..004' },
  { prefix: '01-prompt-spec/07-editor-adapters/', summary: 'textarea, contenteditable, and rich-editor adapters expose the same injection contract', proof: 'E2E-adapter-001..006' },
  { prefix: '01-prompt-spec/08-save-create-edit/', summary: 'prompt create, edit, delete, duplicate, import, and archive flows are reversible and observable', proof: 'UT-crud-001..010' },
  { prefix: '01-prompt-spec/09-next-overview/', summary: 'NextLoop submission, disabled-button handling, interruption, and cancellation behavior is deterministic', proof: 'E2E-next-001..005' },
  { prefix: '01-prompt-spec/10-queue-model/', summary: 'queued task shape, status transitions, capacity, storage, and ordering are enforced', proof: 'UT-queue-001..010' },
  { prefix: '01-prompt-spec/11-queue-lifecycle/', summary: 'enqueue, tick, retry, hold, cancel, pause, and completion events follow the queue lifecycle', proof: 'UT-lifecycle-001..010' },
  { prefix: '01-prompt-spec/12-delay-engine/', summary: 'default delay, settings, jitter, skip-first, and pause semantics use runtime defaults', proof: 'UT-delay-001..006' },
  { prefix: '01-prompt-spec/13-failure-handling/', summary: 'every failure path emits the mandatory failure-log shape and user-visible feedback', proof: 'UT-fail-001..010' },
  { prefix: '01-prompt-spec/14-plan-mode/', summary: 'PlanLoop renders, queues, edits, and compares against NextLoop without autorun ambiguity', proof: 'E2E-plan-001..003' },
  { prefix: '01-prompt-spec/15-settings/', summary: 'settings schema, defaults, reset, host overrides, and UX surface validate consistently', proof: 'UT-settings-001..006' },
  { prefix: '01-prompt-spec/16-observability/', summary: 'events, metrics, debug panel rows, and diagnostics exports follow the observability schema', proof: 'UT-obs-001..008' },
  { prefix: '01-prompt-spec/17-onboarding/', summary: 'first-run, guided tour, empty states, help, and adoption telemetry remain discoverable', proof: 'E2E-onb-001..004' },
  { prefix: '01-prompt-spec/18-test-plan/', summary: 'test inventories, target lists, fixtures, and mocks remain discoverable by automation', proof: 'meta-check' },
  { prefix: '01-prompt-spec/19-reference-snippets/', summary: 'reference snippets remain copyable and typecheck without hidden imports', proof: 'typecheck-spec-snippets.mjs' },
  { prefix: '01-prompt-spec/20-adoption-checklist/', summary: 'pre-flight, wire-up, go-live, worked example, and handoff steps stay complete', proof: 'meta-check' },
  { prefix: '01-prompt-spec/', summary: 'the prompt feature spec remains internally linked and blind-AI implementable', proof: 'node scripts/audit/check-dangling-links.mjs' },
  { prefix: '02-ci-cd-spec-for-chrome-extensions/', summary: 'Chrome-extension CI/CD, installer, release, operations, and audit contracts remain enforceable', proof: 'npm run test:cicd-spec' },
  { prefix: '03-chrome-ext-features/audit/', summary: 'each audit finding remains traceable to a feature spec and a verification hook', proof: 'node scripts/audit/check-dangling-links.mjs' },
  { prefix: '03-chrome-ext-features/', summary: 'Chrome extension feature behavior remains aligned with manifest, injection, logging, storage, and UI contracts', proof: 'npm run build:extension' },
  { prefix: '03-db-and-sqlite-integration-with-chrome-extension/', summary: 'SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract', proof: 'node scripts/audit/check-dangling-links.mjs' },
];

const DEFAULT_CONTEXT = {
  summary: 'the local spec contract remains implementable without unstated context',
  proof: 'node scripts/audit/check-dangling-links.mjs',
};

const changed = listMarkdownFiles(SPEC_ROOT).flatMap((filePath) => processFile(filePath));

process.stdout.write(`[backfill-acceptance] ${isApply ? 'updated' : 'would update'} ${changed.length} file(s)\n`);
for (const filePath of changed) {
  process.stdout.write(`  - ${filePath}\n`);
}