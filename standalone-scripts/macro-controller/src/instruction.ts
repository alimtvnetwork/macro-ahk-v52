/**
 * Macro Controller — Project Instruction Manifest
 *
 * Defines the load order and asset dependencies for this project.
 * Compiled at build time to dist/instruction.json.
 *
 * Load order: CSS (head) → JSON configs → JavaScript
 *
 * All keys PascalCase per `mem://standards/pascalcase-json-keys`.
 */

import type { ProjectInstruction } from "../../types/instruction/project-instruction";
import { InjectionWorld } from "../../types/instruction/enums/injection-world";
import { InjectionRunAt } from "../../types/instruction/enums/injection-run-at";
import { MatchType } from "../../types/instruction/enums/match-type";
import { AssetInjectTarget } from "../../types/instruction/enums/asset-inject-target";

type MacroControllerSettings = {
    IsolateScripts: boolean;
    LogLevel: "debug" | "info" | "warn" | "error";
    RetryOnNavigate: boolean;
};

const instruction: ProjectInstruction<MacroControllerSettings> = {
    SchemaVersion: "1.0",
    Name: "macro-controller",
    DisplayName: "Macro Controller",
    Version: "3.63.2",
    Description: "Macro Controller for workspace and credit management",
    World: InjectionWorld.Main,
    Dependencies: ["marco-sdk", "xpath"],
    LoadOrder: 2,
    Seed: {
        Id: "default-macro-looping",
        SeedOnInstall: true,
        IsRemovable: false,
        AutoInject: true,
        RunAt: InjectionRunAt.DocumentIdle,
        CookieBinding: "lovable-session-id.id",
        TargetUrls: [
            { Pattern: "https://lovable.dev/projects/*", MatchType: MatchType.Glob },
            { Pattern: "https://*.lovable.app/*", MatchType: MatchType.Glob },
            { Pattern: "https://*.lovableproject.com/*", MatchType: MatchType.Glob },
        ],
        Cookies: [
            { CookieName: "lovable-session-id.id", Url: "https://lovable.dev", Role: "session", Description: "Session ID — primary bearer token" },
            { CookieName: "lovable-session-id.refresh", Url: "https://lovable.dev", Role: "refresh", Description: "Refresh token" },
        ],
        Settings: {
            IsolateScripts: true,
            LogLevel: "info",
            RetryOnNavigate: true,
        },
        ConfigSeedIds: {
            config: "default-macro-looping-config",
            theme: "default-macro-theme",
        },
    },
    Assets: {
        Css: [
            { File: "macro-looping.css", Inject: AssetInjectTarget.Head },
        ],
        Configs: [
            { File: "macro-looping-config.json", Key: "config", InjectAs: "__MARCO_CONFIG__" },
            { File: "macro-theme.json", Key: "theme", InjectAs: "__MARCO_THEME__" },
        ],
        Scripts: [
            {
                File: "macro-looping.js",
                Order: 1,
                ConfigBinding: "config",
                ThemeBinding: "theme",
                IsIife: true,
            },
        ],
        Templates: [
            { File: "templates.json", InjectAs: "__MARCO_TEMPLATES__" },
        ],
        Prompts: [],
    },
};

export default instruction;
