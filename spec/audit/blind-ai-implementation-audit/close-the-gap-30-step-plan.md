# Close-the-Gap Plan — 96 → 100 (30 Steps)

**Goal:** Recover the 4 deducted points in the Blind-AI Implementation Readiness audit and reach 100/100.

**Current score:** 96/100
**Deductions to recover:**
- **−1 Genericization** (220 raw `RiseupAsiaMacroExt` placeholders left in spec)
- **−2 Timer/Observer Hygiene** (50 audit findings remaining, target 0 P0+P1)
- **−1 Worked Examples** (missing code block in `spec/04-failure-modes.md`; thin examples across spec)

**Execution rule:** User says **"next 10"** → AI executes exactly 10 sequential steps in one turn. Numbering is stable; do not renumber.

---

## Block 1 — Worked Examples (+1 pt) — Steps 1–10

1. Add a complete, runnable code block to `spec/04-failure-modes.md` for the "swallowed error" anti-pattern (bad → good with `Logger.error`).
2. Add code blocks for the "retry/backoff" anti-pattern in `spec/04-failure-modes.md` (bad recursive retry → sequential fail-fast).
3. Add code blocks for the "storage key rewrite" anti-pattern in `spec/04-failure-modes.md` (illegal PascalCase migration → identity-only mapping).
4. Add a worked `getBearerToken()` end-to-end example to `spec/02-non-negotiables.md` (call site → token → fail-fast).
5. Add a complete failure-log JSON example (Reason, ReasonDetail, SelectorAttempts[], VariableContext[]) to `spec/03-error-manage/README.md`.
6. Add a worked timer-teardown example (install + pagehide + clearTimeout) to `mem://standards/timer-and-observer-teardown` mirror in spec.
7. Add a worked `useEffect` cleanup React example to `spec/07-design-system/README.md` (or nearest UI spec).
8. Add a worked `<NAMESPACE>.Logger.error()` call site in `spec/01-quickstart-for-blind-ai.md`.
9. Add a worked storage-router code sketch to `spec/audit/blind-ai-implementation-audit/steps/step-024.md` follow-up note.
10. Cross-link every new example from `spec/03-decision-tree.md` so the decision flow lands on a concrete sample.

## Block 2 — Timer/Observer Hygiene (+2 pt) — Steps 11–22

11. Fix `src/components/options/monaco-js-intellisense.ts` — pair all 13 installers with teardown + `pagehide`.
12. Fix `src/components/popup/BootFailureBanner.tsx`.
13. Fix `src/components/popup/PopupFooter.tsx`, `InjectionCopyButton.tsx`.
14. Fix `src/components/popup/InjectionErrorPanel.tsx`, `DependencyChainPanel.tsx`, `SessionCopyButton.tsx`.
15. Fix `src/components/popup/DebugPanel.tsx`, `QuickActions.tsx`, `ScriptsList.tsx`, `SqliteBundleActions.tsx`.
16. Fix `src/lib/spa-reinject.ts`, `src/lib/message-relay.ts`.
17. Fix `src/lib/prompt-injector.ts`, `src/lib/click-trail.ts`, `src/lib/marco-sdk-template.ts`.
18. Fix `src/hooks/use-onboarding.ts`, `use-popup-actions.ts`, `use-toast.ts`.
19. Fix `src/options/sections/*` remaining hits (DiagnosticsPanel, ProjectEditor, ProjectsSection).
20. Fix `src/platform/chrome-adapter.ts`, `src/platform/preview-adapter.ts`, plus `lib/condition-evaluators.ts`, `lib/generate-llm-guide.ts`.
21. Update `scripts/audit-timer-teardown.mjs` to ignore `__tests__/**` and `*.generated.ts`; re-baseline `--strict` to 0 P0+P1.
22. Add Vitest regression locking the 0 P0+P1 target; update `public/timer-teardown-audit.json` snapshot.

## Block 3 — Genericization (+1 pt) — Steps 23–30

23. Enumerate all 220 `RiseupAsiaMacroExt` occurrences across `spec/**`; write inventory to `spec/audit/blind-ai-implementation-audit/genericization-inventory.md`.
24. Replace placeholders in `spec/00-*.md` and `spec/01-*.md` with `<NAMESPACE>` (glossary already maps it).
25. Replace placeholders in `spec/02-*` through `spec/04-*` directories.
26. Replace placeholders in `spec/05-*` through `spec/11-*` directories.
27. Replace placeholders in `spec/12-*` through `spec/17-*` directories.
28. Replace placeholders in `spec/21-*` through `spec/32-*` directories (skip `spec/99-archive/`).
29. Add `scripts/audit-spec-genericization.mjs` — fails CI if `spec/**` contains the raw namespace string outside `spec/00-glossary.md`. Wire into CI.
30. Re-run full readiness scorer; publish `spec/audit/blind-ai-implementation-audit/final-readiness-report-100.md` confirming 100/100.

---

## Remaining items after this plan
- Pre-existing backlog: Priority 0.1 questions · 0.8 short-name refactor · Cross-Project Sync · P Store (deferred — do not list).
