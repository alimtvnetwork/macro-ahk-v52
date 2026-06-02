# Observability — UI Error Surface

Every failure mode surfaces in the UI. No silent failures, no swallow paths.

## Three-layer surface

### Layer 1 — Inline toast
- Fires immediately on `RunFailed` or any operation failure (Save/Import/Replace/etc).
- Shape: `[icon] <Reason> — <short ReasonDetail truncated to 80ch>` with **Show details** action.
- Timezone: dismiss after 8s; pinned (never auto-dismiss) for `Reason ∈ { BackupFailed, TransactionRolledBack, PathOutsideAuditRoot }` because user action is required.

### Layer 2 — Run banner
- The sticky run banner at top of the panel switches to error state on `RunFailed`:
  - Red-tone (semantic `--destructive` token, dark-theme adjusted).
  - Renders: MacroSlug, StepIndex, `Reason`, **Show details** + **Retry from this step** buttons.
  - **Retry from this step** is a fresh `StartMacro` with `RunContext` preserved + `StepIndex` honored as the new start anchor (still creates a new RunId — no in-place retry per No-Retry policy).

### Layer 3 — Show details dialog
- Modal, dark-theme styled, scrollable.
- Renders the **full** mandatory failure-log shape:
  - `Reason`, `ReasonDetail`, `MacroSlug`, `RunId`, `StepIndex`, `TimestampKL`, `TabUrl`
  - `VariableContext[]` table (Name, Source, Type, ResolvedValue, Reason) — Sensitive masked
  - `SelectorAttempts[]` table (Strategy, Expression, Matched, MatchCount, Reason)
  - `StackFiltered`
- Actions: **Copy diagnostic JSON**, **Open audit folder** (deep-link to `spec/audit/<RunId>/`), **Close**.

## Failure-mode matrix (no mode goes unhandled)

| Origin | Reason examples | Layers fired |
|--------|-----------------|--------------|
| Engine | StepTimeout, RunTimeout, MaxLoopsReached, ScoreNotFound, VariableUnresolved, VariableInjectionGuard, LoopWithoutProgress | 1+2+3 |
| Guards | PathOutsideAuditRoot, NewTabGuard, TabBusy, SupabaseBlocked | 1+2+3 |
| JSON I/O | SchemaInvalid, ParseFailed, BackupFailed, BundleTooLarge, ConflictUnresolved, UnsupportedSchemaVersion, MigrationFailed | 1+3 |
| Persistence | TransactionRolledBack, PostStateMismatch, BackupQuotaExceeded | 1+3 (pinned toast) |
| Messaging | TabClosed, PortDisconnected, UnknownMessageKind | 1+2 |
| Lifecycle | SwRestartStale, ExtensionReload | 2 (banner only — no toast spam on reload) |

## Aria + keyboard
- Toast: `role="status"` for non-pinned, `role="alert"` for pinned.
- Dialog: focus-trap, ESC closes, Tab cycles within.
- All buttons have explicit `aria-label`.

## CI guard
- `scripts/audit-error-swallow.mjs` ensures every `Reason` enum member has at least one UI test asserting the dialog renders correctly. Missing coverage fails CI.

## Tests
- Component tests (`tests/components/prompts/error-surface.test.tsx`) cover one fixture per Reason from the matrix above.
- E2E test (`tests/e2e/prompts/error-surface.spec.ts`) exercises the full path: trigger failure → toast → click Show details → assert dialog contents → Copy JSON.
