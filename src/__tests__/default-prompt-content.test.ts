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

  it('next prompt requires N steps with reasoning and remaining items', () => {
    const prompt = readPrompt('standalone-scripts/prompts/13-next-tasks/prompt.md');

    expect(prompt).toContain('NEXT ${N} STEPS');
    expect(prompt).toContain('Reasoning');
    expect(prompt).toContain('every remaining item');
  });

  it('next prompt enforces root-cause-before-fix discipline', () => {
    const prompt = readPrompt('standalone-scripts/prompts/13-next-tasks/prompt.md');

    expect(prompt).toContain('STOP and read first');
    expect(prompt).toContain('Root cause before fix');
    expect(prompt).toContain('Definition of done');
  });

  it('bundles the numbered Plan prompt source (v6)', () => {
    const prompt = readPrompt('standalone-scripts/prompts/14-plan-steps/prompt.md');

    expect(prompt).toContain('steps Plan, Maximal Enforcement');
    expect(prompt).toContain('DO NOT execute anything this turn');
    expect(prompt).toContain('Banned actions');
  });
});
