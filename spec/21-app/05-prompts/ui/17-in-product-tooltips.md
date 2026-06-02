# In-Product Tooltip Generation from GLOSSARY / ACRONYMS

Status: Normative · v1.0.0 · 2026-06-02

## Goal
Every term in `GLOSSARY.md` or `ACRONYMS.md` rendered in the UI gets a
hover/focus tooltip with its definition — without manual wiring per term.

## Pipeline
1. Build step: `scripts/spec/build-tooltip-dict.mjs` reads both docs and emits
   `public/spec-tooltips.json` shaped as `{ [term]: { short, ref } }`.
2. Runtime: a single `<TermTooltip>` component scans rendered text nodes via
   a tree-walker, wraps known terms in `<abbr data-term="…">`, hovers/focus
   show the definition + "Learn more →" link to the spec ref.
3. Dedupe per render to avoid double-wrapping.
4. Respect dark-only theme tokens.

## Constraints
- Wrap only standalone-word matches (`\b` boundaries, case-sensitive for acronyms).
- Skip inside `<code>`, `<pre>`, `<input>`, `<textarea>`, `[contenteditable]`.
- Max 1 wrap per unique term per paragraph (avoid noise).
- Lazy: enabled only on docs/help routes by default; opt-in elsewhere via prop.

## A11y
- `<abbr>` exposes `title`; tooltip uses `aria-describedby`.
- Keyboard: Tab to focus, Esc to close, contrast ≥ 4.5:1.

## Tests
- Unit: dictionary builder produces stable JSON; ignores frontmatter (testing/10).
- Component: walker wraps "BNF" once per paragraph; skips inside `<code>` (testing/11).

## Out of scope
- Translation of definitions (i18n deferred).
- Authoring UI for terms (edit the markdown directly).
