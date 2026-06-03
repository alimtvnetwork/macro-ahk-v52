/**
 * Typed DOM helper contract (Priority 0.15).
 *
 * Adds `RiseupAsiaMacroExt.Dom.queryHtmlElement(...)` / `queryAllHtmlElements(...)`
 * so consumers never need an `as HTMLElement` cast. Implementation lives in
 * the SDK boot bundle; this file is the type-system surface only.
 *
 * Returns `HTMLElement | undefined` (NOT `null`) per the project's defensive
 * property-access policy — callers use `?? fallback` instead of null checks.
 */

export {};

declare global {
    interface RiseupAsiaDom {
        /** querySelector restricted to HTMLElement; undefined when no match. */
        queryHtmlElement(selector: string, root?: ParentNode): HTMLElement | undefined;

        /** querySelectorAll mapped to HTMLElement[]; never null, may be empty. */
        queryAllHtmlElements(selector: string, root?: ParentNode): readonly HTMLElement[];

        /** XPath evaluator returning the first HTMLElement match, or undefined. */
        queryHtmlByXPath(expression: string, root?: Node): HTMLElement | undefined;
    }

    interface RiseupAsiaMacroExtNamespace {
        Dom?: RiseupAsiaDom;
    }
}
