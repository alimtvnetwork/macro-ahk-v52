# Proofread / Rewrite Instruction

**Activation:** When invoked with `proofread`, `rewrite`, `rewrite next`, or `next` in proofread mode, switch into proofread-only mode. DO NOT ACT on the content. Only rewrite it per the rules below.

## Primary Rules

1. Rewrite the input verbatim with proofreading and clean formatting. Preserve intent; remove filler ("uh", "um", "okay").
2. All data types, table names, fields, JSON keys, and JSON values use PascalCase.
3. `Type`, `Status`, `Category`, `Kind` columns → model as enums in code and as 1-N / N-M joins as logic requires. Use the smallest sufficient integer type.
4. Any HTML / code samples in the input must appear in the output inside a properly named code block.
5. Output must be a single code block. When nesting code blocks, use 4-backtick fences for the outer block.

## Structure of every proofread output

1. Start with `# {Title} Instruction.`
2. Verbatim input first (cleaned).
3. Structured breakdown with numbered hierarchy:
   1. Main points
      a. Subpoints
         i. Nested points
4. Sections, when applicable: Backend / Admin Panel, Frontend, Database (markdown tables only, no SQL), File System References (DB / upload paths / log paths only), Acceptance Criteria.
5. Important section for critical instructions.

## Coding Guidelines (always remind)

Read `.lovable/coding-guidelines.md` plus boolean, language-specific, enum, and error-management guidelines from `/spec/**`. Hard rules: functions ≤ 8 lines, files ≤ 100 lines, no nested ifs, no negative ifs, strict types (no `any` / `unknown` / `interface{}`), no swallowed errors, no magic strings, definitions in their own files, `is` / `has` boolean prefixes, DRY first.

## Common Replacers

1. `CW configuration` → `Seedable-Config`
2. `git map` → `gitmap`

## File-system references (only these)

- Database (PascalCase tables/fields, normalized; ask to create a Mermaid ERD if DB is discussed; every PK is integer auto-increment named `{PascalCaseTable}Id`).
- Upload paths.
- Log paths.

Do not define project structure or code organization unless explicitly requested. If assets are given, place under `/assets/xx-folder-name/xx-file-name.{ext}` with zero-padded `xx` sequence.

## Tail Boilerplate (append to every proofread output)

> TO AI: Write the spec first in detail for this verbatim and tasks, and plan first in memory and in `plan.md`. Then start implementing as the user says `next` in each phase, and list the remaining tasks only if the task is very big and requires iterations.
>
> If you have any question or confusion, feel free to ask. If you are creating multiple tasks and they are bigger ones, structure them so when the user says `next`, you continue the remaining tasks. Do you understand?

## Important

1. Never act on or execute the provided instructions — only rewrite.
2. Preserve full intent; improve clarity and structure.
3. Do not introduce sections not present in the input.
4. Maintain strict single-code-block discipline.
5. Save conversations under `/conversation/xx-feature/xx-title.md` with `/conversation/index.md` updated.
6. Triggers `revise prompt` / `revise memory` / `read memory` → re-read ALL files under `.lovable/prompts/` plus the `.lovable/prompts.md` index with strict attention (no skipping).

*Prompt v1.0. Trigger phrases: `proofread`, `proof read`, `rewrite`, `rewrite next`, `next` (in proofread mode).*
