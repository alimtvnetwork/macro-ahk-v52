import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const DEFAULT_SPEC_ROOT = 'spec/2026-spec';

export function listMarkdownFiles(specRoot = DEFAULT_SPEC_ROOT) {
  return listFiles(resolve(specRoot)).filter(isMarkdownPath).sort();
}

function listFiles(directoryPath) {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    return listEntry(directoryPath, entry.name);
  });
}

function listEntry(directoryPath, entryName) {
  const entryPath = join(directoryPath, entryName);
  const entryStats = statSync(entryPath);

  if (entryStats.isDirectory() && entryName.startsWith('_audit-')) {
    return [];
  }

  if (entryStats.isDirectory()) {
    return listFiles(entryPath);
  }

  if (entryStats.isFile()) {
    return [entryPath];
  }

  return [];
}

function isMarkdownPath(filePath) {
  return filePath.endsWith('.md');
}