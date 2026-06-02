# Variables — Overview

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

## Why variables exist

A macro re-runs the same audit prompt against different folders, depths, or
target scores. Without variables, every reuse needs a duplicated prompt
file. Variables let one prompt describe a **shape of work**, and the macro
fills in the specifics at run-time.

## When to use a variable vs hard-code

| Situation                                          | Variable? |
|----------------------------------------------------|-----------|
| Folder path the macro audits                       | ✅ yes    |
| Numeric depth / count / threshold                  | ✅ yes    |
| Per-run identifier (`RunId`) injected into the body | ✅ yes (built-in) |
| Spelling, grammar, fixed wording of the prompt     | ❌ no — keep in body |
| Anything that changes the *intent* of the prompt   | ❌ no — author a separate prompt |

Rule of thumb: a variable swaps a **noun**, not a **verb**.

## Worked example

**Prompt body** (`standalone-scripts/macro-prompts/001-audit-spec/prompt.md`):

```md
Audit folder {{ TargetFolder }} to depth {{ Depth }}.

For each issue you find:
- Cite the exact file path.
- Suggest a concrete fix.

End with a single line: `Score: NN / 100`.
```

**Declaration** (`info.json`):

```json
{
  "Slug": "audit-spec",
  "Title": "Audit Spec Folder",
  "Version": "1.0.0",
  "Categories": ["audit"],
  "Variables": [
    { "Name": "TargetFolder", "Type": "string",  "Default": "spec/", "Required": true },
    { "Name": "Depth",        "Type": "integer", "Default": 3,        "Required": true }
  ]
}
```

**Macro call** (`spec-tighten-cycle.macro.json`):

```json
{ "Kind": "audit", "Slug": "audit-spec",
  "Variables": { "TargetFolder": "{{ SpecRoot }}", "Depth": 4 } }
```

`{{ SpecRoot }}` itself resolves from the macro-level `Variables` block
(see `03-resolution-order.md`), so the same macro can target different roots
on different runs without editing the audit prompt.

## What variables are **not**

- Not expressions: `{{ Depth + 1 }}` is rejected (`Reason="VariableSyntax"`).
- Not loops: there is no `{{# each }}` or `{{# if }}`.
- Not partials: prompts cannot include other prompts via `{{> name }}`.

If a use case truly needs branching, author multiple prompts and let the
macro `loop-if` pick between them.
