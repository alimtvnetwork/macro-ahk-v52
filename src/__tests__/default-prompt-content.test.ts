import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readPrompt(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('default prompt content', () => {
  it('release prompts define the full release contract', () => {
    const releasePrompts = [
      readPrompt('standalone-scripts/prompts/08-minor-bump/prompt.md'),
      readPrompt('standalone-scripts/prompts/09-major-bump/prompt.md'),
      readPrompt('standalone-scripts/prompts/10-patch-bump/prompt.md'),
    ].join('\n');

    expect(releasePrompts).toContain('Release trigger rule');
    expect(releasePrompts).toContain('version.json');
    expect(releasePrompts).toContain('fallback copies');
    expect(releasePrompts).toContain('root readme');
  });

  it('next prompt requires same-turn execution and remaining task numbering', () => {
    const prompt = readPrompt('standalone-scripts/prompts/13-next-tasks/prompt.md');

    expect(prompt).toContain('Execute the next pending task now');
    expect(prompt).toContain('same turn');
    expect(prompt).toContain('flat numbered remaining-tasks list');
  });

  it('repeat prompt clarifies that repeated submissions require Start', () => {
    const prompt = readPrompt('standalone-scripts/prompts/13-next-tasks/prompt.md');

    expect(prompt).toContain('Do one logical task at a time');
    expect(prompt).toContain('repeated submissions require the dedicated Repeat `▶ Start` control');
  });
});