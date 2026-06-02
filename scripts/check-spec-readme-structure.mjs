#!/usr/bin/env node
// S86 — Every spec/<dir>/ must contain README.md with H1 + ## Overview + ## Files sections.
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SPEC = 'spec';
const REQUIRED = [/^#\s+\S/m, /^##\s+Overview\b/m, /^##\s+Files\b/m];
const errors = [];

for (const name of readdirSync(SPEC)) {
  const dir = join(SPEC, name);
  if (!statSync(dir).isDirectory()) continue;
  const readme = join(dir, 'README.md');
  if (!existsSync(readme)) { errors.push(`${dir}: missing README.md`); continue; }
  const body = readFileSync(readme, 'utf8');
  for (const rx of REQUIRED) {
    if (!rx.test(body)) errors.push(`${readme}: missing required section ${rx}`);
  }
}

if (errors.length) {
  for (const e of errors) console.error('::error::' + e);
  if (process.argv.includes('--strict')) process.exit(1);
}
console.log(`spec README structure: ${errors.length} issue(s)`);
