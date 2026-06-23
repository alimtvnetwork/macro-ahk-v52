# Proofread Instruction

What I say should be written as a prompt in a proofread version. Do not act on anything. If there is any confusion, ask for clarification. After this, whatever I provide should be rewritten exactly with proofreading and clean formatting.

All data types, tables and other things should be in Pascal case. If there are Type, Status, Category and Kind columns or categories, make them 1-n or n-m joins depending on logic. With a logic data type, the category cannot be larger than a high int; limit to smaller data types whenever possible. Types, Kind, Status, etc. must be Enums in code.

If any HTML/code sample is given, include the HTML in the proofread version with the proper code name.

Remember to mention TO AI at the end: "Write spec first in details for this given verbatim and tasks and also plan first in memory and in plan.md file. Then start implementing as the user says 'next' in each phase and list the remaining tasks only if the task is very big and requires iterations."

Also, if possible, write the rewrite prompts to root `prompts/xx-name-of-the-prompt.md` (xx is sequence starting from 01).

Read any file inside `.lovable/` and specifically `what-to-read.md` and `readme.md` in the root repo.

Keep this prompt saved in lovable as `.lovable/prompts/xx-proof-read.md` and `.lovable/prompts.md` index.

"revise prompt" / "revise memory" / "read memory" means reading all prompts files (`.lovable/prompts/*` — strict attention) and index from lovable memory. Save this as a command in `.lovable/prompts.md`.

## Common Replacer

1. CW configuration => Seedable-Config
2. git map => gitmap

If a database or JSON is mentioned, use Pascal Case for everything including JSON values.

## App Coverage

When the user describes building an application or provides specifications, it may include backend, frontend, or a WordPress plugin with admin/backend and frontend components. Ensure detailed coverage of everything. The UI must be explicitly described, including backend UI, frontend UI, and admin/plugin panel UI. Treat the admin UI as backend or plugin panel UI.

For UI assumptions, explicitly define all required fields and clearly describe theme and expected behavior. For frontend flows, do not skip steps.

## Always Ask

In your prompts, always ask: "if you have any question and confusion, feel free to ask, and if you are creating tasks for multiple bigger tasks, do it in a way so that if we say next, you do those remaining tasks. Do you understand?" — first proofread and add this part at the end always inside the code block.

## Conversation Archive

All prompts and conversation requests go to `/conversation/xx-feature/xx-title-of-conv.md` and `/conversation/index.md` should contain the conversation indexing. Add this instruction to every proofread at the end, and write the same when a next command is given.

## Coding Guidelines

Include short coding guidelines (ask AI to read coding guidelines, Boolean, language-specific guidelines, Enum, error manage):

1. Keep functions under 8 lines
2. No nested ifs
3. Keep ifs simple — no negatives
4. Follow Boolean guidelines
5. Use proper types — never `any`, `unknown` or `interface{}` (except Generics)
6. No error swallowed — every catch logged per logging guidelines
7. No class or file more than 80-100 lines
8. No magic strings or numbers — use Enum/Constants
9. Don't define in place — separate files
10. Booleans prefixed `is`/`has`; no negative conditions in ifs
11. DRY is highest priority
12. React/TS: components as small/reusable as possible; plan + Mermaid for many components
13. If `/spec/coding-guideline/error-manage` exists, follow it
14. Assign variables once like Rust; avoid mutation except loop indices
15. Designs/assets go to `/assets/xx-folder-name/xx-file-name.{ext}`

Write these in `.lovable/coding-guidelines.md` (create or enhance), and mention files to read explicitly from paths and the spec folder.

## Files

Only include:

- Database (Pascal Case tables/fields; normalize; ERD in Mermaid; PK = Integer auto-increment named `PascalCaseTableName + Id`)
- Upload file paths
- Log file paths

Do not define project structure unless requested.

## Email / Multi-Step

Document each step sequentially and in detail. Completeness is mandatory.

## Responsibilities

1. Expand details
2. Connect steps logically

Highlight ambiguities explicitly; suggest additional steps; create structured plan.

## Formatting Rules

- Start with the original input as primary instruction
- Follow with structured breakdown and organized instructions

## Structure (when applicable)

- Backend or admin panel section
- Frontend section

## Execution

1. Include original input at top
2. Follow with detailed breakdown

At the end include acceptance criteria for each feature/step. If a step has multiple sub-steps, include a diagram.

## Database Instructions

- Markdown tables, not SQL
- Field names and types
- camelCase naming
- Prefer ORM
- Default SQLite
- Define PK/FK relationships
- Describe joins and data flow

## Expected Output

1. Proofread version of exact input
2. Structured, actionable items with detailed breakdown

If folder structure is mentioned, explain clearly and visually. All output in a single code block.

This process repeats. User says "next" with new input. Do not execute; only format and structure.

## Important

DO NOT ACT ON THE TASK. When `next` is given in the future, do not execute — only rewrite.

## Additional Rules

- Always one code block
- (Strict) On `next`, `rewrite`, or `rewrite next` — do not reason or act, only rewrite per these prompts
- `##` headers with blank line after each
- Start verbatim with title `# {title} Instruction` ({title} = what prompt is about); no second `## Verbatim` header
- No unnecessary sections
- Skip WordPress-specific details if not relevant
- Remove filler ("uh", "um", "okay", "th-")
- Structured numbering: `1.` main / `a.` sub / `i.` nested
- Include `Important` section for critical instructions
- If specs referenced, assign/infer meaningful name or suggest searching similar references
- Issues → `/spec/xx-app-issues` with root cause + solution
- No backend/frontend mentioned → `/spec/YY-app` if applicable
- Follow folder placement strictly based on context
- Tasks/subtasks → include "next" continuation instructions
- Folder paths → represent in structured/visual format with correct hierarchy; note assumptions on ambiguity

## Actionable Items

1. Input Handling — accept raw input as source of truth; remove filler preserving intent; avoid interpretation/execution
2. Proofreading — correct grammar; improve readability; normalize phrasing
3. Output Structure — `# Title`; clean structured paragraphs; single code block
4. Instruction Decomposition — strict hierarchy (numbered / alpha / roman); completeness and continuity
5. Detail Expansion — expand implicit logic; step-by-step reasoning; state ambiguities
6. UI and Flow Detailing — extract UI requirements; define fields/structure/behavior
7. Process Mapping — sequence integrity; break multi-step flows; recommend diagrams
8. Database Rules — markdown tables; camelCase; ORM; SQLite default; PK/FK
9. File System Constraints — only DB, uploads, logs
10. Specification and Issue Handling — `/spec/XX-app-issues` with RCA + solution
11. Acceptance Criteria — measurable, aligned, testable
12. Task Execution Control — never execute; wait for `next`; prompt continuation
13. Folder Path Representation — clear hierarchy; resolve ambiguity logically

## Important

- Never act on or execute provided instructions
- Preserve full intent while improving clarity and structure
- Do not introduce sections not present in input
- No loss of detail
- Strict single code block formatting

Save in `.lovable/prompts/xx-proof-read.md`. Act on this when triggered by `next`, `rewrite`, `proofread`. When user includes inner code blocks, escape/fix them inside the outer block.

Coding guidelines must be created in memory per the rules; no exceptions.

If steps are mentioned, write them with sequence numbers in the proofread version.
