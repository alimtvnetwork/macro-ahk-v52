# Payment-banner Hider Multi-pattern Matcher

**Version landed:** v3.59.0
**Owner files:**
- `standalone-scripts/payment-banner-hider/src/types.ts` (`BANNER_PATTERNS`)
- `standalone-scripts/payment-banner-hider/src/banner-locator.ts`

**Related memory:** `mem://features/payment-banner-hider`

## Problem
The original hider matched a single XPath + single text (`"Payment issue
detected."`). Lovable shipped a new banner variant at a deeper XPath with
different copy (`"Update payment method"`, `"Final notice"`,
`"reverted to the Free plan"`), and the hider stopped working.

## Decision
Replace the single-string contract with a pattern array:

```ts
export interface BannerPattern {
  id: string;
  xpath: string;
  anyText: string[];   // OR-match — banner hides if ANY entry is in textContent
}
export const BANNER_PATTERNS: BannerPattern[] = [ /* ... */ ];
```

`BannerLocator` iterates `BANNER_PATTERNS` on every MutationObserver tick and
hides the first match. New variants are added by appending one entry — no
new classes, no new files.

## Acceptance
- `BANNER_PATTERNS` is the single source of truth — no inline xpath/text
  literals elsewhere in the project.
- Adding a new banner = one PR touching only `types.ts`.
- Logs include the matched `pattern.id` so we can tell variants apart.
