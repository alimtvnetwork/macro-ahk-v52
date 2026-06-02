# 02 — Per-Mode Settings

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
| `next` | 7000 | matches default |
| `plan` | 12000 | plan responses tend to stream longer |
| `custom` | 7000 | host may override |

## Persistence

Stored in the host's settings store under a single key `prompts.delaySettings`. Schema-validated on load; invalid values fall back to `DELAY_DEFAULTS` and emit a single warn log (no crash).
