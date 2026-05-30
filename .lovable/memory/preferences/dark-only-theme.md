---
name: Dark-only theme enforcement
description: Extension always uses dark theme — no light mode, no toggle. bg-black overlay reduced to 40% opacity.
type: preference
---
The extension uses dark-only mode. Never add a light/dark toggle or theme switching.
- `class="dark"` is set in all HTML entry files (index.html, popup.html, options.html)
- ThemeProvider enforces dark class on mount, no toggle exposed
- ThemeToggle.tsx is a no-op stub
- Sonner toaster hardcoded to `theme="dark"`
- Modal overlays (dialog, sheet, drawer, alert-dialog) use `bg-black/40` instead of `bg-black/80` to avoid aggressive screen fading
