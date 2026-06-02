# CSS Tokens (Semantic)

All values HSL. Dark-only theme per project core rule.

```css
:root {
  /* Surfaces */
  --background:        220 26% 8%;
  --foreground:        210 20% 96%;
  --surface-1:         220 24% 11%;
  --surface-2:         220 22% 14%;
  --surface-3:         220 20% 17%;
  --overlay:           220 30% 5% / 0.4;

  /* Primary / accent */
  --primary:           212 92% 56%;
  --primary-foreground:0 0% 100%;
  --accent:            172 80% 48%;

  /* Status */
  --status-running:    212 92% 56%;
  --status-paused:     45  92% 55%;
  --status-completed:  142 72% 45%;
  --status-aborted:    0   72% 55%;

  /* Severity (audit) */
  --sev-critical:      0   72% 55%;
  --sev-high:          22  92% 56%;
  --sev-medium:        45  92% 55%;
  --sev-low:           142 50% 50%;

  /* Borders / focus */
  --border:            220 18% 22%;
  --ring:              212 92% 56%;

  /* Type */
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-body:    "Inter", system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;
}
```

## Usage

- Never write `text-white`, `bg-black`, hex colors, or raw `rgb()` in components.
- Tailwind classes resolve via `tailwind.config.ts` token bindings.
- Animations use `--ease-out: cubic-bezier(0.16,1,0.3,1)` and `--dur-fast: 150ms`, `--dur-base: 250ms`.
