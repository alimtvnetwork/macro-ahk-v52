#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { DEFAULT_SPEC_ROOT, listMarkdownFiles } from './spec-file-list.mjs';

const ROOT_ARG = '--root=';
const SOT_ARG = '--sot=';
const DEFAULT_SOT_REL = '01-prompt-spec/reference/05-runtime-defaults.md';
const NUMERIC_VALUE = String.raw`(?:\d{1,3}(?:[ _]\d{3})+|\d+(?:_\d+)*)(?:\.\d+)?`;
const RUNTIME_ROW_RE = /^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/gm;
const NUMBER_RE = new RegExp(String.raw`\b${NUMERIC_VALUE}\b`, 'g');

const specRoot = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const sotPath = resolve(specRoot, getArg(SOT_ARG, DEFAULT_SOT_REL));
const runtimeDefaults = readRuntimeDefaults(sotPath);
const failures = scanSpecFiles(specRoot, sotPath, runtimeDefaults);

if (failures.length === 0) {
  process.stdout.write('[check-constant-divergence] OK — spec constants match runtime defaults\n');
  process.exit(0);
}

writeFailureReport(failures);
process.exit(1);

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function readRuntimeDefaults(filePath) {
  if (existsSync(filePath)) {
    return parseRuntimeDefaults(readFileSync(filePath, 'utf8'));
  }

  writeMissingSot(filePath);
  process.exit(1);
}

function parseRuntimeDefaults(fileText) {
  return new Map(Array.from(fileText.matchAll(RUNTIME_ROW_RE)).map((match) => {
    return [match[1], buildRuntimeDefault(match[2])];
  }));
}

function buildRuntimeDefault(defaultText) {
  return {
    defaultValue: normalizeValue(defaultText.trim()),
  };
}

function scanSpecFiles(rootPath, canonicalSotPath, defaults) {
  return listMarkdownFiles(rootPath).flatMap((filePath) => {
    return scanSpecFile(filePath, canonicalSotPath, defaults);
  });
}

function scanSpecFile(filePath, canonicalSotPath, defaults) {
  if (resolve(filePath) === canonicalSotPath) {
    return [];
  }

  return readFileSync(filePath, 'utf8').split(/\r?\n/).flatMap((lineText, index) => {
    return scanLine(filePath, lineText, index + 1, defaults);
  });
}

function scanLine(filePath, lineText, lineNumber, defaults) {
  return Array.from(defaults.entries()).flatMap(([constantName, runtimeDefault]) => {
    return scanLineForConstant(filePath, lineText, lineNumber, constantName, runtimeDefault);
  });
}

function scanLineForConstant(filePath, lineText, lineNumber, constantName, runtimeDefault) {
  const literalValue = extractAssignedConstantValue(lineText, constantName);
  if (literalValue === null) {
    return [];
  }

  if (literalValue === runtimeDefault.defaultValue) {
    return [];
  }

  return [buildFailure(filePath, lineNumber, lineText, constantName, literalValue, runtimeDefault.defaultValue)];
}

function extractAssignedConstantValue(lineText, constantName) {
  const escapedConstant = escapeRegExp(constantName);
  const assignmentRe = new RegExp(String.raw`\b${escapedConstant}\b\s*(?:=|:|is|defaults?\s+to|must\s+be)\s*(?:\*\*)?([^` + '`' + String.raw`\n,;|)]+)`, 'i');
  const match = lineText.match(assignmentRe);

  return match ? normalizeConstantExpression(match[1]) : null;
}

function normalizeConstantExpression(expressionText) {
  const productValue = evaluateProductExpression(expressionText);
  if (productValue !== null) {
    return productValue;
  }

  const unitValue = evaluateUnitExpression(expressionText);

  return unitValue ?? normalizeValue(expressionText);
}

function evaluateProductExpression(expressionText) {
  const parts = expressionText.trim().split(/\s*\*\s*/);
  const hasProduct = parts.length > 1;
  if (!hasProduct) {
    return null;
  }

  const hasOnlyNumbers = parts.every((part) => /^\d+(?:\.\d+)?$/.test(part.trim()));

  return hasOnlyNumbers ? String(parts.reduce((total, part) => total * Number(part.trim()), 1)) : null;
}

function evaluateUnitExpression(expressionText) {
  const match = expressionText.trim().match(new RegExp(String.raw`^(${NUMERIC_VALUE})\s*(ki?b|mi?b|bytes?)\b`, 'i'));
  if (match === null) {
    return null;
  }

  return String(Number(match[1]) * unitMultiplier(match[2]));
}

function unitMultiplier(unitText) {
  if (/^mi?b$/i.test(unitText)) {
    return 1048576;
  }

  if (/^ki?b$/i.test(unitText)) {
    return 1024;
  }

  return 1;
}

function buildFailure(filePath, lineNumber, lineText, constantName, actualValue, expectedValue) {
  return {
    path: relative('.', filePath),
    line: lineNumber,
    missing: `${constantName}=${expectedValue}`,
    excerpt: lineText.trim(),
    reason: `${constantName} is documented as ${actualValue}, but runtime defaults declare ${expectedValue}.`,
  };
}

function normalizeValue(valueText) {
  const numericMatch = valueText.match(NUMBER_RE);

  return numericMatch ? normalizeNumber(numericMatch[0]) : valueText;
}

function normalizeNumber(value) {
  return String(Number(value.replace(/[ _]/g, '')));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeMissingSot(filePath) {
  process.stderr.write('[check-constant-divergence] CODE RED — runtime defaults source-of-truth missing:\n');
  process.stderr.write(`  - path: ${filePath}\n`);
  process.stderr.write('    missing: 01-prompt-spec/reference/05-runtime-defaults.md\n');
  process.stderr.write('    reason: Constant divergence cannot be audited without the canonical defaults table.\n');
}

function writeFailureReport(items) {
  process.stderr.write(`[check-constant-divergence] CODE RED — ${items.length} divergent constant line(s):\n`);
  for (const item of items) {
    process.stderr.write(`  - path: ${item.path}\n`);
    process.stderr.write(`    line: ${item.line}\n`);
    process.stderr.write(`    missing: ${item.missing}\n`);
    process.stderr.write(`    excerpt: ${item.excerpt}\n`);
    process.stderr.write(`    reason: ${item.reason}\n`);
  }
}