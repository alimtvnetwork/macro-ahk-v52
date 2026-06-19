#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
// check-installer-target-dir.mjs
//
// Regression guard for the v3.68.0 fix: scripts/install.ps1 MUST install
// into the caller's current working directory (`<cwd>\marco-extension`),
// NOT into `$HOME\marco-extension`. The previous default surprised users
// who piped `irm … | iex` from inside a project folder and found files
// landing in their user profile instead.
//
// Two assertions, both static (no pwsh required):
//
//   1. Resolve-InstallDir's empty-dir branch MUST use Get-Location (the
//      cwd), and MUST NOT reference $HOME / $env:USERPROFILE.
//   2. The runtime check at the install site (Resolve-InstallDir call
//      site) must still call Resolve-InstallDir — i.e. nobody bypassed
//      the resolver with a direct $HOME join.
//
// Exit codes: 0 ok, 1 drift detected, 2 installer not found.
// ─────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const installer = resolve(here, '..', 'scripts', 'install.ps1');

if (!existsSync(installer)) {
  console.error(`[check-installer-target-dir] installer not found at ${installer}`);
  process.exit(2);
}

const src = readFileSync(installer, 'utf8');
const findings = [];

// ── Assertion 1: Resolve-InstallDir uses Get-Location ────────────────
const fnMatch = src.match(/function\s+Resolve-InstallDir\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
if (!fnMatch) {
  findings.push({
    rule: 'resolver-present',
    detail: 'Resolve-InstallDir function not found in scripts/install.ps1',
  });
} else {
  const body = fnMatch[1].split('\n').map(l => l.replace(/(^|[^`])#.*$/, '$1')).join('\n');
  if (!/Get-Location/.test(body)) {
    findings.push({
      rule: 'resolver-uses-cwd',
      detail: 'Resolve-InstallDir must call Get-Location for the default branch (cwd-based install).',
    });
  }
  if (/\$HOME\b|\$env:USERPROFILE/i.test(body)) {
    findings.push({
      rule: 'resolver-no-home',
      detail: 'Resolve-InstallDir must NOT reference $HOME or $env:USERPROFILE — installs land in cwd, not user profile.',
    });
  }
  if (!/marco-extension/.test(body)) {
    findings.push({
      rule: 'resolver-target-name',
      detail: 'Resolve-InstallDir must still join the literal "marco-extension" folder name.',
    });
  }
}

// ── Assertion 2: install site goes through the resolver ──────────────
if (!/Resolve-InstallDir\s+\$InstallDir/.test(src)) {
  findings.push({
    rule: 'install-site-uses-resolver',
    detail: 'Main flow must call Resolve-InstallDir $InstallDir — do not inline a $HOME join.',
  });
}

// ── Assertion 3: no other code path joins $HOME with marco-extension ─
const homeJoinPattern = /Join-Path\s+\$HOME\s+["']marco-extension["']/i;
if (homeJoinPattern.test(src)) {
  findings.push({
    rule: 'no-home-join',
    detail: 'Found `Join-Path $HOME "marco-extension"` — this re-introduces the v3.67 bug.',
  });
}

if (findings.length === 0) {
  console.log('✅ install.ps1 installs into <cwd>\\marco-extension (Resolve-InstallDir uses Get-Location).');
  process.exit(0);
}

console.error(`✗ Installer target-dir contract drift — ${findings.length} finding(s):\n`);
for (const f of findings) {
  console.error(`  • [${f.rule}] ${f.detail}`);
}
console.error(`\nFix scripts/install.ps1 so Resolve-InstallDir defaults to (Get-Location).Path \\ marco-extension.`);
process.exit(1);
