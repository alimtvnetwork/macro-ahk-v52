#!/usr/bin/env node
/**
 * Spec audit: footer-lint keeps new prose from bypassing the generated audit
 * hardening footers. It validates known `<!-- audit: ... -->` markers and the
 * minimum section each marker promises.
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const SPEC_ROOT = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const MARKER_RX = /<!--\s*audit:\s*([^>]+?)\s*-->/g;
const VALIDATORS = new Map([
  ['determinism+pitfalls footer', hasDeterminismAndPitfalls],
  ['numeric constants source-of-truth', hasRuntimeDefaultsReference],
  ['uplift-to-100 footer', hasSourceOfTruthAnchor],
  ['numeric+xref uplift', hasSourceOfTruthAnchor],
  ['inline-types', hasCanonicalTypeSchema],
]);

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function hasDeterminismAndPitfalls(content) {
  return /##\s+Determinism/i.test(content) && /##\s+Pitfalls|Counter-example|Anti-pattern|Edge case|Gotcha/i.test(content);
}

function hasRuntimeDefaultsReference(content) {
  return /runtime defaults|SOT/i.test(content);
}

function hasSourceOfTruthAnchor(content) {
  return /source-of-truth|Numeric Bounds/i.test(content) && /\]\([^)]*\.md\)/.test(content);
}

function hasCanonicalTypeSchema(content) {
  return /##\s+Type & Schema \(canonical\)/i.test(content) && /```(?:json|typescript|ts)/i.test(content);
}

function getMarkers(content) {
  return Array.from(content.matchAll(MARKER_RX)).map((match) => match[1].trim());
}

function createFailure(path, missing, reason) {
  return { path, missing, reason };
}

const failures = [];
for (const path of listMarkdownFiles(SPEC_ROOT)) {
  const content = readFileSync(path, 'utf8');
  const markers = getMarkers(content);
  if (markers.length === 0) continue;

  for (const marker of markers) {
    const validator = VALIDATORS.get(marker);
    if (validator === undefined) {
      failures.push(createFailure(path, `known audit footer marker for "${marker}"`, 'FooterLintUnknownMarker'));
      continue;
    }
    if (validator(content)) continue;
    failures.push(createFailure(path, `required section for "${marker}"`, 'FooterLintMissingPromisedSection'));
  }
}

if (failures.length === 0) {
  console.log(`[check-footer-lint] OK — audit footer markers under ${SPEC_ROOT} have their promised sections`);
  process.exit(0);
}

console.error(`[check-footer-lint] CODE RED — ${failures.length} audit footer issue(s):`);
for (const failure of failures) {
  console.error(`  - path: ${failure.path}`);
  console.error(`    missing: ${failure.missing}`);
  console.error(`    reason: ${failure.reason}`);
}
process.exit(1);