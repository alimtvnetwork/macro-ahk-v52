# Audit — mem://features/prompt-macros (REFERENCED BUT MISSING)

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Finding
`mem://features/prompt-macros` is **referenced 3× from index.md** (Core rule, Memories list, READINESS-SCORE) but the file `.lovable/memory/features/prompt-macros.md` **DOES NOT EXIST**.

```
$ ls .lovable/memory/features/prompt-macros*
ls: cannot access: No such file or directory
```

## Cross-impact
- Index entry line 127 advertises "State machine, persistence, score parsing, 5-tier vars, audit folder, loop safety" but body is unreadable.
- Core rule at index line 32 cites it for audit-root + variable resolution authority.
- READINESS-SCORE dimension #3 (Variable system) implicitly relies on this file.

## Severity
**Critical.** Dangling Core-rule reference = blind AI has nothing to load when looking up "audit-root" or "5-tier resolution" by canonical pointer.

## Fix order
1. Create `.lovable/memory/features/prompt-macros.md` with the contract advertised in index.md, OR
2. Remove all 3 index references and re-anchor Core rule to a spec doc that exists.
