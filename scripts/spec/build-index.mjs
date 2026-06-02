#!/usr/bin/env node
// Build INDEX.json — machine-readable map of spec/21-app/05-prompts/**
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'spec/21-app/05-prompts';
const OUT = join(ROOT, 'INDEX.json');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(md|json)$/i.test(e)) out.push(p);
  }
  return out;
}

function meta(file) {
  const txt = readFileSync(file, 'utf8');
  const titleMatch = txt.match(/^#\s+(.+)$/m);
  const statusMatch = txt.match(/Status:\s*([^\n·]+?)(?:\s*·|\n)/);
  const versionMatch = txt.match(/v(\d+\.\d+\.\d+)/);
  return {
    path: relative('.', file).replace(/\\/g, '/'),
    title: titleMatch ? titleMatch[1].trim() : null,
    status: statusMatch ? statusMatch[1].trim() : null,
    version: versionMatch ? versionMatch[1] : null,
    bytes: statSync(file).size,
  };
}

const files = walk(ROOT)
  .filter(f => !f.endsWith('INDEX.json'))
  .map(meta)
  .sort((a, b) => a.path.localeCompare(b.path));

const index = {
  generatedAt: new Date().toISOString(),
  root: ROOT,
  fileCount: files.length,
  files,
};

writeFileSync(OUT, JSON.stringify(index, null, 2) + '\n');
console.log(`[build-index] Wrote ${OUT} (${files.length} files)`);
