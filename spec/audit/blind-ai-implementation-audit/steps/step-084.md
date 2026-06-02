# Step 84 — Task execution pattern (RCA → tasks → "next")

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://workflow/task-execution-pattern`, `mem://preferences/next-command-convention`

## Reasoning
"`next` = always DO + flat numbered remaining list" is a tight contract a blind LLM must honor.

## Findings
- ✅ Convention documented; pattern proven across batches 1–8 of THIS audit.
- 🟡 **Med**: no automated lint of agent responses — relies on memory recall.
- 🟢 **Low**: no example response template in `.lovable/`.

## Recommendation
Add `.lovable/templates/next-response.md` skeleton.
