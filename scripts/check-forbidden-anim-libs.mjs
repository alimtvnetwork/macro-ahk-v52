#!/usr/bin/env node
// S77 — Block forbidden animation libraries (dark-only theme + zero-external-anim policy).
import { readFileSync, existsSync } from 'node:fs';

const FORBIDDEN = ['framer-motion', 'gsap', '@gsap/react'];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const hits = FORBIDDEN.filter((n) => n in deps);

if (hits.length) {
  console.error(`\n  Forbidden animation libraries detected: ${hits.join(', ')}`);
  console.error('  Policy: dark-only theme uses Tailwind + standard CSS keyframes only.\n');
  process.exit(1);
}

// Also scan a lockfile if present for transitive direct adds.
for (const lf of ['bun.lockb', 'package-lock.json', 'pnpm-lock.yaml']) {
  if (existsSync(lf)) {
    const body = readFileSync(lf, 'utf8');
    for (const n of FORBIDDEN) {
      if (body.includes(`"${n}"`) || body.includes(`${n}:`)) {
        console.error(`  Forbidden lib in lockfile (${lf}): ${n}`);
        process.exit(1);
      }
    }
  }
}
