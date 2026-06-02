# Update / Installer

## Overview

Generic installer + auto-update behavior spec. Defines how the extension detects new versions, fetches assets, and applies updates without breaking the auth bridge or storage tiers. Aligns with `mem://workflow/versioning-policy` (unified version across manifest + constants + scripts) and `mem://cicd/release-watcher-self-heal-tag`.

## Files
- [`00-overview.md`](./00-overview.md)
- [`01-generic-installer-behavior.md`](./01-generic-installer-behavior.md)
- [`99-consistency-report.md`](./99-consistency-report.md)
