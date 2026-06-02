# C19 — Link Anchor Rot

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** None (clean) — recorded for completeness
**Files affected:** 0

---

## Evidence

```
$ grep -rho '](#[a-z0-9-]*)' --include='*.md' spec/21-app/05-prompts | sort -u | wc -l
0
```

No `](#anchor)` style intra-page links exist. Therefore no anchor rot possible.

## Why this is still tracked

If future fix-passes (e.g. for `93-blind-ai-failure-modes.md`) introduce TOCs with anchors, this issue may resurface. Recording the baseline = 0.

## Atomic sub-tasks

None for this audit cycle. Re-scan after any fix pass.
