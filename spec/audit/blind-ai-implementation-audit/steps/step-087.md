# Step 87 — readme.txt prohibitions (SP-1..SP-7)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Core rule:** readme.txt — STRICTLY PROHIBITED time/clock/timestamp/git-update

## Reasoning
Highest-priority "trap" rule. Blind LLM will instinctively add timestamps to a README — banned absolutely.

## Findings
- ✅ `scripts/__tests__/check-readme-txt.test.mjs` exists.
- ✅ Mirror docs in `.lovable/strictly-avoid.md` + `spec/01-spec-authoring-guide/09-exceptions.md`.
- 🟢 **Low**: heavily defended via 3 mirrors + test.

## Verdict
**Strong**. SP-1..SP-7 enforcement is exemplary.
