/**
 * XPath Utilities — Project Instruction Manifest
 *
 * Global utility library. No configs, no CSS, just the JS bundle.
 * Loaded before all dependent projects.
 *
 * All keys PascalCase per `mem://standards/pascalcase-json-keys`.
 */

import type { ProjectInstruction } from "../../types/instruction/project-instruction";
import { InjectionWorld } from "../../types/instruction/enums/injection-world";
import { InjectionRunAt } from "../../types/instruction/enums/injection-run-at";
import { MatchType } from "../../types/instruction/enums/match-type";
import type { EmptySettings } from "../../types/instruction/seed/empty-settings";

const instruction: ProjectInstruction<EmptySettings> = {
    SchemaVersion: "1.0",
    Name: "xpath",
    DisplayName: "XPath Utilities",
    Version: "3.63.2",
    Description: "Global XPath utility library (getByXPath, findElement, reactClick)",
    World: InjectionWorld.Main,
    IsGlobal: true,
    Dependencies: [],
    LoadOrder: 1,
    Seed: {
        Id: "default-xpath-utils",
        SeedOnInstall: true,
        IsRemovable: false,
        AutoInject: true,
        TargetUrls: [
            { Pattern: "https://lovable.dev/projects/*", MatchType: MatchType.Glob },
            { Pattern: "https://*.lovable.app/*", MatchType: MatchType.Glob },
            { Pattern: "https://*.lovableproject.com/*", MatchType: MatchType.Glob },
        ],
        Cookies: [],
        Settings: {},
    },
    Assets: {
        Css: [],
        Configs: [],
        Scripts: [
            { File: "xpath.js", Order: 1, IsIife: true },
        ],
        Templates: [],
        Prompts: [],
    },
};

export default instruction;
