---
name: CSS injection sentinel validation
description: Runtime CSS load validation via #marco-css-sentinel element — if CSS fails to load, emergency dark styles are applied inline and a toast warns the user.
type: feature
---
## How it works
1. `index.css` defines `#marco-css-sentinel { display: none !important; }` as a sentinel rule
2. `ThemeProvider` injects a `<div id="marco-css-sentinel">` into the DOM on mount
3. After one animation frame, it checks `getComputedStyle(sentinel).display`
4. If the sentinel is NOT `display: none`, CSS failed to load:
   - Console error with diagnostic details
   - Emergency inline dark styles applied (background, foreground, card, primary, border, muted, secondary)
   - Sonner toast warning shown for 15 seconds
5. If sentinel IS `none`, CSS loaded correctly — no action taken
