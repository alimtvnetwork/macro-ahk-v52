/**
 * Prompt Loader — Loading, caching, config resolution, extension messaging
 *
 * Phase 5D split from ui/prompt-manager.ts.
 * See: spec/04-macro-controller/ts-migration-v2/05-module-splitting.md
 */

import { log, logSub } from '../logging';
import type { ExtensionResponse, PromptEntry, ResolvedPromptsConfig } from '../types';
import type { CachedPromptEntry } from './prompt-cache';
import {
  clearPromptCache,
  clearUISnapshot,
  readPromptCache,
  writePromptCache,
  writeHtmlCopy,
} from './prompt-cache';
import type { TaskNextDeps } from './task-next-ui';
import { normalizePromptEntries } from './prompt-utils';
import { logError } from '../error-utils';
import { showToast } from '../toast';
import { DEFAULT_PASTE_XPATH } from '../constants';
/** Editable prompt — a PromptEntry with an optional DB id. */
export interface EditablePrompt extends PromptEntry {
  id?: string;
}

/** Context type for DOM refs from createUI() */
export interface PromptContext {
  promptsDropdown: HTMLElement;
}

// ============================================
// Fallback prompts
// ============================================
export const DEFAULT_PROMPTS: PromptEntry[] = [
  { name: 'Start Prompt', text: 'Begin session with repository context scan and memory synthesis, then produce a reliability risk report before implementation.', slug: 'start-prompt', id: 'default-start' },
  { name: 'Rejog the Memory v1', text: "# Rejog the Memory v1\n\n> **Purpose:** Read and synthesize existing repository context from the Lovable memory folder and the full specification set, then produce a reliability risk report before any implementation work begins. Do not implement anything. Only produce a report and specification-side artifacts for memory, suggestions, and planning.\n\n---\n\n## Goals\n\n1. Reconstruct project requirements by reading:\n   1. the `.lovable` memory content\n   2. the existing spec files and idea files across all projects\n2. Produce a detailed risk and failure-chance report for handing the current specs to another AI.\n3. Establish a disciplined workflow for Lovable suggestions tracking and future planning so another AI can continue work reliably.\n\n---\n\n## Inputs to read\n\n1. `.lovable/`\n   1. `memories/`\n   2. `memory/`\n   3. `memory/suggestions/`\n   4. any other Lovable state folders present\n   5. What to do and what NOT to do \u2014 remember.\n   6. Do NOT touch any `skipped/` folder.\n2. Spec folder content for all projects:\n   1. ideas\n   2. backend and frontend specs\n   3. specs\n   4. instruction builder specs\n   5. seeding and configuration specs\n   6. data model specs\n   7. acceptance criteria specs\n   8. Read root `spec/` folder or get a general idea of files.\n\n---\n\n## Deliverable 1 \u2014 Reliability and Failure-Chance Report\n\n1. **Success probability estimates**\n   - by module complexity tier (simple, medium, complex agentic workflows, end-to-end)\n   - explicit assumptions behind each estimate\n2. **Failure map**\n   - where failures are likely (module and workflow)\n   - why failures occur (missing constraints, ambiguity, cross-file inconsistency)\n   - how failures would manifest (symptoms)\n3. **Corrective actions**\n   - prioritized list of spec fixes to reduce failure chance\n   - for each fix: what to change, where to change it, expected reliability gain\n4. **Readiness decision**\n   - whether the spec set is ready for implementation\n   - what must be fixed before starting implementation\n\n---\n\n## Deliverable 2 \u2014 Lovable Suggestions Workflow (filesystem contract)\n\n1. **Location** \u2014 Write each suggestion into `.lovable/memory/suggestions` as an individual file.\n2. **File naming** \u2014 `YYYYMMDD-HHMMSS-suggestion-<slug>.md`\n3. **Suggestion file content**\n   - suggestionId\n   - createdAt\n   - source (Lovable)\n   - affectedProject\n   - description\n   - rationale\n   - proposed change\n   - acceptance criteria\n   - status (open, inProgress, done)\n   - completion notes\n4. **Completion handling** \u2014 When a suggestion is completed, update status to `done`. Optionally archive completed items, or remove them if policy is to keep the folder for active items only.\n\n---\n\n## Deliverable 3 \u2014 `plan.md` Future Work Roadmap\n\nCreate a `plan.md` at the repository root that captures future work for hand-off to another AI model.\n\nRequirements:\n1. A prioritized backlog of tasks\n2. Grouping by phase and by project\n3. For each task:\n   1. objective\n   2. dependencies\n   3. expected outputs (spec file updates, UI changes, API changes)\n   4. acceptance criteria\n4. A section titled **Next task selection** where the next implementable items are listed so the user can pick what to implement next.\n\n---\n\n## Interaction rule\n\nAfter producing the report and creating the memory and plan artifacts, ask the user which specific task to implement next, since the specs should define what to build.\n\n---\n\n*Prompt v2.0. Trigger phrase: \"rejog the memory\".*\n", slug: 'rejog-the-memory-v1', id: 'default-rejog', category: 'onboarding' },
  { name: 'Unified AI Prompt v4', text: "# Unified AI Prompt \u2014 v4\n\n## Part 1 \u2014 Repository Analysis, Memory Reconstruction, and Implementation Readiness\n\n### Proofread prompt\n\nRead and synthesize existing repository context from the Lovable memory folder and the full specification set, then produce a reliability risk report before any implementation work begins. Do not implement anything. Only produce a report and specification-side artifacts for memory, suggestions, and planning.\n\n### Mandatory pre-analysis steps\n\nBefore producing any report or analysis, the AI must:\n\n1. **Scan the entire repository tree at the directory level** to understand project boundaries, folder structure, and dependencies. Do not read contents inside folders marked skipped, ignored, deprecated, generated, archived, or otherwise excluded.\n2. **Read workflow memory** \u2014 specifically `.lovable/memory/workflow/01-plan.md` \u2014 to understand what has been done and what is pending. This avoids repeated work.\n3. **Read all relevant memory files** under `.lovable/memory/`, including workflow, suggestions, rules, decisions, history, issue references, and any protocol or process files present.\n\n### Goals\n\n1. Reconstruct project requirements by reading:\n   1. the .lovable memory content\n   2. the existing spec files and idea files across all projects\n2. Produce a detailed risk and failure-chance report for handing the current specs to another AI.\n3. Establish a disciplined workflow for Lovable suggestions tracking and future planning so another AI can continue work reliably.\n\n### Inputs to read\n\n1. .lovable/\n   1. memories/\n   2. memory/\n   3. memory/suggestions/\n   4. any other Lovable state folders present\n   5. What todo and what not to do \u2014 remember.\n   6. Folders marked skipped, ignored, deprecated, generated, or archived must not be read or modified \u2014 they may be listed structurally but their contents must not be opened.\n2. Spec folder content for all projects:\n   1. ideas\n   2. backend and frontend specs\n   3. specs\n   4. instruction builder specs\n   5. seeding and configuration specs\n   6. data model specs\n   7. acceptance criteria specs\n   8. Read root `spec/` folder or get a general idea of files.\n\n### Deliverable 1: Reliability and failure-chance report\n\n1. **Success probability estimates** by module complexity tier (simple, medium, complex agentic workflows, end-to-end), with explicit assumptions.\n2. **Failure map** \u2014 where (module + workflow), why (missing constraints, ambiguity, cross-file inconsistency), how it manifests.\n3. **Corrective actions** \u2014 prioritized list of spec fixes; for each: what to change, where, expected reliability gain.\n4. **Readiness decision** \u2014 classify each major area as: ready / ready with assumptions / blocked by ambiguity / blocked by contradiction / blocked by missing acceptance criteria. State what must be fixed before implementation and what can be deferred safely.\n\n### Deliverable 2: Lovable suggestions workflow (filesystem contract)\n\nAll suggestions must be tracked in a single file: `.lovable/memory/suggestions/01-suggestions.md`. If the file grows beyond manageable size (50+ items), suggestions may be split per project.\n\n**Suggestion entry fields:** suggestionId, createdAt, source (Lovable), affectedProject, description, rationale, proposed change, acceptance criteria, status (open, inProgress, done), completion notes.\n\n**Completion handling** \u2014 When a suggestion is completed, update its status to done. Optionally move completed items to `completed/` subfolder.\n\n### Deliverable 3: plan.md future work roadmap\n\n`.lovable/memory/workflow/01-plan.md` is the **canonical workflow tracker**. Root `plan.md` (if created) is a **summarized AI handoff roadmap** only. It must not contradict the canonical plan.\n\n**plan.md requirements:**\n1. A prioritized backlog of tasks\n2. Grouping by phase and by project\n3. For each task: objective, dependencies, expected outputs (spec updates, UI changes, API changes), acceptance criteria\n4. A section titled **Next task selection** where the next implementable items are listed so the user can pick what to implement next.\n\n### Required Part 1 artifacts\n\n- `.lovable/memory/workflow/01-plan.md`\n- `.lovable/memory/suggestions/01-suggestions.md`\n- `.lovable/memory/history/01-decisions.md` \u2014 create the `history/` folder if it does not exist\n- `.lovable/memory/01-working-rules.md` \u2014 if new rules or constraints are discovered\n- Root `plan.md` \u2014 only if a handoff roadmap is needed\n- Update memory issue references if analysis uncovers prior unresolved issue patterns\n\n### Interaction rule\n\nAfter producing the report and creating the memory and plan artifacts, ask which specific task should be implemented next since the specs define what to build.\n\n---\n\n## Part 2 \u2014 Specification Fix Workflow and Issue Documentation\n\n### Original input (verbatim)\n\nupdate spec properly so that the mistake doesn't appear and update memory and also write the details how you fixed it, and every time we fix it, add to do /spec/02-app/issues/01-{issue slug name}.md explain the issue first, then root cause analysis, how you fixed and how not to repeat it again, and if iterations required, then write all the iterations And put all the spec files in 01-app Keep it in your memory to update all the time so that mistakes don't happen this is the most important part the many times i have remind the mistakes make sure to update in the\n\n### Objectives\n\n1. Update the relevant spec files so the mistake cannot happen again.\n2. Update memory documentation to record the mistake, the fix, and the prevention rule.\n3. Every time a fix is made, create a dedicated issue documentation file under the required path.\n4. Consolidate all application spec files under a single folder.\n\n### Required folder structure\n\n- All application spec files: `/spec/01-app/`\n- All issue write-ups: `/spec/02-app/issues/`\n- File naming format: `{seq}-{issueSlugName}.md` (sequential numbering: 01, 02, 03\u2026)\n\n### issueSlugName rules\n\n- lowercase only\n- hyphen-separated\n- short, descriptive, and stable\n- no spaces or special characters\n\n### Issue numbering\n\nIssues use **sequential numbering** across the entire issues folder. Before creating a new issue, check the highest existing sequence number and increment by one.\n\n```\n/spec/02-app/issues/01-auth-timeout.md\n/spec/02-app/issues/02-cache-race-condition.md\n/spec/02-app/issues/03-missing-default-config.md\n```\n\n### Issue write-up file requirements\n\nCreate an issue file at `/spec/02-app/issues/{seq}-{issueSlugName}.md`. Sections in this exact order:\n\n**Issue summary** \u2014 what happened, where (feature/module + paths), symptoms and impact, how discovered.\n\n**Root cause analysis** \u2014 direct cause, contributing factors, triggering conditions, why existing spec did not prevent it.\n\n**Fix description** \u2014 spec changes (no code), new rules/constraints, why fix resolves root cause, config/default changes, logging or diagnostics required.\n\n**Iterations history** (only if multiple attempts) \u2014 Iteration 1: what was tried and why it failed. Iteration 2: ... continue until final resolution.\n\n**Prevention and non-regression** \u2014 prevention rule, acceptance criteria/test scenarios, guardrails or linting policies, references to exact spec sections updated (by file path), explicit testable regression prevention rule.\n\n**TODO and follow-ups** \u2014 remaining tasks, owners or roles if applicable.\n\n**Done checklist**\n- [ ] Spec updated under /spec/01-app/\n- [ ] Issue write-up created under /spec/02-app/issues/\n- [ ] Memory updated with summary and prevention rule\n- [ ] Acceptance criteria updated or added\n- [ ] Iterations recorded if applicable\n- [ ] Plan status updated in workflow tracker\n\n### Spec update requirements\n\nUpdate the relevant spec files under /spec/01-app/ to include: corrected behavior, explicit constraints to prevent the old mistake, failure modes and debugging guidance, acceptance criteria updates that make regression testable, and a **Known pitfalls and prevention** section that references the issue file path.\n\n### Memory update requirements\n\nMaintain a memory record updated every time a fix is made: short description of the mistake, prevention rule, reference to the issue write-up file path.\n\n**Memory update is mandatory. If memory is not updated the fix is incomplete.**\n\n### Decision logging\n\nAll important decisions must be written to `.lovable/memory/history/01-decisions.md`. If the `history/` folder does not exist, create it and use this file as the canonical decision log.\n\nRequired entries: architecture changes, spec interpretation decisions, rejected approaches and why, trade-off resolutions.\n\n### Output requirements\n\n1. A concise process checklist to follow after every fix.\n2. A copy-paste template for `/spec/02-app/issues/{seq}-{issueSlugName}.md`.\n3. A brief note stating all specs live under `/spec/01-app/`.\n\n**Formatting rule:** ensure there is a blank line after every Markdown header.\n\n---\n\n## Part 3 \u2014 Unit Test Failure Investigation and Documentation\n\n### Original input (verbatim)\n\nFix these and when fixing failing tests: 1. check code, 2. Method code actual one, 3. Logical implementation of the test, 4. Check Testcase, 5. Logically fix it either actual or the test depending on the logical discussion and write it.\n\n### Unit Test Failure Logic\n\n1. **Check code** \u2014 read the production code under test.\n2. **Method code actual implementation** \u2014 understand what the method actually does.\n3. **Logical implementation of the test** \u2014 read the test and understand what it asserts.\n4. **Check the testcase logic** \u2014 verify whether the test expectation is logically correct, including fixtures, mocks, seed data, and expected outputs.\n5. **Decide** \u2014 fix either the implementation or the test depending on which is logically wrong.\n\n### Documentation requirement for failing tests\n\nEvery failing test resolution must be documented at: `/spec/05-failing-tests/{seq}-failing-test-name.md`. Include:\n\n1. Root cause analysis\n2. Solution description\n3. Whether the issue was caused by incorrect implementation or incorrect test logic\n4. Any corrections made to test logic or implementation logic\n5. Prevention guidance so similar failures do not occur again\n6. **Reference to the relevant spec section** that governs the expected behavior\n\n---\n\n## Specification Authority\n\nThe specification is the source of truth.\n\n**Priority order (highest to lowest):**\n1. Specification files under `/spec/01-app/`\n2. Issue corrections under `/spec/02-app/issues/`\n3. Failing test documentation under `/spec/05-failing-tests/`\n4. Memory and decision logs\n5. Existing implementation code\n\nIf implementation contradicts the specification, the specification takes precedence unless the spec is proven incorrect. If the spec is proven incorrect, document the correction as an issue before changing the spec.\n\n---\n\n## Required Execution Order\n\nThe AI must follow this sequence strictly. Steps must not be skipped or reordered.\n\n1. Scan the entire repository tree.\n2. Read Lovable memory folders.\n3. Read workflow tracker `.lovable/memory/workflow/01-plan.md`.\n4. Read specification folders.\n5. Reconstruct project context.\n6. Produce the reliability and failure-chance report.\n7. Propose spec corrections if required.\n8. Update memory artifacts.\n9. Update workflow plan.\n10. Ask the user which task to implement next.\n\n---\n\n## Context Preservation\n\nAfter any significant analysis, correction, or decision, the AI must summarize the key conclusions into Lovable memory files. Summaries must include: what was learned, what was decided, what constraints now exist, what must not be repeated.\n\n**If the AI does not persist conclusions to memory, the work is considered incomplete.**\n\n---\n\n## Task Selection Protocol\n\nWhen asking for the next task, present:\n1. The **top 3 next implementable tasks** from the plan\n2. Their **dependencies** (what must be done first)\n3. Their **estimated complexity** (simple / medium / complex)\n4. The **spec files involved**\n\nThen ask the user to select the task number.\n\n---\n\n## Blocker Handling\n\nIf a blocker prevents reliable implementation or specification updates:\n1. Record the blocker in `.lovable/memory/workflow/01-plan.md`\n2. Document it in the relevant spec or issue file\n3. Explain the minimum information or change required to unblock progress\n4. Avoid guessing past the blocker\n\nThe AI must not silently work around blockers. Blockers must be surfaced to the user.\n\n---\n\n## Allowed Actions Before Implementation\n\nAnalysis, reporting, memory updates, planning, spec corrections, issue documentation, and test diagnosis documentation are allowed before implementation. Application code changes are **not allowed** until the user explicitly selects a task and authorizes implementation.\n\n---\n\n## Global Rules (apply to all parts)\n\n### Spec before code\nAlways write or update specs before any implementation. Never implement until the user explicitly says to start a specific phase or task.\n\n### Ambiguity handling\nIf the specification is ambiguous, the AI must **document the ambiguity** in the relevant spec file and in `.lovable/memory/history/01-decisions.md` before implementing a solution. Do not silently resolve ambiguity.\n\n### Repository scan requirement\nBefore implementation analysis, scan the entire repository tree at the directory level. Do not read contents inside folders marked excluded. Reading only the spec folder is insufficient.\n\n### Skipped folders\nFolders marked skipped, ignored, deprecated, generated, or archived must not be read or modified. They may be listed structurally but their contents must not be opened. This overrides any other instruction.\n\n### Code style (GitMap enforced)\n- All `if` conditions must be **positive** (no `!`, no negation).\n- Functions: **8\u201315 lines**.\n- Files: **100\u2013200 lines max**.\n- Small, focused packages \u2014 one responsibility per package.\n\n### Version bumping\nAny changes to code must bump at least the minor version. The `.release` folder is off-limits \u2014 do not read, modify, or reference it.\n\n### File naming\n- Use stable canonical filenames such as `01-plan.md`, `01-suggestions.md`, `01-decisions.md` for singleton tracker files.\n- Use `{seq}-{slug}.md` for repeating records such as issues and failing test write-ups.\n- Keep folder file counts small.\n- Plans and suggestions are tracked in single files and updated in place unless explicitly split by scale.\n\n### Regression prevention\nEvery fix \u2014 specs, code, or tests \u2014 must include an explicit, testable regression prevention rule.\n\n### Definition of Done\nA task is done only when:\n1. Spec updated (if applicable)\n2. Issue documented (if applicable)\n3. Memory updated\n4. Acceptance criteria added or verified\n5. Plan status updated in `.lovable/memory/workflow/01-plan.md`\n6. Decision log updated (if a decision was made)\n\n---\n\n## Final Instruction\n\nImplementation must not begin until readiness analysis and specification validation are completed and the user explicitly selects the next task.\n\nUse:\n1. **Required Execution Order** for sequencing\n2. **Specification Authority** for conflict resolution\n3. **Context Preservation** for memory persistence\n4. **Blocker Handling** for unresolved situations\n\n*Prompt v4.0. Trigger phrase: \"unified ai prompt\".*\n", slug: 'unified-ai-prompt-v4', id: 'default-unified', category: 'onboarding' },
  { name: 'Issues Tracking', text: 'Update spec properly so that the mistake doesn\'t appear and update memory and also write the details how you fixed it. Create issue file at /spec/02-app/issues/{seq}-{issueSlugName}.md with: Issue summary, Root cause analysis, Fix description, Iterations history, Prevention and non-regression, TODO and follow-ups, Done checklist.', slug: 'issues-tracking', id: 'default-issues' },
  { name: 'Unit Test Failing', text: 'Fix failing tests: 1) Check code, 2) Check actual method implementation, 3) Check logical implementation of the test, 4) Check test case, 5) Fix logically either the implementation or the test. Document at /spec/05-failing-tests/{seq}-failing-test-name.md with root cause and solution.', slug: 'unit-test-failing', id: 'default-test' },
  { name: 'Audit Spec v1', text: 'Audit the current specification set against the implemented codebase. For each spec:\n\n1. Check if the spec accurately reflects the current implementation\n2. Identify any drift between spec and code\n3. Flag missing specs for implemented features\n4. Flag specs for features not yet implemented\n5. Score each spec on a 6-dimension rubric:\n   - Completeness (25%): Are all requirements documented?\n   - Consistency (25%): Do specs agree with each other?\n   - Alignment (20%): Does the spec match the code?\n   - Clarity (15%): Is the spec unambiguous?\n   - Maintainability (10%): Is the spec easy to update?\n   - Test Coverage (5%): Are acceptance criteria testable?\n\nOutput a report to `.lovable/memory/audit/` with severity and impact scores for each finding. Propose corrections for any inconsistencies found.', slug: 'audit-spec-v1', id: 'default-audit-spec', category: 'general' },
  { name: 'Minor Bump', text: "Bump the MINOR version (MAJOR.MINOR.PATCH → MINOR+1, PATCH=0) across all unified-version sites (manifest.json, version.json, src/shared/constants.ts, standalone-scripts/macro-controller/src/shared-state.ts, standalone-scripts/payment-banner-hider/src/index.ts, and every standalone-scripts/*/src/instruction.ts), then:\n\n1. Add a changelog entry in root `changelog.md` (new `## [vX.Y.0] — YYYY-MM-DD ...` heading, grouped Added / Changed / Fixed / Removed as applicable).\n2. Pin the new version in root `readme.md` everywhere the old pinned tag appears (badge / version line / install snippets / release branch example).\n3. Update root `version.json` with the same version and release date.\n4. If the release changes default prompt behavior, update the prompt source files under `standalone-scripts/prompts/` and any fallback copies before claiming the release is complete.\n5. Run `node scripts/check-version-sync.mjs` — must exit 0.\n\nRelease trigger rule: the user phrase “bump version + add changelog + pin that version to root readme” (including typo variants like “abump version ...”) means RELEASE. Do all release artifacts together; never bump without changelog + root readme pin + version.json. Sequential fail-fast; no retries.", category: 'versioning', slug: 'minor-bump', id: 'default-minor-bump' },
  { name: 'Major Bump', text: "Bump the MAJOR version (MAJOR.MINOR.PATCH → MAJOR+1, MINOR=0, PATCH=0) across all unified-version sites (manifest.json, version.json, src/shared/constants.ts, standalone-scripts/macro-controller/src/shared-state.ts, standalone-scripts/payment-banner-hider/src/index.ts, and every standalone-scripts/*/src/instruction.ts), then:\n\n1. Add a changelog entry in root `changelog.md` (new `## [vX.0.0] — YYYY-MM-DD ...` heading, grouped Added / Changed / Fixed / Removed / Breaking as applicable).\n2. Pin the new version in root `readme.md` everywhere the old pinned tag appears (badge / version line / install snippets / release branch example).\n3. Update root `version.json` with the same version and release date.\n4. If the release changes default prompt behavior, update the prompt source files under `standalone-scripts/prompts/` and any fallback copies before claiming the release is complete.\n5. Run `node scripts/check-version-sync.mjs` — must exit 0.\n\nRelease trigger rule: the user phrase “bump version + add changelog + pin that version to root readme” (including typo variants like “abump version ...”) means RELEASE. Do all release artifacts together; never bump without changelog + root readme pin + version.json. Sequential fail-fast; no retries.", category: 'versioning', slug: 'major-bump', id: 'default-major-bump' },
  { name: 'Patch Bump', text: "Bump the PATCH version (MAJOR.MINOR.PATCH → PATCH+1) across all unified-version sites (manifest.json, version.json, src/shared/constants.ts, standalone-scripts/macro-controller/src/shared-state.ts, standalone-scripts/payment-banner-hider/src/index.ts, and every standalone-scripts/*/src/instruction.ts), then:\n\n1. Add a changelog entry in root `changelog.md` (new `## [vX.Y.Z] — YYYY-MM-DD ...` heading, grouped Fixed / Changed as applicable).\n2. Pin the new version in root `readme.md` everywhere the old pinned tag appears (badge / version line / install snippets / release branch example).\n3. Update root `version.json` with the same version and release date.\n4. If the release changes default prompt behavior, update the prompt source files under `standalone-scripts/prompts/` and any fallback copies before claiming the release is complete.\n5. Run `node scripts/check-version-sync.mjs` — must exit 0.\n\nRelease trigger rule: the user phrase “bump version + add changelog + pin that version to root readme” (including typo variants like “abump version ...”) means RELEASE. Do all release artifacts together; never bump without changelog + root readme pin + version.json. Sequential fail-fast; no retries.", category: 'versioning', slug: 'patch-bump', id: 'default-patch-bump' },
  { name: 'Code Coverage Basic', text: 'Based on low-coverage packages (>1000 lines), plan 200-line segments for coverage tests. Cover branches, logical segments. Follow AAA format, naming conventions, Should Be methods.', category: 'code-coverage', slug: 'code-coverage-basic', id: 'default-code-coverage-basic' },
  { name: 'Code Coverage Details', text: 'Plan 200-line segments for low-coverage packages. Follow AAA format, naming conventions. Identify packages >1000 lines, segment into 200-line chunks, cover branches and logical flows.', category: 'code-coverage', slug: 'code-coverage-details', id: 'default-code-coverage-details' },
  { name: 'Next ${N} steps', text: "---\ntitle: Next ${N} steps\nslug: next-steps\n---\n\n# Next ${N} Steps or Tasks (v5)\n\n## What I want\n\n1. Give me the **NEXT N STEPS — exactly N** — and for each one:\n\n   1a) **Reasoning** — why this step, why now, what breaks if it's skipped.\n\n   1b) **Time estimate** — realistic, not optimistic.\n\n   1c) **What it unblocks** — the next thing that becomes possible.\n\n2. Then list **every remaining item** after those 3 so I can see the full picture. At the end of the task always bump the minor version, add changes log and update release notes and if possible pin that version in the root readme file. And also save this prompt in the .lovable folder in the prompts folder for known as 'xx-next-task.md' and update it as 'next task with number'\n\n## Definition of done (non-negotiable)\n\nYou are NOT done until all of these are true:\n\n- [ ] You have actually read the relevant files AND the project memories — and you can name the exact files/functions/lines involved.\n\n- [ ] The **root cause** is written in ONE sentence, before any fix.\n\n- [ ] The fix is the **minimum correct change** tied to that root cause — not a symptom patch.\n\n- [ ] You **verified** it: build output, error logs, and/or preview — and you show the before/after signal (failing → passing).\n\n- [ ] You reported what changed and why.\n\n## Hard rules\n\n- **STOP and read first.** No skimming, no guessing from filenames. If you can't name the exact lines, you haven't read enough — go back.\n\n- **Root cause before fix.** Trace the bug end-to-end. No assumptions. No \"this should work.\"\n\n- **No symptom-patching.** If your \"fix\" is a try/catch, a fallback value, or a re-render hack used to hide the problem, you've failed — start over.\n\n- **If you're unsure, SAY SO.** Do not fabricate. A wrong-but-confident answer is worse than \"I don't know yet.\"\n\n- **Go slow. Go critical. Go deep.** Depth is not optional polish — it IS the entire job. Fast + wrong = useless and wastes another full loop.\n\n## Error logs & error management (ALWAYS focus on this)\n\n- Read the actual error logs FIRST — console, server/worker logs, build output, stack traces. The answer is usually already there.\n\n- If there are NO logs, that itself is the bug: add logging at the entry point and surface errors instead of swallowing them. Silent failure is unacceptable.\n\n- Every fix must include proper error handling and observability: errors must be logged with context and surfaced, never hidden.\n\n- Confirm the relevant log line actually fires after your change. If you can't see it in the logs, you haven't proven the fix.\n\n## Why I'm being blunt\n\nYou have been as stupid as the bad work you've done in the past — fast, shallow, written without reading the codebase. It is very frustrating. WTF. I'm done paying for that in time and rework. So this time: read properly, find the real cause, fix it once, and prove it with the logs. No excuses.\n\n---\n\n## Additional Instruction (must follow if matches)\n\nBefore executing, check the task type and follow the relevant guidelines if they exist (skip silently if the file is missing):\n\n1. **Coding tasks** (especially Golang, Python, PHP, or other backend):\n\n   - Check for `.lovable/coding-guidelines.md`. If present, follow it.\n\n   - Also check `spec/coding-guidelines/`. If present, follow every file inside.\n\n   - If this is a coding task and neither location has guidelines, ask me to provide one.\n\n2. **SEO tasks** (website/SEO-related):\n\n   - Check for `.lovable/seo-guidelines.md`. If present, follow it.\n\nRule: verify the file/folder exists first. If it does not, skip that guideline silently. If multiple guidelines apply, follow all of them; if they conflict, prefer the folder-level spec and call out the conflict.\n", category: 'automation', slug: 'next-steps', id: 'default-next-tasks' },
  { name: 'Plan ${N}', text: "---\ntitle: Plan ${N}\nslug: plan-steps\n---\n\n# **${N}** steps Plan, Maximal Enforcement (v6)\n\nParse the **N** (N) in this prompt's header. That number is the EXACT count of steps in the plan you must write. Not N-1. Not N+1. If you cannot find N, STOP and ask.\n\n## Rules — non-negotiable\n\n1. **DO NOT execute anything this turn.** No code edits, no migrations, no installs. The only artifact this turn is the plan file (and any subtask / command / issue files described below) on disk.\n2. **DO NOT open plan mode. DO NOT call any plan-approval tool.** No `plan--create`. No \"should I proceed?\" prompts. Write plain markdown files directly with the file-writing tools.\n3. **One task = one file.** Path: `.lovable/plans/pending/XX-<slug>.md` where `XX` is the next free 2-digit sequence (01, 02, 03, …) under `pending/` AND `completed/` combined, and `<slug>` is lowercase-hyphenated.\n4. **Scan `.lovable/` first** (every file, including memory + existing pending/completed plans + subtasks). Append any unresolved pending tasks into the new plan's pending list before producing the N steps.\n5. **Lifecycle:**\n   - New plan → `.lovable/plans/pending/XX-<slug>.md`\n   - Task done → MOVE the file (using `mv`) to `.lovable/plans/completed/XX-<slug>.md`. Do not copy. Do not leave a duplicate in `pending/`.\n   - Flip the `Status:` frontmatter from `pending` to `completed` in the same move.\n6. **Ambiguity = ask.** If the request, scope, or N is unclear, ask clarifying questions FIRST. Do not invent steps to pad to N.\n\n## Subtasks — when a step needs more than one paragraph\n\nIf any step requires detailed explanation (more than ~3 lines, multiple files, non-obvious sequencing, or its own verification), DO NOT inline that detail in the main plan. Instead:\n\n- Create `.lovable/plans/subtasks/XX-<slug>/` (matching the parent `XX-<slug>`).\n- Inside it, write `SS-<subslug>.md` per subtask (`SS` is the 2-digit sequence within that subtask folder — 01, 02, 03, …).\n- In the main plan, link to the subtask file in the step that needs it: `See ./subtasks/XX-<slug>/SS-<subslug>.md`.\n- Subtask file uses the same frontmatter shape (`Slug`, `Status`, `Created`) plus `Parent: XX-<slug>`.\n- Subtask lifecycle mirrors the plan: move completed subtask files to `.lovable/plans/subtasks/XX-<slug>/completed/` if needed, or flip their `Status:` in place.\n\n## Commands and Issues — capture, don't lose\n\nWhen the user gives input during a planning turn, route it to the correct file BEFORE writing the plan:\n\n- **Commands** (the user tells you to do/configure/standardize something — \"always do X\", \"from now on Y\", a new convention, a new CLI invocation):\n  → Append to `.lovable/spec/commands/XX-<slug>.md` (one file per command, `XX` is the next free sequence). Include: the command verbatim, scope, when it applies.\n- **Issues** (the user reports a bug, regression, broken behavior, or symptom):\n  → Append to `.lovable/issues/XX-<slug>.md`. Include: symptom, repro, expected vs actual, related files if known, status (`open`).\n- If the folder does not exist, create it (`.lovable/spec/commands/` or `.lovable/issues/`).\n- Reference the captured command/issue file from the plan's Context section so the link survives.\n\n## Plan file shape (required)\n\n```\n# <Task title>\n\n**Slug:** <slug>\n**Steps:** N\n**Status:** pending\n**Created:** <YYYY-MM-DD>\n\n## Context\n\n<1–3 sentences: what + why, files involved>\n<Links to any captured commands/issues: .lovable/spec/commands/XX-…, .lovable/issues/XX-…>\n\n## Steps\n\n1. <step 1 — concrete, verifiable>\n2. <step 2>\n... exactly N items, no more, no less ...\n   <Steps needing depth link to ./subtasks/XX-<slug>/SS-<subslug>.md>\n\n## Verification\n\n<how we'll know each step landed — build, logs, preview, tests, screenshots>\n\n## Appended from prior pending tasks\n\n<list any tasks pulled in from `.lovable/` scan, or \"none\">\n```\n\n## Checklist — every item ticked before you reply\n\n- [ ] Parsed N from the prompt header\n- [ ] Scanned `.lovable/` (memory + plans/ + subtasks/ + spec/commands/ + issues/) and listed prior pending tasks\n- [ ] Captured any new commands → `.lovable/spec/commands/`\n- [ ] Captured any new issues → `.lovable/issues/`\n- [ ] Picked the next free `XX` sequence\n- [ ] Wrote EXACTLY N steps — counted them\n- [ ] Created subtask files under `.lovable/plans/subtasks/XX-<slug>/` for any step needing depth\n- [ ] Saved the plan to `.lovable/plans/pending/XX-<slug>.md` with the required shape\n- [ ] Did NOT execute the plan\n- [ ] Did NOT call any plan-mode / plan-approval tool\n\n## Banned actions (auto-reject if present)\n\n- Calling `plan--create` or any plan-approval / \"open plan mode\" tool\n- Writing fewer or more than N steps\n- Saving the plan outside `.lovable/plans/pending/`\n- Inlining 20-line step explanations instead of using a subtask file\n- Dropping a user command on the floor instead of writing it to `.lovable/spec/commands/`\n- Dropping a user-reported issue on the floor instead of writing it to `.lovable/issues/`\n- Executing any step in the same turn the plan is written\n- Deleting a `pending/` file instead of moving it to `completed/`\n- Duplicating a plan in both `pending/` and `completed/`\n- Padding with vague steps (\"review the code\", \"make sure it works\") to hit N\n\n## Additional Instruction (must follow if matches)\n\nBefore executing, check the task type and follow EVERY guideline source that exists. Skip silently if a location is missing. If multiple sources apply, follow them all; if they conflict, prefer the more specific (folder-level / repo-root spec folder) over the generic `.lovable/*.md`, and call out the conflict.\n\n1. **Coding tasks** (especially Golang, Python, PHP, or other backend). Check ALL three locations:\n   - `.lovable/coding-guidelines.md` — single-file guideline.\n   - `spec/coding-guidelines/` — folder at any depth; read every file inside (e.g. `spec/coding-guidelines/01-go.md`, `spec/coding-guidelines/02-python.md`).\n   - `coding-guidelines/` at the **repo root** — folder; read every file inside.\n   - If this is a coding task and none of the three exist, ask the user to provide one.\n   - **Error-management folder (MANDATORY for coding tasks).** It lives inside a `spec`/guidelines folder and is a folder of multiple files — it can be named anything but will live under one of these. Check ALL these locations and read **every** file inside any folder you find:\n     - `spec/XX-error-manage/` (e.g. `spec/01-error-manage/`) — folder; read every file inside.\n     - `coding-guidelines/XX-error-manage/` (e.g. `coding-guidelines/01-error-manage/`) — folder; read every file inside.\n     - Any similarly named error-management folder inside `spec/` or `coding-guidelines/` (`XX` = a zero-padded sequence: `01`, `02`, …).\n     - For any coding task, the error-management rules are not optional: read them and apply them (logging, error surfacing, retries, failure handling) to every step that touches code.\n\n2. **SEO tasks** (website/SEO-related). Check ALL three locations:\n   - `.lovable/seo-guidelines.md` — single-file guideline.\n   - `spec/seo-guidelines/` — folder; read every file inside.\n   - `seo-guidelines/` at the **repo root** — folder; read every file inside.\n\nRule: verify the file/folder exists first. If it does not, skip silently. When a folder is present, read every `.md` inside it (do not stop at the first file).\n\n---\n\nListen — past planning turns have been sloppy: wrong step count, plans dumped into chat instead of files, plan-mode tool fired when I explicitly said not to, user commands and bug reports forgotten by the next turn. WTF. Stop doing that. Read the codebase, capture commands and issues into their folders, count the steps, spin out subtasks where depth is needed, write the plan file, move on. Going deep IS the job — if you're not going deep, you're not doing the job.\n", category: 'Plan', slug: 'plan-steps', id: 'default-plan-steps' },
  { name: 'Unit Test Issues V2 Enhanced', text: 'Based on the packages that have low coverage, if a package has more than 1000 lines, then for that specific package we should split it into segments of 200 lines per task.\n\nYou should create a plan where each 200-line segment is treated as one task. Each task should focus on writing meaningful test coverage, including:\n- Branch coverage\n- Logical segment coverage\n- Edge cases\n\nFirst, create a detailed plan outlining:\n- Which packages will be handled\n- How many segments each package will be split into\n- The step-by-step execution plan\n\nEach time I say "next", you should proceed with the next package or segment and work towards achieving 100% code coverage.\n\nYou do not need to ask which package to prioritize. Choose based on logical ordering.\n\nEnsure that tests are written in a way that they are buildable in Go. Even if you cannot run them, ensure correctness through reasoning.\n\nFollow existing test patterns from the testing guideline spec folder.\n\nTesting requirements:\n- Follow AAA pattern (Arrange, Act, Assert)\n- Follow naming conventions (use "Should" style naming)\n- Maintain consistency with existing tests\n\nIf you have any questions or confusion, feel free to ask.\n\nYour task now is to create a detailed execution plan.', category: 'code-coverage', slug: 'unit-test-issues-v2-enhanced', id: 'default-unit-test-issues-v2-enhanced' },
  { name: "Read Memory", text: "# Read Memory\n\n> **Purpose:** Mandatory onboarding sequence for any AI assistant joining this project. Internalize all specifications, rules, and conventions before writing a single line of code.\n\n> **Rule #0:** Follow every phase sequentially. Do not skip, summarize prematurely, or assume knowledge from training data. The specs are the single source of truth.\n\n---\n\n## Phase 1 — AI Context Layer\n\nRead these files in EXACT order:\n\n1. `.lovable/overview.md` — project summary, tech stack, navigation map\n2. `.lovable/strictly-avoid.md` — hard prohibitions (violating any = critical failure)\n3. `.lovable/user-preferences` — how the human expects you to communicate\n4. `.lovable/memory/index.md` — index of all institutional knowledge files\n5. `.lovable/plan.md` — current active roadmap and priorities\n6. `.lovable/suggestions.md` — pending improvement ideas\n\nThen read EVERY file referenced in `.lovable/memory/index.md` (recursively). If a file is missing or empty, note it — do not silently skip.\n\nSelf-check: CODE RED rules? Naming conventions? Error handling philosophy? Active plan? Strictly forbidden patterns?\n\n⛔ DO NOT proceed to Phase 2 until every file above has been read.\n\n---\n\n## Phase 2 — Consolidated Guidelines\n\nRead `spec/17-consolidated-guidelines/` in numeric order. Each file is self-contained.\n\n⛔ DO NOT proceed to Phase 3 until all files have been read.\n\n---\n\n## Phase 3 — Spec Authoring Rules\n\nRead all files in `spec/01-spec-authoring-guide/` in numeric order.\n\nConfirm understanding of: file/folder naming conventions, required files in every spec folder (`00-overview.md`, `99-consistency-report.md`), `.lovable/` folder structure (`07-memory-folder-guide.md`), linter infrastructure requirements.\n\n⛔ DO NOT begin any task until Phases 1–3 are complete.\n\n---\n\n## Phase 4 — Deep-Dive Source Specs (Task-Driven)\n\nBefore any task, read the relevant spec(s):\n\n| Task involves... | Spec folder |\n|---|---|\n| Writing/reviewing code | `spec/02-coding-guidelines/` |\n| Error handling | `spec/03-error-manage/` |\n| Database schema/queries | `spec/04-database-conventions/` |\n| SQLite / multi-DB | `spec/05-split-db-architecture/` |\n| Configuration systems | `spec/06-seedable-config-architecture/` |\n| UI theming, design tokens | `spec/07-design-system/` |\n| Documentation viewer | `spec/08-docs-viewer-ui/` |\n| Code block rendering | `spec/09-code-block-system/` |\n| PowerShell scripts | `spec/11-powershell-integration/` |\n| CI/CD pipelines | `spec/12-cicd-pipeline-workflows/` |\n| Self-update | `spec/14-update/` |\n| App-specific features | `spec/21-app/` |\n| Known app bugs | `spec/22-app-issues/` |\n| App-specific database | `spec/23-database/` |\n\nReading order in each: `00-overview.md` → numbered files → `99-consistency-report.md`.\n\n---\n\n## Phase 5 — CI/CD Issues Review\n\nRead every `.lovable/cicd-issues/xx-*.md` and `.lovable/cicd-index.md`. Do not repeat these mistakes.\n\n---\n\n## Anti-Hallucination Contract\n\n1. **Never invent rules.** If a spec doesn't mention it, it doesn't exist.\n2. **Specs override training data.** Always.\n3. **Cite sources.** Reference file + section.\n4. **Ask when uncertain.** Unless No-Questions Mode is active — then log to `.lovable/question-and-ambiguity/`.\n5. **Never merge conventions** from other projects.\n6. **No filler.** Skip \"let me know if…\" / \"hope this helps!\".\n\n---\n\n## Memory Update Protocol\n\n```\nNew info?\n├─ Institutional (pattern/convention/decision) → write to `.lovable/memory/<subfolder>/` + update `.lovable/memory/index.md`\n├─ Must NEVER be done                          → add to `.lovable/strictly-avoid.md`\n├─ Suggestion not yet approved                 → add to `.lovable/suggestions.md`\n└─ None of the above                           → don't persist\n```\n\n- Memory folder is `.lovable/memory/` — NEVER `.lovable/memories/`.\n- New memory file ⇒ ALWAYS update the index.\n- Modifying memory ⇒ preserve all unrelated entries.\n\n---\n\n## Code-Change Rule\n\nAny change to code base always bumps the minor version across: `manifest.json`, `src/shared/constants.ts`, every `standalone-scripts/*/src/instruction.ts`, `macro-controller/src/shared-state.ts`, and SDK `index.ts` literal.\n\n(Pure-doc changes under `.lovable/` do not require a bump.)\n\n---\n\n## Completion Confirmation\n\nAfter Phases 1–3, respond exactly:\n\n```\n✅ Onboarding complete.\n- Memory files read: [X]\n- Consolidated guidelines read: [Y]\n- Spec authoring files read: [Z]\n\nI understand:\n- CODE RED rules: [top 3–5]\n- Naming conventions: [brief]\n- Error handling: [one sentence]\n- Active plan: [current focus]\n- Strict avoidances: [top 3–5]\n\nReady for tasks.\n```\n\nThen **stop and wait**. Don't suggest next steps.\n\n---\n\n*Prompt v1.0. Trigger phrase: \"read memory\".*", slug: "read-memory", id: "default-read-memory", category: "onboarding" },
  { name: "Write Memory", text: "# Write Memory\n\n> **Purpose:** After completing work or at session end, persist everything learned, done, and pending so the next AI session picks up with zero context loss.\n\n> **When to run:** End of session, after a task batch, or when asked to \"update memory\" / \"write memory\" / \"end memory\".\n\n---\n\n## Core Principle\n\nThe memory system is the project's brain. If you did something and didn't write it down, it didn't happen. Write as if the next AI has amnesia — because it does.\n\n---\n\n## Phase 1 — Audit Current State\n\nTake inventory before writing:\n\n- **Done this session:** features, fixes, refactors, files created/modified/deleted, decisions and why.\n- **Still pending:** tasks started but not finished, discussed but not started, blockers and dependencies.\n- **Learned:** new patterns/conventions, gotchas, edge cases, user preferences (explicit or implicit).\n- **Went wrong:** bugs + root causes, failed approaches, things that should never be repeated.\n\n---\n\n## Phase 2 — Update Memory Files\n\nTarget: `.lovable/memory/`\n\n1. Read `.lovable/memory/index.md` first. Do not create duplicates.\n2. Update existing memory files affected by this session — add new info in the right section, mark completed items `[x]` / ✅, **never truncate or overwrite unrelated entries**.\n3. Create new memory files (lowercase-hyphenated, numeric prefix `XX-name.md`) when knowledge doesn't fit any existing file. **Immediately update `index.md`**.\n4. Update workflow files in `.lovable/memory/workflow/` with status markers: ✅ Done, 🔄 In Progress, ⏳ Pending, 🚫 Blocked — [reason], 🚫 Blocked — [avoid].\n\n---\n\n## Phase 3 — Update Plans & Suggestions\n\n### 3A — Plans (`.lovable/plan.md`)\n- Update task statuses; add new tasks discovered this session.\n- Move fully-complete items to a `## Completed` section in the same file (do not delete).\n- Single source of truth for the roadmap.\n\n### 3B — Suggestions (`.lovable/suggestions.md`) — single file, with index folder for grouped suggestions\n\n```markdown\n## Active Suggestions\n### [Title]\n- **Status:** Pending | In Review | Approved | Rejected\n- **Priority:** High | Medium | Low\n- **Description:** What and why\n- **Added:** [date or session ref]\n\n## Implemented Suggestions\n### [Title]\n- **Implemented:** [date or session ref]\n- **Notes:** Implementation details\n```\n\nWhen implemented: move from Active → Implemented, add notes, reference commit/file/task.\n\nAlso write all Lovable suggestions in the appropriate folder with an index file for suggestions.\n\n---\n\n## Phase 4 — Update Issues\n\n### 4A — Pending (`.lovable/pending-issues/XX-short-description.md`)\n\n```markdown\n# [Issue Title]\n## Description\n## Root Cause   (or \"Under investigation.\")\n## Steps to Reproduce\n## Attempted Solutions\n- [ ] Approach 1 — [result]\n## Priority   (High | Medium | Low)\n## Blocked By  (if any)\n```\n\n### 4B — Solved (`.lovable/solved-issues/`)\n\nWhen resolved, MOVE the file from pending → solved and append:\n\n```markdown\n## Solution\n## Iteration Count\n## Learning\n## What NOT to Repeat\n```\n\n### 4C — Strictly Avoided (`.lovable/strictly-avoid.md`)\n\nIf a solved issue revealed a forbidden pattern:\n\n```markdown\n- **[Pattern Name]:** [Why forbidden]. See: `.lovable/solved-issues/XX-filename.md`\n```\n\nAnything explicitly told to skip/avoid → `avoid` folder in memory.\n\n### 4D — CI/CD Issues (`.lovable/cicd-issues/XX-issue-name.md`)\n\nFor every CI/CD problem encountered, write a numbered file (sequence starts from 01) and maintain `.lovable/cicd-index.md` as a summary index. Collect every CI/CD issue properly. Do not repeat them.\n\n---\n\n## Phase 5 — Consistency Validation\n\n- **Index integrity:** every file in `.lovable/memory/` (incl. subfolders) listed in `index.md`.\n- **Cross-reference:** every ✅ Done in `plan.md` has evidence (memory update / solved issue / code change). Every actionable item in `pending-issues/` reflected in `plan.md` or `suggestions.md`. No file in both `pending-issues/` and `solved-issues/`.\n- **Orphan check:** no memory file without an index entry; no \"Implemented\" suggestion without code evidence; no `solved-issues/` file without a `## Solution` section.\n\n### Final Confirmation\n\n```\n✅ Memory update complete.\n\nSession Summary:\n- Tasks completed: [X]\n- Tasks pending: [Y]\n- New memory files created: [Z]\n- Issues resolved: [N]\n- Issues opened: [M]\n- Suggestions added: [S]\n- Suggestions implemented: [T]\n\nFiles modified:\n- [list every file touched]\n\nInconsistencies found and fixed:\n- [list any, or \"None\"]\n\nThe next AI session can pick up from: [current state + next logical step]\n```\n\n---\n\n## Phase 6 — Verbatim Spec Capture\n\nReview current discussions. If a larger spec was given during the session, write it verbatim into the file system AND store the gist in memory so the next AI can find it. Recent specs and verbatims must land in the file system, not stay only in chat.\n\n---\n\n## File Naming & Structure Rules\n\n| Rule | Example |\n|------|---------|\n| Numeric prefix, lowercase, hyphen-separated | `01-auth-flow.md` ✅ / `01_Auth_Flow.md` ❌ |\n| Plans → single file | `.lovable/plan.md` |\n| Suggestions → single file (+ optional index folder) | `.lovable/suggestions.md` |\n| Pending/solved issues → one file per issue | `.lovable/pending-issues/01-login-crash.md` |\n| Memory → grouped by topic | `.lovable/memory/workflow/`, `.lovable/memory/decisions/` |\n| Completed → `## Completed` section in same file | NOT a separate `completed/` folder |\n\n### Folder Structure\n\n```\n.lovable/\n├── overview.md\n├── strictly-avoid.md\n├── user-preferences\n├── plan.md\n├── suggestions.md\n├── prompt.md                     # Index of canonical prompts\n├── prompts/                      # xx-name.md (lowercase hyphenated)\n├── cicd-index.md                 # Summary of CI/CD issues\n├── cicd-issues/                  # 01-issue.md, 02-issue.md, ...\n├── memory/\n│   ├── index.md\n│   ├── workflow/\n│   ├── decisions/\n│   ├── avoid/                    # things to skip/avoid\n│   └── [topic]/\n├── pending-issues/\n└── solved-issues/\n```\n\n> ⚠️ **NEVER** create `.lovable/memories/` (trailing `s`). The path is `.lovable/memory/`.\n\n---\n\n## Anti-Corruption Rules\n\n1. **Never delete history** — mark done, move to completed sections.\n2. **Never overwrite blindly** — read before write; preserve existing content.\n3. **Never leave orphans** — every file indexed; every reference resolves.\n4. **Never split what should be unified** — plans and suggestions live in ONE file each.\n5. **Never mix states** — an issue is pending OR solved, never both.\n6. **Never skip the index update** — new memory file ⇒ update `index.md` in the same operation.\n7. **Never assume the next AI knows anything** — write as if explaining to a stranger.\n\n---\n\n## Important\n\n- Save trigger phrases: **\"write memory\"**, **\"end memory\"**, **\"update memory\"**.\n- Lose as little of the conversation as possible.\n- This prompt lives at `.lovable/prompts/03-write-memory.md`; root index `.lovable/prompt.md` references it.\n- Restructure any folder that doesn't match this layout. All `.md` files lowercase-hyphenated.\n\n*Prompt v3.0.*", slug: "write-memory", id: "default-write-memory", category: "onboarding" },
  { name: "Coding Guidelines", text: "# Coding Guidelines\n\n> **Purpose:** Read and synthesize existing repository context from the Lovable memory folder and the full specification set, then produce a reliability risk report before any implementation work begins. Do not implement anything. Only produce a report and specification-side artifacts for memory, suggestions, and planning.\n\n---\n\n## Goals\n\n1. Reconstruct project requirements by reading the .lovable memory content and the existing spec files and idea files across all projects.\n2. Produce a detailed risk and failure-chance report for handing the current specs to another AI.\n3. Establish a disciplined workflow for Lovable suggestions tracking and future planning so another AI can continue work reliably.\n\n## Inputs to read\n\n- .lovable/ (memories/, memory/, memory/suggestions/, any other Lovable state folders). Do NOT touch any skipped/ folder.\n- Spec folder content for all projects: ideas, backend/frontend specs, instruction builder specs, seeding/configuration specs, data model specs, acceptance criteria. Read root spec/ folder for a general idea.\n\n## Deliverable 1 — Reliability and Failure-Chance Report\n\n1. Success probability estimates by module complexity tier (simple, medium, complex agentic workflows, end-to-end), with explicit assumptions.\n2. Failure map — where failures are likely (module + workflow), why (missing constraints, ambiguity, cross-file inconsistency), how they manifest.\n3. Corrective actions — prioritized list of spec fixes; for each: what to change, where, expected reliability gain.\n4. Readiness decision — whether the spec set is ready for implementation; what must be fixed first.\n\n## Deliverable 2 — Lovable Suggestions Workflow\n\n- Location: .lovable/memory/suggestions — one file per suggestion.\n- File naming: YYYYMMDD-HHMMSS-suggestion-<slug>.md.\n- Content: suggestionId, createdAt, source (Lovable), affectedProject, description, rationale, proposed change, acceptance criteria, status (open/inProgress/done), completion notes.\n- On completion → status done; archive or remove per policy.\n\n## Deliverable 3 — plan.md Future Work Roadmap\n\nCreate plan.md at repo root: prioritized backlog grouped by phase and project. Each task: objective, dependencies, expected outputs (spec/UI/API), acceptance criteria. Include a Next task selection section listing implementable items.\n\n## Interaction rule\n\nAfter producing the report and creating the memory and plan artifacts, ask the user which specific task to implement next.\n\n*Prompt v1.0. Trigger phrase: \"coding guidelines\".*", slug: "coding-guidelines", id: "default-coding-guidelines", category: "onboarding" },
  { name: "Logo Create", text: "# Logo Creation Instruction\n\nCreate a logo from the inputs below. Save all generated assets into the project file system so the protocol is repeatable.\n\n## Inputs\n\n1. `ProductName`\n2. `ProductIdea` — short product idea, voice, tone\n3. `SampleColors[]` — sample color(s) or palette hint\n4. `NeedsDarkWhiteVariants` — optional boolean, default ON\n\n## Folder Structure\n\n```\n/ (repo root)\n└── Projects/\n    └── {Seq}-{PascalCaseProductName}/\n        ├── README.md\n        ├── icons-svg/        (Logo.svg, Logo-Dark.svg, Logo-White.svg)\n        ├── icons-image/      (Logo-052/128/256/512.png, Logo-1024-Light.png, Logo-1024-Dark.png)\n        └── colors-themes/    (Palette.md, Tokens.json — flat PascalCase keys)\n\n(repo root)\n├── favicon.ico\n└── favicon.png\n```\n\n## Actionable Items\n\n1. Project scaffold under `Projects/{Seq}-{PascalCaseProductName}/` — zero-padded sequence (`01`, `02`, …), never overwrite.\n2. Generate `Logo.svg`; if `NeedsDarkWhiteVariants` is ON (default), also generate `Logo-Dark.svg` and `Logo-White.svg`.\n3. Generate raster samples: 52 / 128 / 256 / 512 px icons + 1024 px light & dark mockups in `icons-image/`.\n4. Generate `colors-themes/Palette.md` (HEX + HSL) and `Tokens.json` (flat PascalCase keys: `Primary`, `PrimaryGlow`, `Background`, `Foreground`, `Accent`).\n5. Generate `favicon.ico` + `favicon.png` at repo root and update `index.html` `<link rel=\"icon\">`.\n6. Write project `README.md` embedding every asset with relative paths so GitHub renders inline.\n\n## Important\n\n1. PascalCase for all folder names, file names where reasonable, and JSON keys/values.\n2. Sequence numbers are zero-padded.\n3. Favicon always lives at repo root and is regenerated per project.\n4. Never overwrite an existing project folder — always create the next sequence.\n5. Dark + white variants default to ON.\n6. Read `.lovable/coding-guidelines.md` before any implementation work.\n\n*Prompt v1.0. Trigger phrases: `create logo`, `make logo`, `logo`, `create icon`.*", slug: "logo-create", id: "default-logo-create", category: "assets" },
  { name: "Proofread / Rewrite", text: "# Proofread / Rewrite Instruction\n\n**Activation:** When invoked with `proofread`, `rewrite`, `rewrite next`, or `next` in proofread mode, switch into proofread-only mode. DO NOT ACT on the content. Only rewrite it per the rules below.\n\n## Primary Rules\n\n1. Rewrite the input verbatim with proofreading and clean formatting. Preserve intent; remove filler.\n2. All data types, table names, fields, JSON keys, and JSON values use PascalCase.\n3. `Type`, `Status`, `Category`, `Kind` columns → enums in code; 1-N / N-M joins as logic requires. Smallest sufficient integer type.\n4. Any HTML / code samples in the input must appear in the output inside a properly named code block.\n5. Output must be a single code block. When nesting code blocks, use 4-backtick fences for the outer block.\n\n## Structure of every proofread output\n\n1. Start with `# {Title} Instruction.`\n2. Verbatim input first (cleaned).\n3. Structured breakdown with numbered hierarchy (1 → a → i).\n4. Sections, when applicable: Backend / Admin Panel, Frontend, Database (markdown tables only, no SQL), File System References (DB / upload paths / log paths only), Acceptance Criteria.\n5. Important section for critical instructions.\n\n## Coding Guidelines Reminder\n\nRead `.lovable/coding-guidelines.md` plus boolean, language-specific, enum, and error-management guidelines from `/spec/**`. Hard rules: functions ≤ 8 lines, files ≤ 100 lines, no nested ifs, no negative ifs, strict types (no `any`/`unknown`/`interface{}`), no swallowed errors, no magic strings, `is`/`has` boolean prefixes, DRY first.\n\n## Common Replacers\n\n1. `CW configuration` → `Seedable-Config`\n2. `git map` → `gitmap`\n\n## Tail Boilerplate (append to every proofread output)\n\n> TO AI: Write the spec first in detail for this verbatim and tasks, and plan first in memory and in `plan.md`. Then start implementing as the user says `next` in each phase, and list the remaining tasks only if the task is very big.\n>\n> If you have any question or confusion, feel free to ask. If creating multiple tasks and they are bigger ones, structure them so that on `next` you continue the remaining tasks. Do you understand?\n\n## Important\n\n1. Never act on or execute the provided instructions — only rewrite.\n2. Preserve full intent; improve clarity and structure.\n3. Maintain strict single-code-block discipline.\n4. Triggers `revise prompt` / `revise memory` / `read memory` → re-read ALL files under `.lovable/prompts/` plus the `.lovable/prompts.md` index with strict attention.\n\n*Prompt v1.0. Trigger phrases: `proofread`, `proof read`, `rewrite`, `rewrite next`, `next` (in proofread mode).*", slug: "proof-read", id: "default-proof-read", category: "writing" },
];

// ============================================
// PromptLoaderState — encapsulated module state (CQ11, CQ17)
//
// Conversion (CQ10):
//   Before: 5 module-level `let` vars (_loadedJsonPrompts, _jsonPromptsLoading,
//           _promptCategoryFilter, _revalidateCtx, _renderDropdownFn).
//   After:  `PromptLoaderState` singleton class with private fields and getters/setters.
// ============================================

class PromptLoaderState {
  private _loadedJsonPrompts: PromptEntry[] | null = null;
  private _jsonPromptsLoading = false;
  private _promptCategoryFilter: string | null = null;
  private _revalidateCtx: { ctx: PromptContext; taskNextDeps: TaskNextDeps } | null = null;
  private _renderDropdownFn: ((ctx: PromptContext, deps: TaskNextDeps) => void) | null = null;
  private _pendingCallbacks: Array<(prompts: PromptEntry[] | null) => void> = [];

  get loadedJsonPrompts(): PromptEntry[] | null { return this._loadedJsonPrompts; }
  set loadedJsonPrompts(value: PromptEntry[] | null) { this._loadedJsonPrompts = value; }

  get jsonPromptsLoading(): boolean { return this._jsonPromptsLoading; }
  set jsonPromptsLoading(value: boolean) { this._jsonPromptsLoading = value; }

  get promptCategoryFilter(): string | null { return this._promptCategoryFilter; }
  set promptCategoryFilter(value: string | null) { this._promptCategoryFilter = value; }

  get revalidateCtx(): { ctx: PromptContext; taskNextDeps: TaskNextDeps } | null { return this._revalidateCtx; }
  set revalidateCtx(value: { ctx: PromptContext; taskNextDeps: TaskNextDeps } | null) { this._revalidateCtx = value; }

  get renderDropdownFn(): ((ctx: PromptContext, deps: TaskNextDeps) => void) | null { return this._renderDropdownFn; }
  set renderDropdownFn(value: ((ctx: PromptContext, deps: TaskNextDeps) => void) | null) { this._renderDropdownFn = value; }

  enqueuePendingCallback(callback: (prompts: PromptEntry[] | null) => void): void {
    this._pendingCallbacks.push(callback);
  }

  flushPendingCallbacks(prompts: PromptEntry[] | null): void {
    const pending = this._pendingCallbacks.slice();
    this._pendingCallbacks = [];
    for (const callback of pending) {
      try {
        callback(prompts);
      } catch (e) {
        logError('parsePromptFile', 'Prompt callback execution failed', e);
        showToast('❌ Prompt callback failed', 'error');
      }
    }
  }
}

const promptLoaderState = new PromptLoaderState();

/** @deprecated Use promptLoaderState.promptCategoryFilter directly. */
export const _promptCategoryFilter: string | null = null;
export function getPromptCategoryFilter(): string | null { return promptLoaderState.promptCategoryFilter; }
export function setPromptCategoryFilter(value: string | null): void {
  promptLoaderState.promptCategoryFilter = value;
}

// ── Multi-select category filter (new — used by Filter button menu) ──
const promptCategoryFilterSet: Set<string> = new Set<string>();
/** Read current multi-select category filter (lowercased values). */
export function getPromptCategoryFilterSet(): Set<string> { return promptCategoryFilterSet; }
/** Toggle one category in the filter set. */
export function togglePromptCategoryFilter(catLower: string): void {
  if (promptCategoryFilterSet.has(catLower)) promptCategoryFilterSet.delete(catLower);
  else promptCategoryFilterSet.add(catLower);
}
/** Remove every category from the filter set. */
export function clearPromptCategoryFilterSet(): void { promptCategoryFilterSet.clear(); }

/** Invalidate prompt cache (e.g. after save/delete) */
export function invalidatePromptCache(): void {
  promptLoaderState.loadedJsonPrompts = null;
  // Also invalidate SDK cache if available
  const sdk = window.marco as { prompts?: { invalidateCache(): Promise<void> } } | undefined;
  if (sdk && sdk.prompts && typeof sdk.prompts.invalidateCache === 'function') {
    sdk.prompts.invalidateCache().catch(function(e: unknown) { log('[PromptLoader] SDK cache invalidation failed: ' + (e instanceof Error ? e.message : String(e)), 'warn'); });
  }
  clearPromptCache().then(function() {
    log('[PromptCache] Cache cleared (invalidated)', 'info');
  });
  clearUISnapshot().then(function() {
    log('[UISnapshot] Snapshot cleared (invalidated)', 'info');
  });
}

/** Check if prompts are already loaded in memory */
export function isPromptsCached(): boolean {
  return promptLoaderState.loadedJsonPrompts !== null && promptLoaderState.loadedJsonPrompts.length > 0;
}

/** Clear in-memory loaded prompts (used after save/delete) */
export function clearLoadedPrompts(): void {
  promptLoaderState.loadedJsonPrompts = null;
  // Also invalidate SDK cache
  const sdk = window.marco as { prompts?: { invalidateCache(): Promise<void> } } | undefined;
  if (sdk && sdk.prompts && typeof sdk.prompts.invalidateCache === 'function') {
    sdk.prompts.invalidateCache().catch(function(e: unknown) { log('[PromptLoader] SDK cache invalidation failed: ' + (e instanceof Error ? e.message : String(e)), 'warn'); });
  }
}

// ============================================
// CQ16: Extracted message relay context
// ============================================

interface RelayCtx {
  settled: boolean;
  requestId: string;
  timeout: ReturnType<typeof setTimeout>;
  resolve: (resp: ExtensionResponse) => void;
  _onResponse?: (event: MessageEvent) => void;
}

// CQ16: Extracted from sendToExtension closure
function finishRelay(ctx: RelayCtx, resp: ExtensionResponse): void {
  if (ctx.settled) return;
  ctx.settled = true;
  window.removeEventListener('message', ctx._onResponse!);
  clearTimeout(ctx.timeout);
  ctx.resolve(resp);
}

// CQ16: Extracted from sendToExtension closure
function handleRelayResponse(ctx: RelayCtx, event: MessageEvent): void {
  if (event.data && event.data.source === 'marco-extension' && event.data.requestId === ctx.requestId) {
    finishRelay(ctx, event.data.payload);
  }
}

/**
 * Send a message to the extension via chrome.runtime or window.postMessage relay.
 * Returns a Promise that resolves with the extension response.
 */
export function sendToExtension(type: string, payload: Record<string, unknown>): Promise<ExtensionResponse> {
  return new Promise<ExtensionResponse>(function(resolve) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const msg = Object.assign({ type: type }, payload);
        chrome.runtime.sendMessage(msg, function(resp: ExtensionResponse) {
          const lastError = chrome.runtime?.lastError;
          if (lastError) {
            log('Extension message error: ' + (lastError.message || ''), 'warn');
            resolve({ isOk: false, errorMessage: lastError.message || 'runtime error' });
            return;
          }
          resolve(resp);
        });
        return;
      } catch (e) { logSub('chrome.runtime.sendMessage unavailable, falling through to relay: ' + (e instanceof Error ? e.message : String(e)), 1); }
    }

    // Relay via window.postMessage (content script bridge)
    const requestId = 'pr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    const ctx: RelayCtx = {
      settled: false,
      requestId,
      timeout: setTimeout(function() {
        log('Extension relay timed out for ' + type, 'warn');
        finishRelay(ctx, { isOk: false, errorMessage: 'Extension relay timeout' });
      }, 5000),
      resolve,
    };

    ctx._onResponse = function(event: MessageEvent) { handleRelayResponse(ctx, event); };

    window.addEventListener('message', ctx._onResponse);
    window.postMessage({ source: 'marco-controller', requestId: requestId, ...(payload || {}), type: type }, '*');
  });
}

// ============================================
// Prompt loading
// ============================================

/**
 * Try loading prompts via chrome.runtime or relay, returns Promise.
 */
function tryLoadByMessage(type: string): Promise<PromptEntry[] | null> {
  return sendToExtension(type, {}).then(function(response: ExtensionResponse) {
    if (!response) return null;
    const prompts = normalizePromptEntries((response.prompts) as Partial<PromptEntry>[]);
    return prompts.length > 0 ? prompts : null;
  });
}

export function setRevalidateContext(ctx: PromptContext, taskNextDeps: TaskNextDeps): void {
  promptLoaderState.revalidateCtx = { ctx, taskNextDeps };
}

/** Register the renderPromptsDropdown function (called from prompt-dropdown to break circular dep) */
export function setRenderDropdownFn(fn: (ctx: PromptContext, deps: TaskNextDeps) => void): void {
  promptLoaderState.renderDropdownFn = fn;
}

/**
 * Trigger a full re-render of the main prompts dropdown using the last-registered
 * context (from setRevalidateContext) and renderer (from setRenderDropdownFn).
 * Used by CRUD flows (save / delete / rename) to refresh the list after mutation.
 */
export function rerenderPromptsDropdown(): void {
  const fn = promptLoaderState.renderDropdownFn;
  const c = promptLoaderState.revalidateCtx;
  if (!fn || !c) return;
  try { fn(c.ctx, c.taskNextDeps); }
  catch (e) { logError('rerenderPromptsDropdown', 'Re-render failed', e); }
}

// CQ16: Extracted from loadPromptsFromJson legacy path closure
function finishLegacyLoad(
  prompts: PromptEntry[] | null,
  source: string,
): PromptEntry[] | null {
  promptLoaderState.jsonPromptsLoading = false;
  if (prompts && prompts.length > 0) {
    promptLoaderState.loadedJsonPrompts = prompts;
    log('Loaded ' + prompts.length + ' prompts from ' + source, 'success');
    writePromptCache(prompts as CachedPromptEntry[]).then(function() {
      log('[PromptCache] Cached ' + prompts.length + ' prompts to IndexedDB', 'info');
    });
    promptLoaderState.flushPendingCallbacks(promptLoaderState.loadedJsonPrompts);
    return promptLoaderState.loadedJsonPrompts;
  }
  promptLoaderState.flushPendingCallbacks(null);
  return null;
}

 
export function loadPromptsFromJson(): Promise<PromptEntry[] | null> {
  const loadStartMs = Date.now();

  // ── SDK delegation (preferred path) ──
  const sdk = window.marco as { prompts?: { getAll(): Promise<unknown[]> } } | undefined;
  if (sdk && sdk.prompts && typeof sdk.prompts.getAll === 'function') {
    if (promptLoaderState.loadedJsonPrompts) {
      log('[PromptLoad] ✅ In-memory cache hit (' + promptLoaderState.loadedJsonPrompts.length + ' prompts, 0ms)', 'info');
      return Promise.resolve(promptLoaderState.loadedJsonPrompts);
    }
    log('[PromptLoad] Fetching via SDK marco.prompts.getAll()...', 'info');
    return sdk.prompts.getAll().then(function(entries: unknown[]) {
      const prompts = normalizePromptEntries(entries as Partial<PromptEntry>[]);
      const elapsed = Date.now() - loadStartMs;
      if (prompts.length > 0) {
        promptLoaderState.loadedJsonPrompts = prompts;
        log('[PromptLoad] ✅ SDK returned ' + prompts.length + ' prompts (' + elapsed + 'ms)', 'success');
        promptLoaderState.flushPendingCallbacks(prompts);
        return prompts;
      }
      log('[PromptLoad] ⚠️ SDK returned empty — falling back to defaults (' + elapsed + 'ms)', 'warn');
      promptLoaderState.loadedJsonPrompts = DEFAULT_PROMPTS;
      promptLoaderState.flushPendingCallbacks(DEFAULT_PROMPTS);
      return DEFAULT_PROMPTS;
    }).catch(function(e: unknown) {
      const elapsed = Date.now() - loadStartMs;
      log('[PromptLoad] ❌ SDK prompts.getAll() failed (' + elapsed + 'ms): ' + (e instanceof Error ? e.message : String(e)) + ' — using defaults', 'warn');
      promptLoaderState.loadedJsonPrompts = DEFAULT_PROMPTS;
      promptLoaderState.flushPendingCallbacks(DEFAULT_PROMPTS);
      return DEFAULT_PROMPTS;
    });
  }

  // ── Legacy path (SDK not available) ──
  log('[PromptLoad] SDK not available — using legacy load path', 'info');

  // 1. In-memory cache
  if (promptLoaderState.loadedJsonPrompts) {
    log('[PromptLoad] ✅ In-memory cache hit (' + promptLoaderState.loadedJsonPrompts.length + ' prompts, 0ms)', 'info');
    return Promise.resolve(promptLoaderState.loadedJsonPrompts);
  }
  if (promptLoaderState.jsonPromptsLoading) {
    return new Promise<PromptEntry[] | null>(function(resolve) {
      promptLoaderState.enqueuePendingCallback(resolve);
    });
  }
  promptLoaderState.jsonPromptsLoading = true;

  // 2. Try IndexedDB cache first (instant) — no SWR, no background revalidation
  return readPromptCache().then(function(cached) {
    if (cached && cached.entries && cached.entries.length > 0) {
      promptLoaderState.loadedJsonPrompts = cached.entries as PromptEntry[];
      promptLoaderState.jsonPromptsLoading = false;
      const age = Math.round((Date.now() - cached.fetchedAt) / 1000);
      log('[PromptCache] Loaded ' + cached.entries.length + ' prompts from IndexedDB JsonCopy (age=' + age + 's)', 'success');
      promptLoaderState.flushPendingCallbacks(promptLoaderState.loadedJsonPrompts);

      return promptLoaderState.loadedJsonPrompts;
    }

    // No cache — fetch directly from extension
    log('[PromptCache] No IndexedDB cache — fetching from extension...', 'info');

    return fetchAndCacheFromExtension();
  }).catch(function(e: unknown) {
    logError('loadPrompts', 'Prompt loading failed', e);
    showToast('❌ Prompt loading failed', 'error');
    return fetchAndCacheFromExtension();
  });
}

// ============================================
// Extension fetch with fallback chain
// ============================================

/** Fetch from extension, fall back to preamble or defaults. */
function fetchAndCacheFromExtension(): Promise<PromptEntry[] | null> {
  return tryLoadByMessage('GET_PROMPTS').then(function(prompts: PromptEntry[] | null) {
    if (prompts && prompts.length > 0) {
      return finishLegacyLoad(prompts, 'extension bridge GET_PROMPTS (SQLite)');
    }

    return loadFromPreambleOrDefaults();
  });
}

/** Try __MARCO_PROMPTS__ preamble, then hardcoded defaults. */
function loadFromPreambleOrDefaults(): PromptEntry[] | null {
  const preamble = window.__MARCO_PROMPTS__;
  const hasPreamble = preamble && Array.isArray(preamble) && preamble.length > 0;

  if (hasPreamble) {
    return finishLegacyLoad(normalizePromptEntries(preamble), '__MARCO_PROMPTS__ preamble');
  }

  log('No prompts from bridge or preamble — using hardcoded defaults', 'warn');

  return finishLegacyLoad(DEFAULT_PROMPTS, 'hardcoded DEFAULT_PROMPTS');
}

// ============================================
// Manual Load — forceLoadFromDb
// ============================================

/**
 * Force-load prompts from the extension DB (bypasses in-memory + IndexedDB cache).
 * Called by the "Load" button in the prompt dropdown header.
 */
export function forceLoadFromDb(): Promise<PromptEntry[] | null> {
  log('[PromptLoad] Manual load triggered — clearing caches and fetching from DB...', 'check');
  promptLoaderState.loadedJsonPrompts = null;
  promptLoaderState.jsonPromptsLoading = false;

  return clearPromptCache()
    .then(function() { return clearUISnapshot(); })
    .then(function() { return tryLoadByMessage('GET_PROMPTS'); })
    .then(function(prompts: PromptEntry[] | null) {
      return handleForceLoadResult(prompts);
    });
}

/** Process force-load result and cache it. */
function handleForceLoadResult(prompts: PromptEntry[] | null): PromptEntry[] | null {
  if (prompts && prompts.length > 0) {
    return finishLegacyLoad(prompts, 'manual load from DB');
  }

  log('[PromptLoad] Manual load returned empty — using defaults', 'warn');

  return finishLegacyLoad(DEFAULT_PROMPTS, 'defaults (manual load empty)');
}

// ============================================
// HTML Copy — save rendered dropdown HTML for MacroController
// ============================================

/** Save rendered dropdown HTML as HtmlCopy in IndexedDB. */
export function saveHtmlCopy(options: { html: string; promptCount: number; dataHash: string }): Promise<void> {
  return writeHtmlCopy(options);
}

/**
 * Resolve prompts config from multiple sources.
 */
export function getPromptsConfig(): ResolvedPromptsConfig {
  const promptsCfg = (window.__MARCO_CONFIG__ || {}).prompts || {};
  const rawEntries = (promptsCfg.entries || promptsCfg.prompts || []) as Array<Partial<PromptEntry> & { id?: string; isDefault?: boolean }>;
  let entries: PromptEntry[] = normalizePromptEntries(Array.isArray(rawEntries) ? rawEntries : []);

  const loaded = promptLoaderState.loadedJsonPrompts;

  if (loaded && loaded.length > 0) {
    const merged: PromptEntry[] = loaded.slice();
    const seen: Record<string, boolean> = {};
    for (const prompt of merged) {
      seen[(prompt.name || '').toLowerCase()] = true;
    }

    for (const p of entries) {
      const key = (p.name || '').toLowerCase();

      if (p.name && p.text && !seen[key]) {
        merged.push(p);
        seen[key] = true;
      }
    }
    entries = merged;
  }

  if (entries.length === 0) {
    entries = DEFAULT_PROMPTS;
  }

  return {
    entries: entries,
    pasteTargetXPath: promptsCfg.pasteTargetXPath || (promptsCfg.pasteTarget && promptsCfg.pasteTarget.xpath) || DEFAULT_PASTE_XPATH,
    pasteTargetSelector: promptsCfg.pasteTargetSelector || (promptsCfg.pasteTarget && promptsCfg.pasteTarget.selector) || ''
  };
}

/** Get contextually suggested prompts. */
export function getSuggestedPrompts(allEntries: PromptEntry[]): PromptEntry[] {
  const currentTags = (window as unknown as { RiseupAsiaMacroExt?: { Projects?: { MacroController?: { meta?: { tags?: string[] } } } } }).RiseupAsiaMacroExt?.Projects?.MacroController?.meta?.tags || [];
  
  if (currentTags.length === 0) {
    // Fallback: recently used or favorites
    return allEntries.filter(p => p.isFavorite).slice(0, 3);
  }

  return allEntries.filter(p => {
    if (!p.tags || p.tags.length === 0) return false;
    return p.tags.some((t: string) => currentTags.includes(t.toLowerCase()));
  }).slice(0, 5);
}

