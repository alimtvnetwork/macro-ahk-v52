# 02 — Per-Mode Settings

**Date:** 2026-06-02
**Task:** T77

## Override scope

Each queue **kind** (`next`, `plan`, `custom`) may override the base delay independently:

```ts
interface DelaySettings {
  default: DelayConfig;
  perKind: Partial<Record<TaskKind, DelayConfig>>;
}

interface DelayConfig {
  baseMs: number;
  jitterPct?: number;     // 0..1; see 03-jitter.md
  skipFirst?: boolean;    // default true; see 04-skip-first.md
}
```

## Resolution

```ts
const cfg = settings.perKind[task.kind] ?? settings.default;
```

No deep merge — kind overrides are **whole-object** replacements to avoid surprise inheritance.

## Typical configuration

| Kind | baseMs | Notes |
|------|--------|-------|
| `next` | `DELAY_MS` | MUST match [Runtime Defaults](../reference/05-runtime-defaults.md). |
| `plan` | host override | MUST be schema-validated and clamped to the `DELAY_MS` range. |
| `custom` | `DELAY_MS` | Host may override, but the runtime-defaults table remains the fallback. |

## Persistence

Stored in the host's settings store under a single key `prompts.delaySettings`. Schema-validated on load; invalid values MUST fall back to `DELAY_MS`, `JITTER_MS`, and `SKIP_FIRST_DELAY` from [Runtime Defaults](../reference/05-runtime-defaults.md) and emit a single warn log (no crash).

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

## Acceptance

- [ ] The implementation satisfies the `02 — Per-Mode Settings` contract in this file and the folder-level acceptance target: default delay, settings, jitter, skip-first, and pause semantics use runtime defaults.
- [ ] Verification passes when `UT-delay-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind `DELAY_MS`, `JITTER_MS`, `SKIP_FIRST_DELAY` to `reference/05-runtime-defaults.md`; settings UI MUST clamp to declared min/max.
- **MUST** compute jitter as `DELAY_MS + randInt(-JITTER_MS, +JITTER_MS)` with `Math.random()` seeded by `crypto.getRandomValues` when available.
- **MUST** honour `SKIP_FIRST_DELAY=true` by emitting the first prompt with zero delay; subsequent prompts apply the full delay+jitter.
- **MUST** pause the delay timer when `pauseRequested=true` and resume from the remaining ms — never restart from zero.

## Pitfalls / Counter-examples

- ❌ `setTimeout(fn, DELAY_MS)` with no `clearTimeout` on cancel. ✅ Pair with teardown (see `mem://standards/timer-and-observer-teardown`).
- ❌ Jitter that can produce negative delays. ✅ `Math.max(0, DELAY_MS + jitter)`.
- ❌ Restarting the delay on pause/resume. ✅ Track `remainingMs` at pause; resume schedules `remainingMs`.
- ❌ Hardcoding 1500ms inline. ✅ Import the named constant.
- ❌ Adding exponential backoff on send failure. ✅ Fail fast; surface to user (no-retry policy).

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

