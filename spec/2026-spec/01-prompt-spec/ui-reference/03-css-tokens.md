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
