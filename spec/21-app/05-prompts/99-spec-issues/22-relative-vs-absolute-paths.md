# C21 — Relative vs Absolute Paths in Links

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** None (clean) — guardrail recorded
**Files affected:** 0

---

## Evidence

```
$ grep -rln ']\(/spec' --include='*.md' spec/21-app/05-prompts | wc -l
0
$ grep -rln ']\(/[a-z]' --include='*.md' spec/21-app/05-prompts | wc -l
0
```

Zero markdown links use absolute filesystem paths. All path references are either:

- Relative (`../engine/01-state-machine.md`),
- `mem://` URIs (covered by C8),
- Bare code-fenced paths (informational, not links).

## Implication

Compliance with the implicit rule "links must be portable across clones". No fix needed.

## Atomic sub-tasks

None. Add a CI lint to prevent regression (separate ticket).
