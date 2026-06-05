# Variable Syntax — Mustache-Lite

**Created:** 2026-06-02 ()

## Grammar

```
placeholder := "{{" WS* Name WS* "}}"
Name        := [A-Za-z][A-Za-z0-9_]*
WS          := " " | "\t"
```

- Exactly two opening / closing braces.
- Whitespace inside the braces is **optional and trimmed**.
- No dotted paths (`{{ foo.bar }}` → `VariableSyntax`).
- No filters (`{{ foo | upper }}` → `VariableSyntax`).
- No operators (`{{ foo + 1 }}` → `VariableSyntax`).
- No comments (`{{! note }}` → `VariableSyntax`).
- No raw / triple-brace (`{{{ html }}}` → `VariableSyntax`).
- Case-sensitive: `{{ Depth }}` ≠ `{{ depth }}`.

## Escaping a literal `{{`

To emit a literal `{{` in the rendered prompt, double the opening brace:

| In template     | Renders as |
|-----------------|------------|
| `{{ Name }}`    | (substituted value) |
| `\{{ Name }}`   | `{{ Name }}`        |
| `{{ "literal" }}` | rejected — quoted literals are not a variable |

The backslash escape is removed during render. To emit a backslash before a
real placeholder, use two backslashes: `\\{{ Name }}` → `\` + value.

## Whitespace rules

- Leading / trailing whitespace **inside** the braces is trimmed.
- Whitespace **outside** the braces is preserved verbatim:
  - `"Hello, {{ Name }}!"` → `"Hello, Alice!"`.
- Newlines inside braces (`{{\nName\n}}`) are rejected (`VariableSyntax`).

## Multiple references

A single variable may appear any number of times in a body. Resolution runs
once per render; the resolved value is substituted at every site.

```md
RunId={{ RunId }} — see spec/audit/{{ RunId }}/01-gap-analysis.md
```

## Forbidden constructs (summary)

| Construct                | Why                                                |
|--------------------------|----------------------------------------------------|
| `{{# each items }}`      | Templates are name-lookup only                     |
| `{{# if cond }}`         | No control flow                                    |
| `{{ a.b }}` / `{{ a[0] }}` | No dotted / indexed paths                       |
| `{{ a \| filter }}`      | No filters / pipes                                 |
| `{{{ raw }}}`            | No unescaped output (defence in depth)             |
| `{{> partial }}`         | No includes                                        |
| `{{ "string" }}`         | No quoted literals                                 |
| `{{ 42 }}`               | No numeric literals                                |

All of the above raise `Reason="VariableSyntax"` with the offending span in
`ReasonDetail`.

## Output escaping

Substituted values are inserted **verbatim** — no HTML escaping (prompts are
markdown sent to an AI, not HTML rendered in a browser). If a value contains
`{{ … }}`, see `06-validation.md` for the `VariableInjection` guard.
