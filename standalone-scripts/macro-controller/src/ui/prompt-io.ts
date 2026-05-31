/**
 * Prompt IO — Core Logic & Types (Issue 131 Task 1)
 *
 * Handles JSON parsing, validation, and the upsert-merge strategy
 * for importing/exporting prompts from the controller cache.
 */

import { CachedPromptEntry, readJsonCopy } from './prompt-cache';
import { log } from '../logging';
import { showToast } from '../toast';

/**
 * Exports current prompts from IndexedDB as a JSON file download.
 */
export async function exportPromptsToJson(): Promise<void> {
  try {
    const record = await readJsonCopy();
    if (!record || !record.entries || record.entries.length === 0) {
      showToast('No prompts found to export', 'warn');
      return;
    }

    const data = JSON.stringify(record.entries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    showToast(`Exported ${record.entries.length} prompts`, 'success');
  } catch (err) {
    log('[PromptIO] Export failed: ' + String(err), 'error');
    showToast('Export failed', 'error');
  }
}


export interface PromptImportResults {
  added: number;
  updated: number;
  total: number;
  errors: string[];
}

/**
 * Validates that an object matches the CachedPromptEntry schema.
 * Sanitizes fields to ensure consistency.
 */
export function validatePromptEntry(entry: any): CachedPromptEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.name !== 'string' || !entry.name.trim()) return null;
  if (typeof entry.text !== 'string') return null;

  return {
    name: entry.name.trim(),
    text: entry.text,
    slug: typeof entry.slug === 'string' ? entry.slug.trim() : undefined,
    category: typeof entry.category === 'string' ? entry.category.trim() : 'General',
    isFavorite: !!entry.isFavorite,
    isDefault: !!entry.isDefault,
    order: typeof entry.order === 'number' ? entry.order : undefined,
    version: typeof entry.version === 'string' ? entry.version : undefined
  };
}

/**
 * Merges imported prompts into the existing set.
 * Strategy: If slug matches (or name matches if no slug), overwrite. Otherwise append.
 */
export function mergePrompts(
  existing: CachedPromptEntry[],
  imported: CachedPromptEntry[]
): { merged: CachedPromptEntry[]; results: PromptImportResults } {
  const results: PromptImportResults = { added: 0, updated: 0, total: imported.length, errors: [] };
  const mergedMap = new Map<string, CachedPromptEntry>();

  // Index existing by slug then name
  existing.forEach(e => {
    const key = e.slug || e.name;
    mergedMap.set(key, e);
  });

  imported.forEach(imp => {
    const key = imp.slug || imp.name;
    if (mergedMap.has(key)) {
      results.updated++;
    } else {
      results.added++;
    }
    // Overwrite or add
    mergedMap.set(key, imp);
  });

/**
 * Parses a JSON string and validates its contents as an array of prompts.
 */
export function parsePromptsText(jsonText: string): { valid: CachedPromptEntry[]; errors: string[] } {
  const valid: CachedPromptEntry[] = [];
  const errors: string[] = [];

  try {
    const raw = JSON.parse(jsonText);
    const array = Array.isArray(raw) ? raw : [raw];

    array.forEach((item, index) => {
      const validated = validatePromptEntry(item);
      if (validated) {
        valid.push(validated);
      } else {
        errors.push(`Row ${index + 1}: Invalid prompt schema (requires name and text)`);
      }
    });
  } catch (err) {
    errors.push('Failed to parse JSON: ' + (err instanceof Error ? err.message : String(err)));
  }

  return { valid, errors };
}

