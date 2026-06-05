#!/usr/bin/env node
/**
 * Blocks fixed timezone/city/country tokens from source, specs, docs, workflows,
 * and memory. Timestamps must be stored as UTC and rendered with the user's
 * local timezone at display time.
 *
 * Pedagogical counter-examples (docs/specs/memory that teach the rule using
 * the forbidden tokens) are skipped when the same line also contains any of:
 *   - `Intl.DateTimeFormat` (canonical fix referenced inline — SAFE_RENDER_MARKER)
 *   - `<!-- allow-timezone-example -->` (explicit opt-out — INLINE_ALLOW_MARKER)
 *   - both ❌ and ✅ (paired bad/good counter-example pattern)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

const SAFE_RENDER_MARKER = 'Intl.DateTimeFormat';
const INLINE_ALLOW_MARKER = '<!-- allow-timezone-example -->';
const CROSS_MARK = '\u274C';
const CHECK_MARK = '\u2705';

function isPedagogicalCounterExample(line) {
  if (line.includes(SAFE_RENDER_MARKER)) return true;
  if (line.includes(INLINE_ALLOW_MARKER)) return true;
  if (line.includes(CROSS_MARK) && line.includes(CHECK_MARK)) return true;
  return false;
}

const SKIP_DIRS = new Set([
  '.git',
  '.release',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'skipped',
]);

const SKIP_FILES = new Set([
  'bun.lockb',
  'package-lock.json',
  'pnpm-lock.yaml',
]);

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.mmd',
  '.ps1',
  '.sh',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const plusSign = String.fromCharCode(43);
const slash = String.fromCharCode(47);
const underscore = String.fromCharCode(95);
const hyphen = String.fromCharCode(45);
const asiaCityToken = `Asia${slash}Kuala${underscore}Lumpur`;
const cityUnderscoreToken = `Kuala${underscore}Lumpur`;
const citySpaceToken = ['Kuala', 'Lumpur'].join(' ');
const countryToken = ['Malay', 'sia'].join('');
const countryAdjectiveToken = ['Malay', 'sian'].join('');
const localAbbrevToken = ['M', 'Y', 'T'].join('');
const utcFixedOffsetToken = `UTC${plusSign}8`;
const isoFixedOffsetToken = `${plusSign}08:00`;
const renderHyphenToken = ['render', 'time'].join(hyphen);

function escapedLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FORBIDDEN_PATTERNS = [
  { label: asiaCityToken, regex: new RegExp(escapedLiteral(asiaCityToken), 'g') },
  { label: cityUnderscoreToken, regex: new RegExp(escapedLiteral(cityUnderscoreToken), 'g') },
  { label: citySpaceToken, regex: new RegExp(escapedLiteral(citySpaceToken), 'g') },
  { label: countryToken, regex: new RegExp(`\\b${countryToken}\\b`, 'g') },
  { label: countryAdjectiveToken, regex: new RegExp(`\\b${countryAdjectiveToken}\\b`, 'g') },
  { label: localAbbrevToken, regex: new RegExp(`\\b${localAbbrevToken}\\b`, 'g') },
  { label: utcFixedOffsetToken, regex: new RegExp(`UTC\\${plusSign}0?8\\b`, 'g') },
  { label: 'fixed ISO offset', regex: new RegExp(escapedLiteral(isoFixedOffsetToken), 'g') },
  { label: 'render hyphenation', regex: new RegExp(`\\b${renderHyphenToken}\\b`, 'g') },
  { label: 'legacy relative formatter', regex: /\bformatRelativeM[y]\b/g },
  { label: 'legacy reset field', regex: /\bresetAtM[y]t\b/g },
  { label: 'legacy now helper', regex: /\bnowM[a]laysiaIso\b/g },
  { label: 'legacy midnight helper', regex: /\bcomputeNextM[y]tMidnight\b/g },
];

function hasTextExtension(fileName) {
  const dot = fileName.lastIndexOf('.');
  if (dot === -1) {
    return false;
  }
  return TEXT_EXTENSIONS.has(fileName.slice(dot));
}

function collectFiles(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(ROOT, fullPath).replaceAll('\\\\', '/');
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        collectFiles(fullPath, out);
      }
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (SKIP_FILES.has(entry.name) || !hasTextExtension(entry.name)) {
      continue;
    }
    out.push(relPath);
  }
}

const files = [];
collectFiles(ROOT, files);

const hits = [];
for (const file of files) {
  const body = readFileSync(join(ROOT, file), 'utf8');
  const lines = body.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isPedagogicalCounterExample(line)) {
      continue;
    }
    for (const pattern of FORBIDDEN_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        hits.push({ file, line: index + 1, label: pattern.label, text: line.trim() });
      }
    }
  }
}

if (hits.length > 0) {
  console.error('Forbidden hardcoded timezone tokens found. Store UTC and render with the user local timezone.');
  for (const hit of hits) {
    console.error(`${hit.file}:${hit.line} [${hit.label}] ${hit.text}`);
  }
  process.exit(1);
}

console.log(`Forbidden timezone scan OK (${files.length} text files checked).`);
