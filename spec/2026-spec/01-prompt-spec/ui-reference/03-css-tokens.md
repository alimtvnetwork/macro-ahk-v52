# CSS Tokens (HSL only)

All tokens MUST be declared in `index.css` and consumed via Tailwind semantic classes — never raw hex/rgb.

```css
:root {
  --prompt-bg:        220 14% 10%;
  --prompt-fg:        210 20% 96%;
  --prompt-muted:     220 10% 60%;
  --prompt-accent:    265 85% 65%;
  --prompt-accent-fg: 0 0% 100%;
  --prompt-border:    220 12% 22%;
  --prompt-ring:      265 85% 70%;
  --prompt-success:   140 60% 45%;
  --prompt-warning:    38 95% 55%;
  --prompt-danger:    355 80% 58%;
  --prompt-shadow:    0 8px 24px hsl(220 40% 4% / 0.4);
}
```

| Token | Use |
|---|---|
| `--prompt-bg` / `--prompt-fg` | Dropdown surface |
| `--prompt-accent` | Highlighted item, primary button |
| `--prompt-ring` | Focus ring |
| `--prompt-success/warning/danger` | Toast + status pill |

Dark theme enforced (per Core memory). No light mode.

## Acceptance

- [ ] The implementation satisfies the `CSS Tokens (HSL only)` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

