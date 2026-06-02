# 91 — Severity Matrix

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

| Severity | Count | Category IDs |
|---|---:|---|
| **CRITICAL** | 14 | C29, C41, C42, C45, C53, C57, C58, C61, C62, C63, C66, C67, C70, C72 |
| **High** | 17 | C5/C25, C6, C8, C10/C26, C27, C28, C36 batch (37, 39, 40), C43, C44, C47, C48, C50, C51, C52, C54, C55, C60, C64, C65, C68, C69, C71 |
| **Medium** | 8 | C2, C7, C9, C13, C49, C46 (testing baseline), C38, C59 |
| **Low / Clean** | 8 | C14, C15 (hygiene), C19, C20, C21, C22, C23, C24 |

## Critical hotspots (top 5)
1. **C29** — 30 planned spec docs absent across 4 folders.
2. **C70** — READINESS-SCORE 100/100 is fabricated; honest score ~40.
3. **C66 + C67** — 2 of 3 advertised memory files don't exist; Core rule breaks.
4. **C62** — Failure-mode taxonomy is de-facto canonical but not declared, drifts from `mem://standards/verbose-logging-and-failure-diagnostics`.
5. **C63** — Storage-contract doc doesn't cite Phase 2c PascalCase ban (`mem://constraints/no-storage-pascalcase-migration`).

## Severity distribution chart (text)
```
CRITICAL ██████████████ 14
High     █████████████████ 17
Medium   ████████ 8
Low      ████████ 8
```

47 actionable categories total (Critical + High + Medium).
