---
name: Sourcemap strategy
description: Dev builds use inline source maps; production builds (including releases) have NO source maps — enforced at build and release workflow level
type: preference
---
All Vite configs use conditional source maps:
- `--mode development` → `sourcemap: 'inline'` (readable stack traces for injected code)
- `--mode production` (default) → `sourcemap: false` (smaller bundles, no IP exposure)

This applies to:
- Standalone scripts (macro-controller, marco-sdk, xpath)
- Chrome extension (vite.config.extension.ts)

The PowerShell `run.ps1 -d` (deploy) flag triggers development mode for standalone builds.
Without `-d`, builds default to production mode with no source maps.

The release workflow (.github/workflows/release.yml) has an explicit safety net:
- `find chrome-extension/dist -name '*.map' -delete` runs before zipping
- This ensures no .map files ever ship in release assets, even if config changes

CRITICAL: Source maps must NEVER appear in release assets or user-facing installs.
