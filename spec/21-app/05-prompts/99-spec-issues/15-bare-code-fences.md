# C15 — Bare Code Fences (No Language Hint)

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Low–Medium
**Files affected:** 62 (count of bare ` ``` ` lines)

---

## Rule (implied)

`spec/01-spec-authoring-guide/` example snippets always specify a language hint (` ```md `, ` ```json `, ` ```ts `, ` ```bash `). Bare fences:

- Disable syntax highlighting in GitHub / IDE preview.
- Defeat ` `` ```mermaid ` and ` ```text ` ASCII-diagram rules from `mem://style/diagram-visual-standards`.
- Reduce blind-AI's ability to know whether a block is code, config, or prose.

## Evidence

```
$ grep -rln '^```$' --include='*.md' spec/21-app/05-prompts | wc -l
62
```

62 files contain at least one bare fence. Many are inside ASCII tree diagrams — those should become ` ```text ` per the diagram visual standard.

## Fix outline

For each bare fence:

1. Inspect surrounding context.
2. Tag with the correct language (`text`, `json`, `ts`, `bash`, `md`).
3. Re-run the grep — target: 0 bare fences.

## Atomic sub-tasks

~6 batches of ~10 files = 6 fix tasks.
