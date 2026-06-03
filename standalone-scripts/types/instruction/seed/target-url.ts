import type { UrlPattern } from "../primitives/url-pattern";
import type { MatchType } from "../enums/match-type";

/**
 * One URL pattern used by the injection scheduler. `MatchType`
 * disambiguates how `Pattern` is evaluated.
 *
 * `MatchType` uses the shared enum at authoring time and compiles to the
 * runtime matcher's stable string vocabulary in JSON artifacts.
 */
export type TargetUrl = {
    readonly Pattern: UrlPattern;
    readonly MatchType: MatchType;
};
