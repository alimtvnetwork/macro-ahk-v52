import type { Identifier } from "../primitives/identifier";
import type { CookieBinding } from "./cookie-binding";
import type { CookieSpec } from "./cookie-spec";
import type { TargetUrl } from "./target-url";
import type { InjectionRunAt } from "../enums/injection-run-at";

/**
 * Declarative seed metadata that controls how the runtime registers,
 * persists, and re-injects a standalone script.
 *
 * `TSettings` carries the project-specific settings shape; default to
 * `EmptySettings` when there are none. Settings live in their own
 * project type file — never inlined here.
 *
 * All keys are PascalCase per `mem://standards/pascalcase-json-keys`.
 * `RunAt` uses the shared enum at authoring time and compiles to Chrome's
 * stable `chrome.scripting` string vocabulary in JSON artifacts.
 */
export type SeedBlock<TSettings extends object> = {
    readonly Id: Identifier;
    readonly SeedOnInstall: boolean;
    readonly IsRemovable: boolean;
    readonly AutoInject: boolean;
    readonly RunAt?: InjectionRunAt;
    readonly CookieBinding?: CookieBinding;
    readonly TargetUrls: ReadonlyArray<TargetUrl>;
    readonly Cookies: ReadonlyArray<CookieSpec>;
    readonly Settings: TSettings;
    readonly ConfigSeedIds?: Readonly<Record<string, string>>;
};
