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
