#!/usr/bin/env node
/**
 * Spec audit: every relative markdown link under spec/2026-spec/ MUST resolve
 * to an existing file. Skips http(s), mailto, anchors-only.
 *
 * CODE-RED report per mem://standards/error-logging-requirements: exact path,
 * missing target, and reason.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const SPEC_ROOT = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const INLINE_LINK_RE = /!?\[[^\]]+\]\(([^)\s#]+)(?:#[^)]*)?\)/g;
const REFERENCE_DEFINITION_RE = /^\s{0,3}\[([^\]]+)]\s*:\s*<?([^>\s#]+)>?(?:#[^\s]*)?.*$/gm;
const REFERENCE_LINK_RE = /!?\[([^\]\n]+)]\[([^\]\n]*)]/g;
const FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]*`/g;
const EXTERNAL_HREF_RE = /^(https?:|mailto:|mem:\/\/|#)/i;

function stripCode(text) {
  return text.replace(FENCE_RE, '').replace(INLINE_CODE_RE, '');
}

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const failures = [];
for (const path of listMarkdownFiles(SPEC_ROOT)) {
  const txt = stripCode(readFileSync(path, 'utf8'));
  const dir = dirname(path);
  const referenceDefinitions = getReferenceDefinitions(txt);
  failures.push(...collectInlineFailures(path, dir, txt));
  failures.push(...collectReferenceTargetFailures(path, dir, referenceDefinitions));
  failures.push(...collectUndefinedReferenceFailures(path, referenceDefinitions, txt));
}

function getReferenceDefinitions(text) {
  return new Map(Array.from(text.matchAll(REFERENCE_DEFINITION_RE), toReferenceDefinitionEntry));
}

function toReferenceDefinitionEntry(match) {
  return [normalizeReferenceId(match[1] ?? ''), match[2] ?? ''];
}

function collectInlineFailures(path, dir, text) {
  return Array.from(text.matchAll(INLINE_LINK_RE)).flatMap((match) => {
    return createTargetFailure(path, dir, match[1] ?? '', 'Dangling relative link');
  });
}

function collectReferenceTargetFailures(path, dir, referenceDefinitions) {
  return Array.from(referenceDefinitions.values()).flatMap((href) => {
    return createTargetFailure(path, dir, href, 'Dangling reference-style link');
  });
}

function collectUndefinedReferenceFailures(path, referenceDefinitions, text) {
  return Array.from(text.matchAll(REFERENCE_LINK_RE)).flatMap((match) => {
    return createReferenceFailure(path, referenceDefinitions, match);
  });
}

function createReferenceFailure(path, referenceDefinitions, match) {
  const referenceId = normalizeReferenceId((match[2] ?? '') || (match[1] ?? ''));
  const hasReference = referenceDefinitions.has(referenceId);

  return hasReference ? [] : [createMissingReferenceFailure(path, referenceId)];
}

function createTargetFailure(path, dir, href, reasonCode) {
  const isSkippedHref = isExternalHref(href);

  return isSkippedHref ? [] : createRelativeTargetFailure(path, dir, href, reasonCode);
}

function createRelativeTargetFailure(path, dir, href, reasonCode) {
  const target = resolve(dir, href);
  const isMissingTarget = existsSync(target) === false;

  return isMissingTarget ? [createMissingTargetFailure(path, href, target, reasonCode)] : [];
}

function createMissingTargetFailure(path, href, target, reasonCode) {
  return {
    path,
    missing: href,
    resolved: target,
    reason: `${reasonCode} — blind-AI will fail-fast (file does not exist at resolved path).`,
  };
}

function createMissingReferenceFailure(path, referenceId) {
  return {
    path,
    missing: `[${referenceId}]`,
    resolved: '(missing reference definition)',
    reason: 'Undefined reference-style link — blind-AI cannot resolve the target definition.',
  };
}

function isExternalHref(href) {
  return EXTERNAL_HREF_RE.test(href);
}

function normalizeReferenceId(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

if (failures.length === 0) {
  console.log(`[check-dangling-links] OK — every relative link under ${SPEC_ROOT}/ resolves`);
  process.exit(0);
}

console.error(`[check-dangling-links] CODE RED — ${failures.length} dangling link(s):`);
for (const f of failures) {
  console.error(`  - path: ${f.path}`);
  console.error(`    missing: ${f.missing}`);
  console.error(`    resolved: ${f.resolved}`);
  console.error(`    reason: ${f.reason}`);
}
process.exit(1);
