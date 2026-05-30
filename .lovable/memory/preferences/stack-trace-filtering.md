---
name: Skip chunk stack traces in reports
description: Stack traces from build chunks (chunk-*.js, assets/*.js) have no diagnostic value and must be filtered out of all reports and logs.
type: preference
---
When building diagnostic reports (copy injection logs, error exports, etc.):
- Filter out stack trace lines referencing minified chunk files (e.g., chunk-abc123.js:42:15, assets/index-xyz.mjs:100:3).
- Keep at least the first line of the original stack if all lines are chunk references.
- Pattern: /\b(chunk-[a-z0-9]+|assets\/[a-z0-9-]+)\.(js|mjs|cjs):\d+:\d+/i
- Prefer more logs over fewer — default limit should be 500, not 100.
