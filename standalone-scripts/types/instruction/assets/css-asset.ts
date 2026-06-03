import type { AssetInjectTarget } from "../enums/asset-inject-target";

/**
 * A CSS file shipped with a standalone script and injected into the
 * target page at the enum location given by `Inject`.
 *
 * All keys PascalCase per `mem://standards/pascalcase-json-keys`.
 */
export type CssAsset = {
    readonly File: string;
    readonly Inject: AssetInjectTarget;
};
