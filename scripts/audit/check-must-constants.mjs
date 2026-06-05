#!/usr/bin/env node
/**
 * Spec audit: operational numeric constants in spec prose MUST bind to the
 * runtime-defaults source of truth or to an explicit mem:// canonical rule.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const SOT_ARG = '--sot=';
const DEFAULT_SOT_REL = '01-prompt-spec/reference/05-runtime-defaults.md';
const SOT_LINK_TEXT = 'reference/05-runtime-defaults.md';
const UNIT_CONSTANT_RE = /\b\d+(?:\.\d+)?\s*(?:ms|milliseconds?|s|sec(?:onds?)?|minutes?|hours?|days?|items?|rows?|entries?|tasks?|kib|mib|bytes?|retries?|attempts?|chars?)\b/i;
const OPERATIONAL_KEYWORD_RE = /\b(?:default|timeout|cap|capacity|limit|budget|window|deadline|retry|retries|interval|ttl|truncate|lru|max|min|debounce|frame|quota)\b/i;
const KEYWORD_RANGE_RE = /\b(?:default|timeout|cap|capacity|limit|budget|window|deadline|retry|retries|interval|ttl|truncate|lru|max|min)\b.*\b\d+\s*(?:\.\.|-|–)\s*\d+\b/i;
const IDENTIFIER_CONSTANT_RE = /\b[a-zA-Z][\w]*(?:Ms|MS|Timeout|Limit|Cap|Size|Retries|Capacity)\b.*\b\d+\b/;
const RUNTIME_CONSTANT_RE = /^\|\s*`([^`]+)`/gm;

const specRoot = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const sotPath = resolve(specRoot, getArg(SOT_ARG, DEFAULT_SOT_REL));
const runtimeConstants = readRuntimeConstants(sotPath);
const failures = scanFiles(specRoot, sotPath, runtimeConstants);

if (failures.length === 0) {
  process.stdout.write(`[check-must-constants] OK — operational constants cite ${SOT_LINK_TEXT}\n`);
  process.exit(0);
}

writeFailureReport(failures);
process.exit(1);

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function readRuntimeConstants(filePath) {
  if (!existsSync(filePath)) {
    writeMissingSot(filePath);
    process.exit(1);
  }

  return Array.from(readFileSync(filePath, 'utf8').matchAll(RUNTIME_CONSTANT_RE)).map((match) => match[1]);
}

function scanFiles(rootPath, canonicalSotPath, constants) {
  return listMarkdownFiles(rootPath).flatMap((filePath) => {
    return scanFile(filePath, canonicalSotPath, constants);
  });
}

function scanFile(filePath, canonicalSotPath, constants) {
  if (isSkippedPath(filePath, canonicalSotPath)) {
    return [];
  }

  return readFileSync(filePath, 'utf8').split(/\r?\n/).flatMap((line, index) => {
    return scanLine(filePath, line, index + 1, constants);
  });
}

function scanLine(filePath, lineText, lineNumber, constants) {
  if (!isOperationalConstantLine(lineText)) {
    return [];
  }

  if (hasSourceOfTruthBinding(lineText, constants)) {
    return [];
  }

  return [buildFailure(filePath, lineNumber, lineText)];
}

function isSkippedPath(filePath, canonicalSotPath) {
  return filePath.includes('/_audit-') || resolve(filePath) === canonicalSotPath;
}

function isOperationalConstantLine(lineText) {
  const text = lineText.trim();
  const hasUnitConstant = UNIT_CONSTANT_RE.test(text);
  const hasOperationalKeyword = OPERATIONAL_KEYWORD_RE.test(text);

  return (hasUnitConstant && hasOperationalKeyword) || KEYWORD_RANGE_RE.test(text) || IDENTIFIER_CONSTANT_RE.test(text);
}

function hasSourceOfTruthBinding(lineText, constants) {
  return lineText.includes(SOT_LINK_TEXT) || lineText.includes('mem://') || constants.some((constantName) => {
    return lineText.includes(constantName);
  });
}

function buildFailure(filePath, lineNumber, lineText) {
  return {
    path: filePath,
    line: lineNumber,
    missing: SOT_LINK_TEXT,
    excerpt: lineText.trim(),
    reason: 'Operational numeric constant is not bound to the runtime-defaults source-of-truth or a canonical mem:// rule.',
  };
}

function writeMissingSot(filePath) {
  process.stderr.write('[check-must-constants] CODE RED — runtime defaults source-of-truth missing:\n');
  process.stderr.write(`  - path: ${filePath}\n`);
  process.stderr.write('    missing: 01-prompt-spec/reference/05-runtime-defaults.md\n');
  process.stderr.write('    reason: Numeric constants cannot be audited without the canonical defaults table.\n');
}

function writeFailureReport(failures) {
  process.stderr.write(`[check-must-constants] CODE RED — ${failures.length} unbound numeric constant line(s):\n`);
  for (const failure of failures) {
    process.stderr.write(`  - path: ${failure.path}\n`);
    process.stderr.write(`    line: ${failure.line}\n`);
    process.stderr.write(`    missing: ${failure.missing}\n`);
    process.stderr.write(`    excerpt: ${failure.excerpt}\n`);
    process.stderr.write(`    reason: ${failure.reason}\n`);
  }
}