# Coding Guidelines

**Version:** 1.0.1
**Status:** Active
**Updated:** 2026-05-22
**AI Confidence:** High
**Ambiguity:** None

---

## Purpose

Canonical coding guidelines for every AI agent working on this project. These rules are mandatory and must be applied to every code change without exception. When in doubt, read the linked spec files first.

---

## AI Onboarding — Read These Files First

Before generating any code, the AI MUST read the following spec folders in order:

| Priority | Path | Why |
|----------|------|-----|
| 1 | `spec/03-error-manage/00-overview.md` | Error management is the #1 priority. Every catch must be logged properly. |
| 2 | `spec/02-coding-guidelines/00-overview.md` | Cross-language standards, naming, booleans, typing, DRY. |
| 3 | `spec/02-coding-guidelines/01-cross-language/02-boolean-principles.md` | Boolean naming and positive-condition rules. |
| 4 | `spec/02-coding-guidelines/consolidated-review-guide-condensed.md` | One-liner quick-reference for every PR. |

---

## The 15 Rules

### 1. Keep functions under 8 lines

- Function body target: **≤ 8 lines** (hard max 15).
- If a function exceeds 8 lines, extract cohesive blocks into named helpers and compose at the top.

### 2. No nested ifs

- **Zero nested `if`** — always invert the condition, exit early, and continue on the happy path.
- Use guard clauses to keep the main flow flat.
- See `spec/02-coding-guidelines/01-cross-language/20-nesting-resolution-patterns.md`

### 3. Keep ifs simple — no negatives

- **No `!` on function calls** — use `isInvalid()`, `isMissing()`, `isDisabled()` instead.
- **Max 2 conditions** per `if`.
- **Never mix `&&` and `||`** — extract into named booleans.
- **Never mix positive + negative** (`isX && !isY` → extract a named boolean).
- See `spec/02-coding-guidelines/01-cross-language/12-no-negatives.md`

### 4. Follow the Boolean guidelines

- All booleans (variables **and** functions) must start with `is` or `has` (99% of cases). `should` only for recommendations/preferences.
- **Never** use `not`/`no` in boolean names — use the inverse: `isInactive`, `isMissing`, `isDisabled`.
- Extract multi-part conditions into named variables.
- See `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/` and `spec/02-coding-guidelines/01-cross-language/24-boolean-flag-methods.md`

### 5. Use proper types — never use `any`, `unknown`, `interface{}`, or any wide-range type except for Generic

- No `any` / `interface{}` / `unknown` / `object` in business logic.
- **Always prefer generics** over `any`/`interface{}`/`unknown` — create a concrete generic type first, then reuse it.
- `unknown` only at parse/deserialization boundaries with a type guard.
- No inline return types — extract named types/interfaces so they can be reused.
- See `spec/02-coding-guidelines/01-cross-language/13-strict-typing.md`

### 6. No error should be swallowed — every catch must be logged properly

- **ZERO TOLERANCE:** Never swallow an error. Empty `catch {}`, bare `return nil`, ignored `Result` = automatic rejection.
- Log or return, always. Silent failures are the #1 production incident cause.
- Every error handle must follow the guidelines in `spec/03-error-manage/`.
- If the `spec/03-error-manage/` folder is available, every error handle must follow those guidelines properly.

### 7. No class or file can be more than 80–100 lines max

- File target: **≤ 100 lines** (hard max 300).
- If a file exceeds 100 lines, split by responsibility — extract helpers, sub-components, or domain modules.

### 8. No magic string or number — use Enum or Constants

- No magic strings → Enum.
- No magic numbers → named constant.
- Exceptions: `0`, `1`, `-1`, `""`, `true`, `false`, `null`/`nil`.
- Enum values: PascalCase only — `StatusType.Active`, never `STATUS_ACTIVE`.
- See `spec/02-coding-guidelines/01-cross-language/26-magic-values-and-immutability.md`

### 9. Don’t define definitions in place — define in a separate file and separately

- Types, constants, enums, and interfaces must live in their own files (e.g., `types.ts`, `constants.ts`, `enums.ts`).
- Never inline a type definition where it is used — extract it so it can be reused.

### 10. Booleans should always have `is` or `has` as a prefix

- Boolean variables: `isActive`, `hasPermission`, `shouldRetry`.
- Boolean-returning functions: `isTokenValid()`, `hasRole()`.
- Don’t use negative conditions in `if`s — learn the positive condition and keep it simple.
- See `spec/02-coding-guidelines/01-cross-language/02-boolean-principles.md`

### 11. Always write code so it is reusable — DRY is our highest priority

- Extract duplicated logic into shared helpers, hooks, or utilities.
- Before writing a new function, check if an existing one can be reused.
- See `spec/02-coding-guidelines/01-cross-language/08-dry-principles.md` and `spec/02-coding-guidelines/01-cross-language/09-dry-refactoring-summary.md`

### 12. Make components as small and reusable as possible — plan first, Mermaid if needed

- For React, TypeScript, or any other language: keep components under 100 lines.
- If there are too many components, create a plan first and draw Mermaid diagrams for component relationships.
- One component = one responsibility.

### 13. If `spec/03-error-manage/` is available, every error handle must follow those guidelines

- Error management from `spec/03-error-manage/` must be implemented from the very first line of code.
- Never write business logic without proper error handling wrapping it.
- This is non-negotiable.

### 14. Assign all variables at once — no mutation unless loop index

- Prefer immutable assignment like Rust: declare and assign in one go.
- Do not mutate variables after initialization unless it is a loop index.
- Use `const` by default; only use `let` when reassignment is truly required.

### 15. Designs/assets go to `/assets/xx-folder-name/xx-file-name.ext`

- If any designs or assets are given, place them under `/assets/<folder-name>/<file-name>.<ext>`.
- Keep the `xx` prefix for sequence ordering when multiple files exist in the same folder.
- Supported extensions: `.jpg`, `.png`, `.svg`, `.mp3`, `.mp4`, `.webp`, `.gif`, `.ico`, `.woff2`.

---

## Language-Specific Quick Reference

| Language | Guidelines Path |
|----------|-----------------|
| TypeScript | `spec/02-coding-guidelines/02-typescript/00-overview.md` |
| Go | `spec/02-coding-guidelines/03-golang/00-overview.md` |
| PHP | `spec/02-coding-guidelines/04-php/00-overview.md` |
| Rust | `spec/02-coding-guidelines/05-rust/00-overview.md` |
| C# | `spec/02-coding-guidelines/07-csharp/00-overview.md` |

---

## Enforcement

- These guidelines are **CODE RED** — violations are treated as bugs and must be fixed before merge.
- Run `scripts/audit/coding-guideline.mjs` (or equivalent) before submitting changes.
- When adding a new rule here, update the version and `updated` date.

---

*Coding guidelines v1.1.0 — 2026-05-22*

---

## Project-Critical Addenda (added 2026-06-02, Batch B steps 14–19)

These rules are summarized from project memory and `spec/02-coding-guidelines/`. Authoritative sources cited in parentheses.

### Part 1 — Code Quality (CQ) micro-rules
- **CQ14 — Braces always.** Single-statement `if`/`else`/`for`/`while` MUST still use `{}`. No one-liner branches. (`mem://standards/formatting-and-logic`, `spec/02-coding-guidelines/01-cross-language/04-code-style/01-braces-and-nesting.md`)
- **CQ15 — Newline grouping.** Blank line between import groups, between logical blocks, and before every `return`. (`spec/02-coding-guidelines/01-cross-language/04-code-style/03-blank-lines-and-spacing.md`)
- **Defensive property access.** Always use `?.` and `??` when traversing data of uncertain shape (storage, message payloads, JSON). Never assume `.foo.bar` is safe. (`spec/02-coding-guidelines/01-cross-language/19-null-pointer-safety.md`)

### Part 2 — Error-handling contract
- **`CaughtError`** is the only place `unknown` is allowed: `type CaughtError = unknown;` and narrow at the catch site. (`mem://architecture/data-type-definitions`)
- **Never `console.error()`.** Use `RiseupAsiaMacroExt.Logger.error(namespace, message, context)`. The only file allowed to call `console.error` directly is the Logger implementation itself. (`mem://standards/error-logging-via-namespace-logger.md`)
- **Never swallow errors.** Every `catch` must log via `Logger.error` AND either rethrow or surface to the user. Empty `catch {}` blocks fail CI (`scripts/audit-error-swallow.mjs`).
- **CODE RED file-error contract.** Any file/path error MUST log: (1) exact absolute path, (2) the missing item, (3) the reasoning for why it was expected. (`mem://constraints/file-path-error-logging-code-red.md`)
- **Failure log shape (mandatory).** Every recorder/replay/JS-step failure logs `Reason` (short code) + `ReasonDetail` + full `SelectorAttempts[]` (id/strategy/expression/matched/matchCount/reason) for selector misses + full `VariableContext[]` (name/source/row/column/resolvedValue/type/reason) for data failures. Missing values → log `null` + reason. (`mem://standards/verbose-logging-and-failure-diagnostics`)

### Part 3 — Type safety
- **No `unknown` except `CaughtError`.** All function parameters and returns are explicitly typed. (`mem://standards/unknown-usage-policy`)
- **`declare global {}`** for project-wide ambient types; never module-augment `globalThis` ad-hoc. (`mem://architecture/type-safety-standards`)
- **No `any`, no `interface{}`** (already rule #5; reiterated for blind-AI agents).

### Part 4 — Naming
- **SCREAMING_SNAKE_CASE constants** with prefix indicating purpose: `ID_*` (DOM ids), `SEL_*` (selectors), `ATTR_*` (data attributes), `CSS_*` (class names). (`mem://architecture/constant-naming-convention`)
- **No short names.** Banned identifiers: `val`, `fn`, `cb`, `el`, `msg`, `ctx`, `obj`. Use full words (`value`, `callback`, `element`, `message`, `context`, `target`). (Priority 0.8 backlog; `spec/02-coding-guidelines/01-cross-language/22-variable-naming-conventions.md`)
- **Boolean prefix** `is` / `has` / `should` / `can` (already rule #10).

### Part 5 — Storage & Auth
- **No Supabase.** Forbidden everywhere: no SDK, no localStorage shim, no auth tokens. (`mem://constraints/no-supabase`)
- **No PascalCase storage migration.** Do not rewrite `chrome.storage.local` keys; ~50+ consumers depend on the current shape. (`mem://constraints/no-storage-pascalcase-migration`)
- **Single auth contract.** Always call `getBearerToken()` — never read tokens directly from storage; never reimplement a token waterfall. (`mem://auth/unified-auth-contract`, `mem://auth/token-retrieval-strategy`)
- **No-retry policy.** No recursive retries, no exponential backoff, no scheduled redelivery. Sequential fail-fast only. (`mem://constraints/no-retry-policy`, `mem://constraints/webhook-fail-fast.md`)

### Part 6 — Testing
- **Test-with-features.** Every new feature/bugfix ships with matching tests (unit OR component OR E2E). PRs without tests are rejected. (`mem://preferences/test-with-features`)
- **Manual Chrome E2E is ALLOWED** (ban lifted 2026-05-25). (`mem://preferences/deferred-workstreams`)
- **React component tests are ALLOWED** (ban lifted 2026-05-25). Same source.

### Part 7 — Runtime guards & UI
- **Dark-only theme.** No light mode, no theme toggles. (`mem://preferences/dark-only-theme`)
- **Animation libs banned.** No `framer-motion`, no `gsap`. Use Tailwind + CSS keyframes only. (`mem://style/animation-strategy`)
- **`readme.txt` SP-1..SP-7.** Never auto-write time/clock/timestamp/git-update values into `readme.txt`. Honor explicit one-shot user writes only. (`mem://constraints/readme-txt-prohibitions`)
- **New-tab guard.** Auto-injector + project-matcher MUST call `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` before running. (`mem://features/new-tab-no-url-guard`)
- **Timer/observer teardown.** Every `setInterval`/`setTimeout`/`MutationObserver`/`addEventListener` needs a paired teardown + `pagehide` cleanup. UIs pause on `document.hidden`. (`mem://standards/timer-and-observer-teardown`)

### Enforcement (CI-gated)
- `scripts/check-coding-guidelines-coverage.mjs` fails CI if this summary omits any token in the gap matrix.
- `scripts/audit-error-swallow.mjs` fails CI on swallowed errors.
- `scripts/audit-logger-compliance.mjs` (Batch C) fails CI on `console.error` outside the Logger file.
- `scripts/audit-timer-teardown.mjs` (Batch D) fails CI on un-paired timers/observers.
- ESLint `no-restricted-syntax` (Batch C) bans `console.error` lexically.
