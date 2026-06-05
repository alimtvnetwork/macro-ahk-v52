#!/usr/bin/env node
// Build spec-tooltips.json from glossary.md + acronyms.md (ui/17 spec).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC = [
  { file: 'spec/21-app/05-prompts/glossary.md', refBase: 'spec/21-app/05-prompts/glossary.md' },
  { file: 'spec/21-app/05-prompts/acronyms.md', refBase: 'spec/21-app/05-prompts/acronyms.md' },
];
const OUT = 'public/spec-tooltips.json';

const dict = {};
for (const { file, refBase } of SRC) {
  if (!existsSync(file)) {
    console.error(`[build-tooltip-dict] Missing: ${file}`);
    process.exit(2);
  }
  const txt = readFileSync(file, 'utf8');
  // Markdown table rows: | Term | Definition | ... |
  const rows = txt.split('\n').filter(l => /^\|[^|]+\|/.test(l) && !/^\|\s*-+/.test(l));
  for (const row of rows) {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const term = cells[0].replace(/[`*]/g, '');
    const def = cells[1].replace(/[`*]/g, '');
    if (!term || term.toLowerCase() === 'term' || term.toLowerCase() === 'acronym') continue;
    if (def.toLowerCase() === 'definition' || def.toLowerCase() === 'expansion') continue;
    if (!dict[term]) dict[term] = { short: def, ref: refBase };
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(dict, null, 2) + '\n');
console.log(`[build-tooltip-dict] Wrote ${OUT} (${Object.keys(dict).length} terms)`);
