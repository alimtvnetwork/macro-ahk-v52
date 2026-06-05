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
const STRICT_ARG = '--strict';
const REPORT_ARG = '--report';
const DEFAULT_SOT_REL = '01-prompt-spec/reference/05-runtime-defaults.md';
const SOT_LINK_TEXT = 'reference/05-runtime-defaults.md';
const NUMERIC_VALUE = String.raw`(?:\d{1,3}(?:[ _]\d{3})+|\d+(?:_\d+)*)(?:\.\d+)?`;
const UNIT_CONSTANT_RE = new RegExp(String.raw`\b${NUMERIC_VALUE}\s*(?:ms|milliseconds?|s|sec(?:onds?)?|minutes?|hours?|days?|items?|rows?|entries?|tasks?|kib|mib|bytes?|retries?|attempts?|chars?)\b`, 'i');
const OPERATIONAL_KEYWORD_RE = /\b(?:default|timeout|cap|capacity|limit|budget|window|deadline|retry|retries|interval|ttl|truncate|lru|debounce|frame|quota)\b/i;
const MAX_MIN_UNIT_RE = new RegExp(String.raw`\b(?:max|min)\s+${NUMERIC_VALUE}\s*(?:ms|milliseconds?|s|sec(?:onds?)?|minutes?|hours?|days?|items?|rows?|entries?|tasks?|kib|mib|bytes?|retries?|attempts?|chars?)\b`, 'i');
const KEYWORD_RANGE_RE = new RegExp(String.raw`\b(?:default|timeout|cap|capacity|limit|budget|window|deadline|retry|retries|interval|ttl|truncate|lru|max|min)\b.*\b${NUMERIC_VALUE}\s*(?:\.\.|-|–)\s*${NUMERIC_VALUE}\b`, 'i');
const IDENTIFIER_CONSTANT_RE = /\b[A-Z][A-Z0-9_]*(?:_MS|_TIMEOUT|_LIMIT|_CAP|_SIZE|_RETRIES|_CAPACITY|_BYTES|_DAYS|_ITEMS|_ATTEMPTS)\b.*\b\d+\b/;
const RUNTIME_CONSTANT_RE = /^\|\s*`([^`]+)`/gm;
const RUNTIME_ROW_RE = /^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/gm;
const NUMBER_RE = new RegExp(String.raw`\b${NUMERIC_VALUE}\b`, 'g');
const UNIT_VALUE_RE = new RegExp(String.raw`\b(${NUMERIC_VALUE})\s*(ms|milliseconds?|s|sec(?:onds?)?|minutes?|hours?|days?|items?|rows?|entries?|tasks?|kib|mib|bytes?|retries?|attempts?|chars?)\b`, 'gi');
const RANGE_VALUE_RE = new RegExp(String.raw`\b(${NUMERIC_VALUE})\s*(?:\.\.|-|–)\s*(${NUMERIC_VALUE})\b`, 'g');
const KEYWORD_NUMBER_RE = new RegExp(String.raw`\b(?:default|timeout|cap|capacity|limit|budget|window|deadline|retry|retries|interval|ttl|truncate|lru|max|min|debounce|frame|quota)\b[^\n|` + '`' + String.raw`]*?\b(${NUMERIC_VALUE})\b`, 'gi');

const specRoot = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const sotPath = resolve(specRoot, getArg(SOT_ARG, DEFAULT_SOT_REL));
const isStrict = process.argv.includes(STRICT_ARG);
const runtimeDefaults = readRuntimeDefaults(sotPath);
const failures = scanFiles(specRoot, sotPath, runtimeDefaults, isStrict);

if (process.argv.includes(REPORT_ARG)) {
  writeReport(failures, isStrict);
}

if (failures.length === 0) {
  process.stdout.write(`[check-must-constants] OK — operational constants cite ${SOT_LINK_TEXT}\n`);
  process.exit(0);
}

writeFailureReport(failures);
process.exit(1);

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function readRuntimeDefaults(filePath) {
  if (!existsSync(filePath)) {
    writeMissingSot(filePath);
    process.exit(1);
  }

  const fileText = readFileSync(filePath, 'utf8');

  return {
    constants: readRuntimeConstants(fileText),
    numbers: readRuntimeNumbers(fileText),
  };
}

function readRuntimeConstants(fileText) {
  return Array.from(fileText.matchAll(RUNTIME_CONSTANT_RE)).map((match) => match[1]);
}

function readRuntimeNumbers(fileText) {
  const values = Array.from(fileText.matchAll(RUNTIME_ROW_RE)).flatMap((match) => {
    return extractRuntimeNumbers(`${match[2]} ${match[3]}`);
  });

  return new Set(values.flatMap(expandNumericAliases));
}

function scanFiles(rootPath, canonicalSotPath, defaults, strictMode) {
  return listMarkdownFiles(rootPath).flatMap((filePath) => {
    return scanFile(filePath, canonicalSotPath, defaults, strictMode);
  });
}

function scanFile(filePath, canonicalSotPath, defaults, strictMode) {
  if (isSkippedPath(filePath, canonicalSotPath)) {
    return [];
  }

  const fileText = readFileSync(filePath, 'utf8');
  const hasFileBinding = hasFileLevelSotBinding(fileText, defaults.constants);
  // File-level binding: if the file as a whole cites the SOT (link or
  // mem:// rule) OR names any canonical constant, every operational
  // number in that file is considered bound. This avoids per-line noise
  // while still flagging files that never reference the SOT.
  if (hasFileBinding && !strictMode) {
    return [];
  }

  return fileText.split(/\r?\n/).flatMap((line, index) => {
    return scanLine(filePath, line, index + 1, defaults, hasFileBinding);
  });
}

function scanLine(filePath, lineText, lineNumber, defaults, hasFileBinding) {
  if (!isOperationalConstantLine(lineText)) {
    return [];
  }

  if (hasSourceOfTruthBinding(lineText, defaults, hasFileBinding)) {
    return [];
  }

  return [buildFailure(filePath, lineNumber, lineText, defaults.numbers)];
}

function hasFileLevelSotBinding(fileText, constants) {
  if (fileText.includes(SOT_LINK_TEXT)) return true;
  if (fileText.includes('mem://')) return true;
  return constants.some((name) => fileText.includes(name));
}

function isSkippedPath(filePath, canonicalSotPath) {
  return resolve(filePath) === canonicalSotPath;
}

function isOperationalConstantLine(lineText) {
  const text = stripNonOperationalTokens(lineText.trim());
  const hasUnitConstant = UNIT_CONSTANT_RE.test(text);
  const hasOperationalKeyword = OPERATIONAL_KEYWORD_RE.test(text);

  return (hasUnitConstant && hasOperationalKeyword) || MAX_MIN_UNIT_RE.test(text) || KEYWORD_RANGE_RE.test(text) || IDENTIFIER_CONSTANT_RE.test(text);
}

function stripNonOperationalTokens(lineText) {
  return lineText.replace(/\b[A-Z]+-[a-z]+-\d+(?:\.\.\d+)?\b/g, '');
}

function hasSourceOfTruthBinding(lineText, defaults, hasFileBinding) {
  return lineText.includes(SOT_LINK_TEXT) || lineText.includes('mem://') || defaults.constants.some((constantName) => {
    return lineText.includes(constantName);
  }) || hasRuntimeNumberBinding(lineText, defaults.numbers, hasFileBinding);
}

function hasRuntimeNumberBinding(lineText, runtimeNumbers, hasFileBinding) {
  if (!hasFileBinding) {
    return false;
  }

  const lineNumbers = extractLineNumbers(lineText);
  return lineNumbers.length > 0 && lineNumbers.every((value) => runtimeNumbers.has(value));
}

function extractRuntimeNumbers(text) {
  return Array.from(text.matchAll(NUMBER_RE)).map((match) => normalizeNumber(match[0]));
}

function extractLineNumbers(text) {
  const unitNumbers = Array.from(text.matchAll(UNIT_VALUE_RE)).map((match) => normalizeNumber(match[1]));
  const rangeNumbers = Array.from(text.matchAll(RANGE_VALUE_RE)).flatMap((match) => [normalizeNumber(match[1]), normalizeNumber(match[2])]);
  const keywordNumbers = Array.from(text.matchAll(KEYWORD_NUMBER_RE)).map((match) => normalizeNumber(match[1]));

  return Array.from(new Set([...unitNumbers, ...rangeNumbers, ...keywordNumbers]));
}

function normalizeNumber(value) {
  return String(Number(value.replace(/[ _]/g, '')));
}

function expandNumericAliases(value) {
  const numericValue = Number(value);
  const aliases = [value];

  return [...aliases, ...millisecondAliases(numericValue), ...byteAliases(numericValue)].filter(Boolean);
}

function millisecondAliases(value) {
  if (value < 1000 || value % 1000 !== 0) {
    return [];
  }

  return [String(value / 1000)];
}

function byteAliases(value) {
  const isKib = value >= 1024 && value % 1024 === 0;
  const isMib = value >= 1048576 && value % 1048576 === 0;

  return [isKib ? String(value / 1024) : '', isMib ? String(value / 1048576) : ''];
}

function buildFailure(filePath, lineNumber, lineText, runtimeNumbers) {
  const lineNumbers = extractLineNumbers(lineText).filter((value) => runtimeNumbers.has(value));

  return {
    path: filePath,
    line: lineNumber,
    missing: SOT_LINK_TEXT,
    excerpt: lineText.trim(),
    matchingRuntimeValues: lineNumbers,
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

function writeReport(failures, strictMode) {
  process.stdout.write(`[check-must-constants] report strict=${strictMode} failures=${failures.length}\n`);
  for (const failure of failures) {
    process.stdout.write(`${failure.path}:${failure.line}: ${failure.excerpt}\n`);
  }
}