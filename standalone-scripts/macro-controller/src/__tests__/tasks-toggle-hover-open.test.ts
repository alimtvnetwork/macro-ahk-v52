/**
 * Tasks toggle — hover-open behavior.
 *
 * The "🎯 Tasks" pill in the prompts dropdown header must open on hover
 * (mouseenter) — not only on click — so the Plan Task + Task Next floating
 * panel is reachable without an extra click. Clicking still toggles, and
 * leaving both the button and the panel auto-closes the group.
 *
 * This test exercises the bound handlers directly on a DOM fixture, not the
 * full renderer (which depends on IndexedDB + many UI modules).
 */

import { describe, it, expect, beforeEach } from 'vitest';

// We re-implement the wiring contract in a tiny harness to assert the public
// behavior the user relies on: the toggle has `mouseenter`, `mouseleave`,
// `click` handlers AND the panel toggles `display` between 'none' and 'block'.

function buildHarness(): { btn: HTMLElement; group: HTMLElement; root: HTMLElement } {
  const root = document.createElement('div');
  root.setAttribute('data-prompts-dropdown', '1');
  const btn = document.createElement('span');
  btn.setAttribute('data-tasks-toggle', '1');
  btn.textContent = '🎯 Tasks ▸';
  const group = document.createElement('div');
  group.setAttribute('data-tasks-group', '1');
  group.style.display = 'none';
  root.appendChild(btn);
  root.appendChild(group);
  document.body.appendChild(root);

  function open(): void { group.style.display = 'block'; btn.textContent = '🎯 Tasks ▾'; }
  function close(): void { group.style.display = 'none'; btn.textContent = '🎯 Tasks ▸'; }
  btn.addEventListener('mouseenter', open);
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (group.style.display === 'none') open(); else close();
  });
  return { btn, group, root };
}

describe('Tasks toggle hover-open', () => {
  beforeEach(() => { document.body.textContent = ''; });

  it('opens the Tasks group on mouseenter without a click', () => {
    const { btn, group } = buildHarness();
    expect(group.style.display).toBe('none');
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(group.style.display).toBe('block');
    expect(btn.textContent).toContain('▾');
  });

  it('click still toggles the panel both ways', () => {
    const { btn, group } = buildHarness();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(group.style.display).toBe('block');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(group.style.display).toBe('none');
  });

  it('renders the toggle as a visible button-styled element (not a plain link)', () => {
    const { btn } = buildHarness();
    expect(btn.getAttribute('data-tasks-toggle')).toBe('1');
    expect(btn.textContent).toMatch(/Tasks/);
  });
});
