/**
 * Issue 127 Task 3 — Plan Task row must appear inline in the prompts
 * dropdown body (not only inside the 🎯 Tasks floating panel).
 *
 * Source-level invariants: `_appendHeaderAndSubmenu` must call
 * `renderPlanTaskSubmenu` into an inline container that is appended directly
 * to the prompts dropdown column, marked with `data-inline-plan-row`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'ui', 'prompt-dropdown.ts');

let source = '';
beforeAll(() => { source = readFileSync(SRC, 'utf-8'); });

describe('Prompts dropdown — inline Plan Task row (Issue 127 Task 3)', () => {
  it('marks the inline plan row container with data-inline-plan-row', () => {
    expect(source).toContain("setAttribute('data-inline-plan-row', '1')");
  });

  it('renders Plan Task submenu into the inline row container', () => {
    // Must call renderPlanTaskSubmenu with the inline row element.
    expect(source).toMatch(/renderPlanTaskSubmenu\(inlinePlanRow,\s*ctx\)/);
  });

  it('appends the inline plan row directly to the prompts dropdown column', () => {
    expect(source).toMatch(/container\.appendChild\(inlinePlanRow\)/);
  });

  it('keeps the Tasks floating panel as the backward-compatible host', () => {
    // The tasksGroup still renders both Task Next and Plan Task internally.
    expect(source).toMatch(/renderPlanTaskSubmenu\(tasksGroup,\s*ctx\)/);
  });

  it('inline plan row is added after the tasksGroup but before the filter menu', () => {
    const tasksIdx = source.indexOf('container.appendChild(tasksGroup)');
    const inlineIdx = source.indexOf('container.appendChild(inlinePlanRow)');
    const filterIdx = source.indexOf('renderFilterMenu(container');
    expect(tasksIdx).toBeGreaterThan(0);
    expect(inlineIdx).toBeGreaterThan(tasksIdx);
    expect(filterIdx).toBeGreaterThan(inlineIdx);
  });
});
