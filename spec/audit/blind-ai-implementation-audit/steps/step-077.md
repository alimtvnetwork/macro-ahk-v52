# Step 77 — Animation strategy (Tailwind + standard CSS only)

**Timestamp:** 2026-06-02
**Memory:** `mem://style/animation-strategy` (zero external libraries)

## Reasoning
Adding `framer-motion`/`gsap` would bloat the extension bundle.

## Findings
- ✅ Memory rejects external animation libs.
- 🟡 **Med**: no `package.json` allowlist or pre-install hook blocking framer-motion.
- 🟢 **Low**: Lovable's default design prompt **recommends** framer-motion — direct conflict with this project's memory. A blind LLM following Lovable defaults will violate.

## Recommendation
Add to `package.json` `pnpm.neverBuiltDependencies` or a `preinstall` script rejecting `framer-motion`, `gsap`, `motion`.
