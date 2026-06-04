# CI/CD Pipeline Workflows

## Overview

CI/CD specification covering the GitHub Actions pipeline (`.github/workflows/ci.yml`), release watcher (`release-watcher.yml`), installer tests, quality badges, and the repo-rename helper script (`01-repo-rename-script.md`). All workflows MUST honor the unfiltered-trigger contract: `ci.yml` uses bare `on: push:` with NO `branches`/`paths` filters (filters silently skip Lovable branch commits — regression has recurred 3×; see `mem://constraints/ci-push-trigger-unfiltered` and the canary `ping.yml` workflow). Notifications are forbidden (`mem://constraints/no-ci-notifications`).

## Files
- [`00-overview.md`](./00-overview.md)
- [`01-repo-rename-script.md`](./01-repo-rename-script.md)
- [`02-chrome-extension-ci-cd/`](./02-chrome-extension-ci-cd/) — generic Manifest V3 CI/CD and release-hardening spec
- [`99-consistency-report.md`](./99-consistency-report.md)
