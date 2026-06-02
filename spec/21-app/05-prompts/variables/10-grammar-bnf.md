# Variable Grammar — BNF

```bnf
<token>      ::= "{{" <ws>? <name> <ws>? "}}"
<name>       ::= <upper> <name-tail>*
<name-tail>  ::= <alpha> | <digit>
<upper>      ::= "A" | "B" | ... | "Z"
<alpha>      ::= <upper> | "a" | "b" | ... | "z"
<digit>      ::= "0" | "1" | ... | "9"
<ws>         ::= " " | "\t"      ; LF/CR not permitted inside a token
```

## Constraints

- Name MUST start with uppercase ASCII letter.
- Length 1–64 (validator caps at 64).
- No dots, dashes, underscores, or namespacing.
- No logic, conditionals, loops, or helpers. Pure substitution.
- Tokens MUST be on a single line. A newline inside `{{ … }}` makes it invalid → `Reason='MalformedToken'`.

## Escape

Literal `{{` is written `{{ '{{' }}` — no, simpler: prepend a backslash `\{{`. The interpolator strips the backslash and emits `{{` without parsing.

## Multiple tokens per line

Allowed and resolved left-to-right:

```
Run {{ Slug }} on {{ TargetFolder }} at depth {{ Depth }}.
```

## Reserved names

`RunId`, `Now`, `TabId`, `WorkspaceId`, `UserId`, `StepIndex`, `LoopIteration` (see `14-builtin-context-reference.md`). A `MacroDefinition` MAY shadow built-ins only via `Step.Variables[Name]` (step-scoped override) — never via declaration.
