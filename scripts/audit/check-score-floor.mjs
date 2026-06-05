#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_ARG = '--root=';
const MIN_FILE_ARG = '--min-file=';
const MIN_COMPOSITE_ARG = '--min-composite=';
const DEFAULT_SPEC_ROOT = 'spec/2026-spec';
const DEFAULT_MIN_FILE = '100';
const DEFAULT_MIN_COMPOSITE = '99.5';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const AUDIT_SCAN_SCRIPT = resolve(SCRIPT_DIR, 'audit-scan.py');

const specRoot = getArg(ROOT_ARG, DEFAULT_SPEC_ROOT);
const minFileScore = Number(getArg(MIN_FILE_ARG, DEFAULT_MIN_FILE));
const minCompositeScore = Number(getArg(MIN_COMPOSITE_ARG, DEFAULT_MIN_COMPOSITE));
const rows = readScoreRows(specRoot);
const failures = collectFailures(rows, specRoot, minFileScore, minCompositeScore);

if (failures.length === 0) {
  process.stdout.write(`[check-score-floor] OK — every file is >=${minFileScore}; composite is ${formatNumber(getComposite(rows))} >=${minCompositeScore}\n`);
  process.exit(0);
}

writeFailureReport(failures);
process.exit(1);

function getArg(prefix, fallback) {
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function readScoreRows(rootPath) {
  const result = spawnSync('python3', [AUDIT_SCAN_SCRIPT, rootPath], { encoding: 'utf8' });
  if (result.status === 0) {
    return JSON.parse(result.stdout);
  }

  writeScannerFailure(rootPath, result.stderr);
  process.exit(1);
}

function collectFailures(scoreRows, rootPath, fileFloor, compositeFloor) {
  return [
    ...collectFileFailures(scoreRows, rootPath, fileFloor),
    ...collectCompositeFailures(scoreRows, rootPath, compositeFloor),
  ];
}

function collectFileFailures(scoreRows, rootPath, floor) {
  return scoreRows.filter((row) => row.score < floor).map((row) => {
    return buildFileFailure(row, rootPath, floor);
  });
}

function collectCompositeFailures(scoreRows, rootPath, floor) {
  const compositeScore = getComposite(scoreRows);
  if (compositeScore >= floor) {
    return [];
  }

  return [buildCompositeFailure(rootPath, floor, compositeScore)];
}

function buildFileFailure(row, rootPath, floor) {
  return {
    path: resolve(rootPath, row.path),
    missing: `score >= ${floor}`,
    reason: `Blind-AI score is ${row.score}; blocker: ${row.top_blocker}.`,
  };
}

function buildCompositeFailure(rootPath, floor, compositeScore) {
  return {
    path: resolve(rootPath),
    missing: `composite score >= ${floor}`,
    reason: `Blind-AI composite is ${formatNumber(compositeScore)} across all source specs.`,
  };
}

function getComposite(scoreRows) {
  const total = scoreRows.reduce((sum, row) => sum + row.score, 0);

  return scoreRows.length === 0 ? 0 : total / scoreRows.length;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function writeScannerFailure(rootPath, stderrText) {
  process.stderr.write('[check-score-floor] CODE RED — audit scanner failed:\n');
  process.stderr.write(`  - path: ${resolve(rootPath)}\n`);
  process.stderr.write('    missing: score JSON from scripts/audit/audit-scan.py\n');
  process.stderr.write(`    reason: ${stderrText}\n`);
}

function writeFailureReport(items) {
  process.stderr.write(`[check-score-floor] CODE RED — ${items.length} score-floor violation(s):\n`);
  for (const item of items) {
    process.stderr.write(`  - path: ${item.path}\n`);
    process.stderr.write(`    missing: ${item.missing}\n`);
    process.stderr.write(`    reason: ${item.reason}\n`);
  }
}