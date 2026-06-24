# 63 — Prompts import/export + LLM authoring guideline (deferred from v4.1.0)

**Context.** User request 2026-06-24 included: "add import/export facilities
for the prompts, two ways. So one is that it needs to have a LLM guideline
so that any LLM could understand that in the file and understand how to
create the prompt and create a JSON so that I can import, export it."

**Why deferred.** v4.1.0 release prioritised the urgent UX fix (Split→Plan
rename, no-submit, expanded presets). Import/export touches `prompt-manager`,
SQLite cache, IndexedDB `JsonCopy/HtmlCopy`, plus a schema + LLM-facing
guideline doc — too large to bundle safely with the urgent release.

## Options (recommendation = A)

### A. Schema-validated JSON bundle + Markdown LLM guide  ✅ recommended
Add Export/Import buttons in the Prompts section of Options. Export emits
`prompts-bundle.schema.json`-validated JSON (schema already exists in
`schemas/prompts-bundle.schema.json`). Import validates + merges-or-replaces.
Ship `.lovable/prompts/_authoring-guide-for-llms.md` so any LLM can author
a valid bundle from scratch.

- **Pros:** schema exists already; LLM guide is a single small doc; merge
  semantics already proven by `merge-vs-replace` test suite.
- **Cons:** ~1 day of UI + parser work; needs migration of existing
  in-memory prompts list to bundle round-trip.

### B. Raw JSON paste box only
Minimal: textarea on Options → paste/copy JSON. No file picker, no schema.

- **Pros:** ~1 hour.
- **Cons:** No validation; LLMs will produce invalid JSON; user reported
  this is "very crucial" so the bare-bones path under-delivers.

### C. Per-prompt copy-as-JSON button in the dropdown
Tiny click-to-copy on each row in the prompt dropdown.

- **Pros:** trivial.
- **Cons:** no bulk export, no import at all — doesn't satisfy the request.

## Plan when picked up
1. Author `.lovable/prompts/_authoring-guide-for-llms.md` (schema + 2
   worked examples + do/don't list).
2. Add Export button → serialise current prompts via existing
   `prompts-bundle` writer, validate against schema, download `.json`.
3. Add Import button → file picker → schema validate → merge vs replace
   modal → write through `prompt-manager`.
4. Tests: round-trip, schema-reject, merge-vs-replace already covered for
   storage; add UI smoke test in `src/test/snapshots/Options.snapshot.test.tsx`.
5. Bump minor (v4.2.0), changelog, release.
