# All Prompt Samples — Index

**Total prompts:** 16

| Seq | Name | Category | Slug |
|-----|------|----------|------|
| 01 | Start Prompt | — | start-prompt |
| 03 | Rejog the Memory v1 | — | rejog-the-memory-v1 |
| 04 | Unified AI Prompt v4 | — | unified-ai-prompt-v4 |
| 05 | Issues Tracking | — | issues-tracking |
| 06 | Unit Test Failing | — | unit-test-failing |
| 07 | Audit Spec v1 | general | audit-spec-v1 |
| 08 | Minor Bump | versioning | minor-bump |
| 09 | Major Bump | versioning | major-bump |
| 10 | Patch Bump | versioning | patch-bump |
| 11 | Code Coverage Basic | code-coverage | code-coverage-basic |
| 12 | Code Coverage Details | code-coverage | code-coverage-details |
| 13 | Next Tasks | automation | next-tasks |
| 14 | Unit Test Issues V2 Enhanced | code-coverage | unit-test-issues-v2-enhanced |
| 15 | Read Memory | onboarding | read-memory |
| 16 | Write Memory | onboarding | write-memory |
| 20 | Conversation Log | memory | conversation-log |

---

## Sub-sections

The Prompts subsystem now spans three concept areas. Detailed specs live in
sibling folders:

| Folder | Purpose | Index |
|--------|---------|-------|
| [`macros/`](./macros/) | Chained, multi-step prompt automation with audit loops | [`macros/README.md`](./macros/README.md) |
| [`macro-prompts/`](./macro-prompts/) | Template-heavy prompts invoked only by macros | (Block 3) |
| [`variables/`](./variables/) | `{{ Variable }}` templating shared by prompts + macros | (Block 2) |
| [`ui/`](./ui/) | Prompts button + panel + Macros tab UX | (Block 5) |
| [`json/`](./json/) | Save / Export / Import / Replace JSON contracts | (Block 6) |

See `.lovable/plans/prompt-macros-50-step.md` for the authoring plan
(100 tasks, 10 blocks of 10).
