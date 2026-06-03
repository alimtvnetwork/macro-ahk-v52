# 01 — Pre-flight checklist

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T116

Before any code lands, confirm every `???` from the integration questionnaire (T101) has a real value.

| # | Question | Owner | Status |
|---|---------|-------|--------|
| Q1 | Chat-box selector / XPath | Host integrator | ☐ |
| Q2 | Submit-button selector | Host integrator | ☐ |
| Q3 | Interruption banner selector | Host integrator | ☐ |
| Q4 | Editor kind (textarea / contenteditable / ProseMirror / Lexical / Monaco) | Host integrator | ☐ |
| Q5 | Authenticated probe (cookie / endpoint / DOM) | Host integrator | ☐ |
| Q6 | Default delay window (default 5–10 s) | Product | ☐ |
| Q7 | Max queue size (default 999) | Product | ☐ |
| Q8 | Settings storage backend (default `localStorage`) | Host integrator | ☐ |

**Gate:** Do not start wire-up until every row is ticked. Selector drift detected later is treated as a host bug, not a spec bug.
