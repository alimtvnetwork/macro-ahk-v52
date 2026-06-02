# 94 — Revised Readiness Score (Replaces Falsified 100/100)

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)
**Supersedes:** `macros/READINESS-SCORE.md` (falsified — see C70)

## Honest rubric

| # | Dimension | Weight | Score | Justification |
|---|---|---:|---:|---|
| 1 | Concept clarity | 10 | **5** | 3 docs claim canonical (C10, C26, C57). |
| 2 | Step kinds enumerated | 10 | **6** | 8 kinds named; `StepKindId` table incomplete (C58). |
| 3 | Variable system | 10 | **1** | Syntax undefined; mem + spec folder both missing (C29, C67); guard names attacks without naming the placeholder grammar (C45). |
| 4 | JSON contracts | 10 | **3** | `json/` folder absent (C29); `folder-layout/02` exists but unadvertised; SchemaVersion policy missing (C65). |
| 5 | Engine internals | 10 | **6** | 10 docs exist; reserved-slot misuse (C25), Reason enum scattered (C62). |
| 6 | UI surface | 10 | **1** | `ui/` folder absent (C29); error surface drifts from memory (C55). |
| 7 | Guards | 10 | **4** | 5 docs exist; thresholds absent (C42), deny-list unsourced (C41), placeholder grammar undefined (C45). |
| 8 | Observability | 10 | **5** | Schema doc exists but drifts from Core memory (C53); export bundle drifts (C54); UI errors drift (C55). |
| 9 | Testing | 10 | **3** | 5 docs, all without concrete file paths (C46–C50); ban-lift not cited (C47, C48). |
| 10 | Cross-cutting | 10 | **3** | 2/3 memories missing (C66, C67); CHANGELOG fabricated (C72); MIGRATION not executable (C71). |

**HONEST TOTAL: 37 / 100**

(Earlier finger-in-the-air guess of 35-40 in `00-overview.md` was within ±3 of this scorecard.)

## Blind-AI smoke checklist — honest answers

| Question | Answer | Pass? |
|---|---|---|
| What is the exact JSON shape of `MacroDefinition`? | Only in `folder-layout/02`, not advertised | ⚠️ |
| How is `RunId` generated? | Dual authority (C59) | ⚠️ |
| What regex extracts `score: NN/100`? | Cited but file unverified | ⚠️ |
| What is the placeholder syntax for variables? | **UNKNOWN** | ❌ |
| What `Reason` codes does the failure log accept? | **UNKNOWN** (enum not inlined) | ❌ |
| What are the loop-safety thresholds? | **UNKNOWN** (in CHANGELOG only) | ❌ |
| Where do macro audits write to? | `spec/audit/<RunId>/` — clear | ✅ |
| What `chrome.storage.local` keys are read/written? | **UNKNOWN** (C63) | ❌ |
| Is Supabase allowed? | Clear NO | ✅ |
| Where do tests live? | **UNKNOWN** (C28) | ❌ |

**Pass rate: 2 / 10.**

## Path to genuine 100/100

Per C92, ~14 batches of agent work fixes the structural defects to ≈85; another ~6 batches to write the 30 missing docs at production quality.

## Verdict
**Do NOT ship to a blind AI in current state.** Either:
- Run the fix-pass plan (next deliverable), OR
- Accept that human guidance must fill the gaps.
