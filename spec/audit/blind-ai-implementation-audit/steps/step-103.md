# Step 103 — Verify S77 (framer-motion ban)

**Timestamp:** 2026-06-02

## Verified
`grep framer-motion package.json` → **no matches**. Same for `gsap`.

## Status
✅ **Currently clean** — but **no preventive block**. Risk is future-tense: first time a blind LLM follows Lovable's default design prompt, it will run `bun add framer-motion` and pass.

## Recommendation (unchanged)
Add to `package.json`:
```json
"scripts": { "preinstall": "node scripts/check-banned-deps.mjs" }
```
with `scripts/check-banned-deps.mjs` rejecting `framer-motion`, `gsap`, `motion`, `@motionone/*`.
