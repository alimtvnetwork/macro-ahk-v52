/**
 * Unit Tests: Prompt IO Logic
 */

import { describe, it, expect, vi } from 'vitest';
import { validatePromptEntry, mergePrompts, parsePromptsText } from '../ui/prompt-io';
import type { CachedPromptEntry } from '../ui/prompt-cache';

describe('Prompt IO Logic', () => {
  
  describe('validatePromptEntry', () => {
    it('should validate a correct entry', () => {
      const entry = { name: 'Test', text: 'Prompt content' };
      const validated = validatePromptEntry(entry);
      expect(validated).not.toBeNull();
      expect(validated?.name).toBe('Test');
      expect(validated?.text).toBe('Prompt content');
    });

    it('should fail on missing text', () => {
      const entry = { name: 'Test' };
      const validated = validatePromptEntry(entry);
      expect(validated).toBeNull();
    });

    it('should sanitize strings', () => {
      const entry = { name: '  Test  ', text: 'content', slug: '  test-slug  ' };
      const validated = validatePromptEntry(entry);
      expect(validated?.name).toBe('Test');
      expect(validated?.slug).toBe('test-slug');
    });
  });

  describe('mergePrompts', () => {
    const existing: CachedPromptEntry[] = [
      { name: 'Existing', text: 'Old content', slug: 'existing' }
    ];

    it('should add new prompts', () => {
      const imported: CachedPromptEntry[] = [
        { name: 'New', text: 'New content', slug: 'new' }
      ];
      const { merged, results } = mergePrompts(existing, imported);
      expect(merged.length).toBe(2);
      expect(results.added).toBe(1);
      expect(results.updated).toBe(0);
    });

    it('should overwrite existing prompts when overwrite=true', () => {
      const imported: CachedPromptEntry[] = [
        { name: 'Existing', text: 'New content', slug: 'existing' }
      ];
      const { merged, results } = mergePrompts(existing, imported, true);
      expect(merged.length).toBe(1);
      expect(merged[0].text).toBe('New content');
      expect(results.updated).toBe(1);
    });

    it('should skip existing prompts when overwrite=false', () => {
      const imported: CachedPromptEntry[] = [
        { name: 'Existing', text: 'New content', slug: 'existing' }
      ];
      const { merged, results } = mergePrompts(existing, imported, false);
      expect(merged.length).toBe(1);
      expect(merged[0].text).toBe('Old content');
      expect(results.updated).toBe(0);
      expect(results.added).toBe(0);
    });

    it('should match by name if slug is missing', () => {
      const existingNoSlug: CachedPromptEntry[] = [{ name: 'NoSlug', text: 'Content' }];
      const imported: CachedPromptEntry[] = [{ name: 'NoSlug', text: 'Updated' }];
      const { merged } = mergePrompts(existingNoSlug, imported);
      expect(merged.length).toBe(1);
      expect(merged[0].text).toBe('Updated');
    });
  });

  describe('parsePromptsText', () => {
    it('should parse valid JSON array', () => {
      const json = JSON.stringify([{ name: 'P1', text: 'T1' }, { name: 'P2', text: 'T2' }]);
      const { valid, errors } = parsePromptsText(json);
      expect(valid.length).toBe(2);
      expect(errors.length).toBe(0);
    });

    it('should parse valid single object', () => {
      const json = JSON.stringify({ name: 'P1', text: 'T1' });
      const { valid } = parsePromptsText(json);
      expect(valid.length).toBe(1);
    });

    it('should return errors for invalid JSON', () => {
      const { valid, errors } = parsePromptsText('invalid json');
      expect(valid.length).toBe(0);
      expect(errors.length).toBe(1);
    });

    it('should skip invalid entries and collect errors', () => {
      const json = JSON.stringify([{ name: 'P1', text: 'T1' }, { text: 'Missing Name' }]);
      const { valid, errors } = parsePromptsText(json);
      expect(valid.length).toBe(1);
      expect(errors.length).toBe(1);
    });
  });
});
