# C16 — Mermaid Diagrams Violate ASCII-Only Standard

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Low–Medium
**Files affected:** 2

---

## Rule violated

`mem://style/diagram-visual-standards`: spec diagrams use **ASCII / XMind**, not Mermaid. GitHub Mermaid rendering depends on environment, and a blind AI reading flat text gets noise instead of structure.

## Evidence

```
$ grep -rln '^```mermaid' --include='*.md' spec/21-app/05-prompts | wc -l
2
```

(Full file list deferred to fix-pass — the count itself is what matters here.)

## Why a blind AI fails

When the AI sees ` ```mermaid graph TD; A-->B ` it cannot reliably interpret the structure unless it renders the diagram. Many tooling pipelines skip rendering and pass the raw text — the AI then has to parse Mermaid as prose.

## Fix outline

Convert each Mermaid block to either:

- ` ```text ` ASCII tree (preferred for hierarchies), or
- A markdown table for matrices.

Re-grep for `^```mermaid` until count == 0.

## Atomic sub-tasks

2 file conversions = 2 fix tasks.
