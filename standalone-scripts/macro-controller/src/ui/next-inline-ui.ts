/**
 * Inline strips above the Lovable chat textarea — order top→bottom:
 *   1) 📋 Plan  → click number → APPEND Plan-${N} prompt to chat (no submit)
 *   2) ▶ Next  → click number → APPEND Next-${N}-steps prompt to chat (no submit)
 *   3) 🔁 Repeat (mounted by repeat-loop-ui.ts) — the ONLY executor: submits + loops.
 *
 * Plan and Next are paste-only stagers. They never call submit, never loop,
 * never chain into Repeat. The user reviews/edits the staged text and presses
 * Enter (or 🔁 Repeat) themselves.
 *
 * Decoupling invariant: INLINE_AUTOCHAIN_DISABLED must remain true. See plan
 * `.lovable/plans/pending/09-three-strip-decoupled-plan-next-repeat.md`.
 */

import { log } from '../logging';
import { logError } from '../error-utils';
import { showPasteToast, pasteIntoEditor, findPasteTarget } from './prompt-utils';
import { DEFAULT_PROMPTS, getPromptsConfig } from './prompt-manager';
import { getByXPath } from '../xpath-utils';
import { taskNextState, findNextTasksPrompt, type TaskNextDeps } from './task-next-ui';
import { triggerPlanPasteFromInline, isSplitterRunning } from './task-splitter-ui';
import { cPanelFg, cPrimaryLight, cSectionBg } from '../shared-state';
import {
  applyInlineStripGroupCollapse,
  getInlineStripGroupCollapsed,
  subscribeInlineStripGroupCollapse,
  toggleInlineStripGroupCollapsed,
} from './inline-strip-group-collapse';

/** Hard guard: Plan/Next strips MUST NOT auto-trigger Repeat or each other. */
export const INLINE_AUTOCHAIN_DISABLED = true;

const NEXT_PRESETS = [1, 2, 3, 4, 5, 8] as const;
const NEXT_PRESETS_HIGHLIGHT = new Set<number>([2, 5]);
const PLAN_PRESETS = [
  5, 10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50,
  52, 55, 58, 60, 70, 80, 100, 125, 150, 200,
] as const;
const PLAN_PRESETS_HIGHLIGHT = new Set<number>([5, 10, 12, 15, 30]);
const PLAN_MIN = 2;
const PLAN_MAX = 200;
const CSS_HINT_LABEL = 'font-size:10px;opacity:0.8;';

interface NextPromptEntry {
  name?: string;
  slug?: string;
  text?: string;
  replaceKey?: string;
}

function buildGroupToggleButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = 'Hide / show Plan, Next, and Repeat controls';
  btn.dataset.role = 'inline-group-toggle';
  btn.style.cssText = 'margin-left:4px;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.18);border-radius:4px;color:' + cPanelFg + ';cursor:pointer;font-size:15px;font-weight:700;line-height:1;';
  const render = (): void => {
    const collapsed = getInlineStripGroupCollapsed();
    btn.textContent = collapsed ? '+' : '−';
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  };
  render();
  subscribeInlineStripGroupCollapse(render);
  btn.onclick = function (ev) {
    ev.stopPropagation();
    toggleInlineStripGroupCollapsed();
    applyInlineStripGroupCollapse();
  };
  return btn;
}

// ── Next stager (paste-only) ────────────────────────────────────────

function readEditorText(): string {
  const target = findPasteTarget(getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
  if (!target) return '';
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return target.value || '';
  return (target as HTMLElement).innerText || (target as HTMLElement).textContent || '';
}

function substituteNextValue(text: string, key: string, n: number): string {
  return text.split('${' + key + '}').join(String(n));
}

function findNextVariant(entries: NextPromptEntry[], n: number): string | null {
  const slug = 'next-' + n + '-steps';
  for (const e of entries) {
    if ((e.slug || '').toLowerCase() === slug && e.text) return e.text;
  }
  return null;
}

function findNextTemplate(entries: NextPromptEntry[], n: number, source: string): string | null {
  for (const e of entries) {
    if ((e.slug || '').toLowerCase() !== 'next-steps' || !e.text) continue;
    const key = e.replaceKey || 'N';
    log('NextInline.resolve: using raw next template from ' + source + ' for N=' + n, 'info');
    return substituteNextValue(e.text, key, n);
  }
  return null;
}

function resolveNextVariantText(deps: TaskNextDeps, n: number): string | null {
  const entries = (deps.getPromptsConfig().entries || []) as NextPromptEntry[];
  const variant = findNextVariant(entries, n);
  if (variant) return variant;
  const template = findNextTemplate(entries, n, 'loaded prompts') || findNextTemplate(DEFAULT_PROMPTS, n, 'DEFAULT_PROMPTS');
  if (template) return template;

  // Fallback: legacy single static "Next Tasks" prompt
  const legacy = findNextTasksPrompt(deps);
  return legacy && legacy.text ? legacy.text : null;
}

/**
 * Paste-only stager for the Next strip. Appends the Next-${N}-steps prompt
 * body to whatever is already in the chat box. Never submits, never loops.
 */
export async function stageNextPrompt(deps: TaskNextDeps, n: number): Promise<void> {
  if (taskNextState.running || isSplitterRunning()) {
    showPasteToast('⏸ Another run is in progress', true);
    return;
  }
  const text = resolveNextVariantText(deps, n);
  if (!text) {
    showPasteToast('❌ Next ' + n + ': prompt not found in library', true);
    logError('NextInline', 'next-' + n + '-steps prompt missing');
    return;
  }
  const existing = readEditorText();
  const combined = existing.trim().length > 0
    ? existing.replace(/\s+$/, '') + '\n\n' + text
    : text;
  try {
    const outcome = await pasteIntoEditor(combined, getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
    if (String(outcome) === 'failed') {
      showPasteToast('❌ Next ' + n + ': paste failed', true);
      return;
    }
    log('NextInline.stage: appended Next ' + n + ' (' + text.length + ' chars) — no submit', 'info');
    showPasteToast('📝 Next ' + n + ' staged — press Enter to send', false);
  } catch (e) {
    logError('NextInline', 'stageNextPrompt threw', e);
    showPasteToast('❌ Next ' + n + ': paste threw', true);
  }
}

// ── Plan strip (paste-only, unchanged behaviour) ─────────────────────

function planClickHandler(n: number): void {
  if (taskNextState.running || isSplitterRunning()) {
    showPasteToast('⏸ Another run is in progress', true);
    return;
  }
  const clamped = Math.max(PLAN_MIN, Math.min(PLAN_MAX, n));
  void triggerPlanPasteFromInline(clamped);
}

function makePlanPresetButton(n: number, highlighted: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = String(n);
  b.title = 'Append "Plan ' + n + '" to the chat box (no submit)';
  const bg = highlighted ? 'rgba(245,158,11,0.55)' : 'rgba(245,158,11,0.12)';
  const border = highlighted ? '1px solid rgba(245,158,11,0.85)' : '1px solid rgba(245,158,11,0.3)';
  const weight = highlighted ? '700' : '500';
  b.style.cssText = 'padding:3px 8px;background:' + bg + ';border:' + border + ';border-radius:4px;color:' + cPanelFg + ';cursor:pointer;font-size:11px;font-weight:' + weight + ';';
  b.onclick = function () { planClickHandler(n); };
  return b;
}

function buildPlanDropup(anchor: HTMLElement): HTMLElement {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;bottom:calc(100% + 4px);right:0;display:none;grid-template-columns:repeat(6,auto);gap:4px;padding:8px;background:#1a1a2e;border:1px solid rgba(245,158,11,0.6);border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,0.5);z-index:2147483646;';
  panel.dataset.role = 'plan-dropup';
  for (const n of PLAN_PRESETS) {
    const b = makePlanPresetButton(n, PLAN_PRESETS_HIGHLIGHT.has(n));
    b.addEventListener('click', function () { panel.style.display = 'none'; });
    panel.appendChild(b);
  }
  anchor.appendChild(panel);
  const closer = (ev: MouseEvent): void => {
    if (panel.style.display === 'none') return;
    if (ev.target instanceof Node && anchor.contains(ev.target)) return;
    panel.style.display = 'none';
  };
  document.addEventListener('click', closer, true);
  return panel;
}

function buildSplitStrip(): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 6px;background:' + cSectionBg + ';border:1px solid rgba(245,158,11,0.35);border-radius:6px;font-family:system-ui,-apple-system,sans-serif;color:' + cPanelFg + ';font-size:11px;box-sizing:border-box;';

  const label = document.createElement('span');
  label.textContent = '📋 Plan · ▶ Next · 🔁 Repeat';
  label.style.cssText = 'font-weight:600;color:#fbbf24;cursor:pointer;';
  root.appendChild(label);

  const body = document.createElement('span');
  body.dataset.role = 'plan-body';
  body.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1;';

  const hint = document.createElement('span');
  hint.textContent = 'click a number to add (no submit)';
  hint.style.cssText = CSS_HINT_LABEL;
  body.appendChild(hint);

  for (const n of PLAN_PRESETS) {
    if (!PLAN_PRESETS_HIGHLIGHT.has(n)) continue;
    body.appendChild(makePlanPresetButton(n, true));
  }

  const moreWrap = document.createElement('span');
  moreWrap.style.cssText = 'position:relative;margin-left:auto;display:inline-block;';
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.textContent = 'More ▴';
  moreBtn.title = 'Show all plan sizes';
  moreBtn.dataset.role = 'plan-more-btn';
  moreBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;color:#1a1a2e;background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%);box-shadow:0 2px 6px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.25);';
  moreWrap.appendChild(moreBtn);
  const panel = buildPlanDropup(moreWrap);
  moreBtn.onclick = function (ev) {
    ev.stopPropagation();
    panel.style.display = panel.style.display === 'grid' ? 'none' : 'grid';
  };
  body.appendChild(moreWrap);

  root.appendChild(body);

  const toggle = buildGroupToggleButton();
  root.appendChild(toggle);
  label.onclick = function () { toggle.click(); };
  subscribeInlineStripGroupCollapse(function () { applyInlineStripGroupCollapse(); });
  applyInlineStripGroupCollapse();

  return root;
}

// ── Next strip (preset-row stager, paste-only) ──────────────────────

function makeNextPresetButton(deps: TaskNextDeps, n: number, highlighted: boolean): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = String(n);
  b.title = 'Append "Next ' + n + ' steps" to the chat box (no submit)';
  const bg = highlighted ? 'rgba(124,58,237,0.55)' : 'rgba(124,58,237,0.15)';
  const border = highlighted ? '1px solid rgba(124,58,237,0.85)' : '1px solid rgba(124,58,237,0.3)';
  const weight = highlighted ? '700' : '500';
  b.style.cssText = 'padding:3px 8px;background:' + bg + ';border:' + border + ';border-radius:4px;color:' + cPanelFg + ';cursor:pointer;font-size:11px;font-weight:' + weight + ';';
  b.onclick = function () { void stageNextPrompt(deps, n); };
  return b;
}

function buildNextStrip(deps: TaskNextDeps): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 6px;background:' + cSectionBg + ';border:1px solid rgba(124,58,237,0.25);border-radius:6px;font-family:system-ui,-apple-system,sans-serif;color:' + cPanelFg + ';font-size:11px;box-sizing:border-box;';

  const label = document.createElement('span');
  label.textContent = '▶ Next';
  label.style.cssText = 'font-weight:600;color:' + cPrimaryLight + ';cursor:pointer;';
  root.appendChild(label);

  const body = document.createElement('span');
  body.dataset.role = 'next-body';
  body.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1;';

  const hint = document.createElement('span');
  hint.textContent = 'click a number to add (no submit)';
  hint.style.cssText = CSS_HINT_LABEL;
  body.appendChild(hint);

  for (const n of NEXT_PRESETS) {
    body.appendChild(makeNextPresetButton(deps, n, NEXT_PRESETS_HIGHLIGHT.has(n)));
  }

  root.appendChild(body);

  return root;
}

// ── Mount above chat box ────────────────────────────────────────────

const INLINE_ID = 'marco-next-inline';
const SPLIT_ID = 'marco-split-inline';

function tryMountInline(deps: TaskNextDeps): boolean {
  if (!INLINE_AUTOCHAIN_DISABLED) {
    logError('NextInline', 'INLINE_AUTOCHAIN_DISABLED flipped — refusing to mount');
    return true;
  }
  if (document.getElementById(INLINE_ID) && document.getElementById(SPLIT_ID)) return true;
  const target = findPasteTarget(getPromptsConfig(), (xp) => getByXPath(xp) as Element | null);
  if (!target) return false;
  const host = (target.closest && target.closest('form')) || target.parentElement;
  if (!host || !host.parentElement) return false;

  // Order top→bottom: Plan → Next → (Repeat strip mounts after, closest to chat).
  if (!document.getElementById(SPLIT_ID)) {
    const splitStrip = buildSplitStrip();
    splitStrip.id = SPLIT_ID;
    splitStrip.style.margin = '4px 0 2px';
    host.parentElement.insertBefore(splitStrip, host);
  }
  if (!document.getElementById(INLINE_ID)) {
    const strip = buildNextStrip(deps);
    strip.id = INLINE_ID;
    strip.style.margin = '0 0 2px';
    const splitStrip = document.getElementById(SPLIT_ID);
    if (splitStrip && splitStrip.parentElement) {
      splitStrip.parentElement.insertBefore(strip, splitStrip.nextSibling);
    } else {
      host.parentElement.insertBefore(strip, host);
    }
  }
  applyInlineStripGroupCollapse();
  log('NextInline: strips mounted (plan + next, paste-only) above chat box', 'info');
  return true;
}

let _observer: MutationObserver | null = null;

/**
 * v4.11+: Plan and Next inline strips above the chat textarea are HIDDEN by
 * default. They have been folded into the prompts dropdown header. Set
 * `window.__MARCO_SHOW_LEGACY_INLINE_STRIPS__ = true` before mount to restore.
 * Tracking: .lovable/question-and-ambiguity/64-compact-plan-next-into-prompts-dropdown.md
 */
// v4.14.1: restored — user relies on inline Plan/Next strips above the chat.
// The dropdown tabs are an additional surface, not a replacement.
export const SHOW_LEGACY_INLINE_STRIPS = true;

function isLegacyStripsEnabled(): boolean {
  if (SHOW_LEGACY_INLINE_STRIPS) return true;
  const w = (typeof window !== 'undefined' ? window : {}) as Record<string, unknown>;
  return w['__MARCO_SHOW_LEGACY_INLINE_STRIPS__'] === true;
}

export function mountNextInlineStrip(deps: TaskNextDeps): void {
  if (!isLegacyStripsEnabled()) {
    // Strips suppressed — remove any pre-existing mounts so the UI is clean.
    const a = document.getElementById(INLINE_ID);
    if (a && a.parentElement) a.parentElement.removeChild(a);
    const b = document.getElementById(SPLIT_ID);
    if (b && b.parentElement) b.parentElement.removeChild(b);
    return;
  }
  if (tryMountInline(deps)) return;
  if (_observer) return;
  _observer = new MutationObserver(function () {
    if (typeof document === 'undefined' || !document.body) return;
    if (!document.getElementById(INLINE_ID) || !document.getElementById(SPLIT_ID)) tryMountInline(deps);
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}
