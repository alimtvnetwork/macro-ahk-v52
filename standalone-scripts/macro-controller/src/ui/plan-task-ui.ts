/**
 * Plan Task UI — Inline accordion mirror of Task Next, but injects a
 * "plan this task in N steps" prompt instead of running a multi-task loop.
 *
 * Single source of truth for the Plan Task prompt template.
 */

import { cPanelFg, cPrimary, cPrimaryLight, cBtnMenuHover, lDropdownRadius } from '../shared-state';
import { pasteIntoEditor, showPasteToast } from './prompt-utils';
import type { PromptContext } from './prompt-loader';
import { getPromptsConfig } from './prompt-loader';
import { getByXPath } from '../xpath-utils';

// Plan sequence (v3.63.0): increasing-gap progression requested by user 2026-06-19.
// 2,3,5,8,10,12,14,15,18,20,22,25,28,30,32,35,38,40,42,45,48,50,52,55,58,60,70,80,100,150,200
const PLAN_TASK_STEP_COUNTS = [
  2, 3, 5, 8, 10, 12, 14, 15, 18, 20,
  22, 25, 28, 30, 32, 35, 38, 40, 42, 45,
  48, 50, 52, 55, 58, 60, 70, 80, 100, 150, 200,
];

/** Build the canonical Plan Task prompt for N steps. */
export function buildPlanTaskPrompt(n: number): string {
  return [
    '# Plan in ' + n + '-Steps Plan (v7) — Evidence Enforcement',
    '',
    '> **Category:** `Plan` (dynamic — N is parsed from this header)',
    '> **Slug:** `plan-' + n + '`',
    '',
    'Parse the **N** in this prompt\'s header. That number is the EXACT count of steps in the plan you must write. Not N-1. Not N+1. If you cannot find N, STOP and ask.',
    '',
    '## Rules — non-negotiable',
    '',
    '1. **DO NOT execute anything this turn.** No code edits, no migrations, no installs. The only artifact this turn is the plan file and any subtask / command / issue files described below.',
    '2. **DO NOT open plan mode. DO NOT call any plan-approval tool.** No `plan--create`. No approval prompts. Write plain markdown files directly with file-writing tools.',
    '3. **One task = one file.** Path: `.lovable/plans/pending/XX-<slug>.md`, where `XX` is the next free 2-digit sequence across pending and completed plans.',
    '4. **Scan `.lovable/` first** including memory, existing pending/completed plans, subtasks, commands, and issues. Append unresolved pending tasks into the new plan before producing the ' + n + ' steps.',
    '5. **Lifecycle:** new plan goes to `.lovable/plans/pending/`; before completion fill `## Evidence`; when done move it to `.lovable/plans/completed/` and flip status to completed.',
    '6. **Ambiguity = ask.** If request, scope, or N is unclear, ask clarifying questions first. Do not invent steps to pad to ' + n + '.',
    '',
    '## Single-task append rule',
    '',
    'Picking "Plan ' + n + '" from the prompt dropdown only appends this body to the chat box. It does **not** submit and does **not** auto-repeat. Repetition belongs only to the separate Repeat `▶ Start` control.',
    '',
    '## Plan file shape',
    '',
    '# <Task title>',
    '',
    '**Slug:** <slug>',
    '**Steps:** ' + n,
    '**Status:** pending',
    '**Created:** <YYYY-MM-DD>',
    '',
    '## Context',
    '<What + why, files involved, and links to captured commands/issues.>',
    '',
    '## Steps',
    '1. <step 1 — concrete, verifiable>',
    '2. <step 2>',
    '... exactly ' + n + ' items, no more, no less ...',
    '',
    '## Verification',
    '<How each step will be verified — build, logs, preview, tests, screenshots.>',
    '',
    '## Evidence',
    '- Before: <initial failing signal or pending until execution>',
    '- After: <passing signal to paste before moving to completed>',
    '- Proof: <command output, log line, screenshot note, or artifact link>',
    '',
    '## Checklist',
    '',
    '- [ ] Parsed N from this prompt header as ' + n,
    '- [ ] Scanned `.lovable/` and listed prior pending tasks',
    '- [ ] Wrote EXACTLY ' + n + ' steps',
    '- [ ] Did NOT execute the plan',
    '- [ ] Did NOT call any plan-mode / plan-approval tool',
  ].join('\n');
}

function adapterGetByXPath(xpath: string): Element | null {
  const node = getByXPath(xpath);
  return node instanceof Element ? node : null;
}

function injectPlanPrompt(n: number): void {
  console.log('[PlanTask] Injecting plan prompt for ' + n + ' steps');
  const text = buildPlanTaskPrompt(n);
  const outcome = pasteIntoEditor(text, getPromptsConfig(), adapterGetByXPath);
  console.log('[PlanTask] Injection outcome: ' + outcome);
  // Success ('injected') and clipboard-fallback ('clipboard') already toast from prompt-utils.
  // Only show a caller-side toast on hard failure.
  if (String(outcome) === 'failed') showPasteToast('❌ Plan prompt: injection failed', true);
}

/** Render the Plan Task inline accordion into the container. */
export function renderPlanTaskSubmenu(container: HTMLElement, ctx: PromptContext): void {
  const { item, sub } = buildShell(ctx);
  appendPresetSteps(sub, ctx.promptsDropdown);
  appendCustomStepRow(sub, ctx.promptsDropdown);
  container.appendChild(item);
}

function buildShell(ctx: PromptContext): { item: HTMLElement; sub: HTMLElement } {
  const item = document.createElement('div');
  item.style.cssText = 'border-bottom:1px solid rgba(124,58,237,0.3);';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;cursor:pointer;font-size:11px;color:' + cPrimaryLight + ';font-weight:600;';
  row.textContent = '🧠 Plan Task';
  const arrow = document.createElement('span');
  arrow.textContent = '▸';
  arrow.style.cssText = 'font-size:10px;margin-left:4px;';
  row.appendChild(arrow);

  const sub = document.createElement('div');
  sub.setAttribute('data-plan-task-sub', '1');
  sub.style.cssText = 'display:none;position:static;margin:0 6px 6px 6px;max-height:240px;overflow-y:auto;background:rgba(0,0,0,0.18);border:1px solid ' + cPrimary + ';border-radius:' + lDropdownRadius + ';';
  item.appendChild(row);
  item.appendChild(sub);
  wireShellToggle(row, arrow, sub, ctx.promptsDropdown);
  return { item, sub };
}

function wireShellToggle(row: HTMLElement, arrow: HTMLElement, sub: HTMLElement, dropdown: HTMLElement): void {
  const show = function(): void {
    row.style.background = cBtnMenuHover;
    arrow.textContent = '▾';
    sub.style.display = 'block';
    keepInView(dropdown, sub);
  };
  const hide = function(): void {
    row.style.background = 'transparent';
    arrow.textContent = '▸';
    sub.style.display = 'none';
  };
  row.onclick = function(e: Event) {
    e.stopPropagation();
    if (sub.style.display === 'none') show(); else hide();
  };
  // RC-3 fix: do NOT auto-collapse on mouseleave. Outside-click handler in prompts-dropdown.ts
  // already closes the parent dropdown (and therefore this sub) when the user clicks away.
  // The previous 120ms timeout raced with preset clicks that crossed the panel border.
}

function keepInView(dropdown: HTMLElement, sub: HTMLElement): void {
  window.requestAnimationFrame(function() {
    const dr = dropdown.getBoundingClientRect();
    const sr = sub.getBoundingClientRect();
    if (sr.bottom > dr.bottom) dropdown.scrollTop += Math.ceil(sr.bottom - dr.bottom + 6);
  });
}

function appendPresetSteps(sub: HTMLElement, dropdown: HTMLElement): void {
  for (const n of PLAN_TASK_STEP_COUNTS) {
    const it = document.createElement('div');
    it.style.cssText = 'padding:5px 12px;cursor:pointer;font-size:10px;color:' + cPanelFg + ';';
    it.textContent = 'Plan ' + n;
    it.onmouseover = function() { (this as HTMLElement).style.background = cBtnMenuHover; };
    it.onmouseout = function() { (this as HTMLElement).style.background = 'transparent'; };
    it.onclick = function(e: Event) {
      e.stopPropagation();
      injectPlanPrompt(n);
      dropdown.style.display = 'none';
    };
    sub.appendChild(it);
  }
}

function appendCustomStepRow(sub: HTMLElement, dropdown: HTMLElement): void {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:4px;padding:5px 12px;border-top:1px solid rgba(124,58,237,0.2);';
  const lbl = document.createElement('span');
  lbl.textContent = 'Custom:';
  lbl.style.cssText = 'font-size:10px;color:' + cPrimaryLight + ';';
  row.appendChild(lbl);
  const inp = document.createElement('input');
  inp.type = 'number'; inp.min = '1'; inp.max = '999'; inp.placeholder = '#';
  inp.style.cssText = 'width:50px;padding:3px 5px;background:rgba(0,0,0,0.3);border:1px solid rgba(124,58,237,0.3);border-radius:4px;color:' + cPanelFg + ';font-size:10px;';
  inp.onclick = function(e: Event) { e.stopPropagation(); };
  row.appendChild(inp);
  const go = document.createElement('span');
  go.textContent = '▶'; go.title = 'Plan';
  go.style.cssText = 'cursor:pointer;font-size:11px;color:' + cPrimary + ';';
  go.onclick = function(e: Event) {
    e.stopPropagation();
    const n = parseInt(inp.value, 10);
    if (!n || n < 1 || n > 999) { showPasteToast('⚠️ Enter 1–999', true); return; }
    injectPlanPrompt(n);
    dropdown.style.display = 'none';
  };
  inp.onkeydown = function(e: KeyboardEvent) { if (e.key === 'Enter') { e.stopPropagation(); go.click(); } };
  row.appendChild(go);
  sub.appendChild(row);
}
