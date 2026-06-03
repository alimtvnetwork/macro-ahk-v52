import type { Identifier } from "./primitives/identifier";
import type { VersionString } from "./primitives/version-string";
import type { AssetBundle } from "./assets/asset-bundle";
import type { SeedBlock } from "./seed/seed-block";
import type { XPathRegistry } from "./xpath/xpath-registry";
import type { InjectionWorld } from "./enums/injection-world";

/**
 * Top-level instruction manifest for one standalone script.
 *
 * Replaces every per-project `ProjectInstruction` interface (which
 * historically duplicated this shape and drifted across scripts).
 * `TSettings` flows through to `SeedBlock<TSettings>` so each script
 * can pin its own settings shape without losing structural reuse.
 *
 * Field-name policy: ALL keys are `PascalCase` per
 * `mem://standards/pascalcase-json-keys`. Closed string sets must use
 * their global enum types at authoring time while compiling to the same
 * JSON string values.
 *
 * `Dependencies` is a plain `Identifier[]` (project-id list) to match
 * the shape every existing instruction uses today.
 *
 * Reviewer note: `XPaths` is optional in this draft — scripts that
 * touch the DOM with selectors should set it; scripts that only
 * inject CSS may omit it. Q2 in `00-readme.md` tracks the decision.
 */
export type ProjectInstruction<TSettings extends object> = {
    readonly SchemaVersion: VersionString;
    readonly Name: Identifier;
    readonly DisplayName: string;
    readonly Version: VersionString;
    readonly Description: string;
    readonly World: InjectionWorld;
    readonly IsGlobal?: boolean;
    readonly Dependencies: ReadonlyArray<Identifier>;
    readonly LoadOrder: number;
    readonly Seed: SeedBlock<TSettings>;
    readonly Assets: AssetBundle;
    readonly XPaths?: XPathRegistry;
};
