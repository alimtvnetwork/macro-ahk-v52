#!/usr/bin/env node
/**
 * enumerate-extensions.mjs
 *
 * Generic Manifest V3 extension discovery for spec/2026/02 §11/§22.
 * Prints a JSON array of repo-relative extension directories by default.
 * Use --lines for one path per line.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');
const IGNORED_DIRS = new Set([
  '.git',
  '.release',
  'node_modules',
  'skipped',
]);

function usage(exitCode = 0) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write([
    'Usage: node scripts/enumerate-extensions.mjs [--root <repo>] [--lines]',
    '',
    'Finds directories containing manifest.json with manifest_version === 3.',
    'Default output is a JSON array of repo-relative paths for GitHub Actions matrices.',
    '',
  ].join('\n'));
  process.exit(exitCode);
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, lines: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('missing value for --root');
      }
      options.root = resolve(next);
      i += 1;
      continue;
    }
    if (arg === '--lines') {
      options.lines = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      usage(0);
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function toRepoPath(root, absolutePath) {
  const rel = relative(root, absolutePath).replace(/\\/g, '/');
  return rel.length === 0 ? '.' : rel;
}

function isManifestV3(manifestPath) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[enumerate-extensions] InvalidJson path=${manifestPath} missing=parseable-manifest reason=${detail}`);
    return false;
  }
  return parsed?.manifest_version === 3;
}

function walk(root, dir, discovered) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const manifest = entries.find((entry) => entry.isFile() && entry.name === 'manifest.json');
  if (manifest && isManifestV3(join(dir, manifest.name))) {
    discovered.push(toRepoPath(root, dir));
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }
    walk(root, join(dir, entry.name), discovered);
  }
}

function enumerateExtensions(root) {
  if (!existsSync(root)) {
    throw new Error(`root does not exist: ${root}`);
  }
  if (!statSync(root).isDirectory()) {
    throw new Error(`root is not a directory: ${root}`);
  }
  const discovered = [];
  walk(root, root, discovered);
  return discovered.sort((a, b) => a.localeCompare(b));
}

try {
  const options = parseArgs(process.argv.slice(2));
  const exts = enumerateExtensions(options.root);
  if (exts.length === 0) {
    console.error(`[enumerate-extensions] ExtensionMissing path=${options.root} missing=manifest_version_3 reason=no-mv3-manifest-found`);
    process.exit(1);
  }
  if (options.lines) {
    process.stdout.write(`${exts.join('\n')}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(exts)}\n`);
  }
} catch (err) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[enumerate-extensions] Failed path=${process.cwd()} missing=valid-input reason=${detail}`);
  process.exit(3);
}
