/**
 * Payment Banner Hider — Project Instruction Manifest
 *
 * Auto-injected global script. Hides the Lovable "Payment issue detected"
 * sticky banner on lovable.dev/* pages with a smooth CSS3 fade.
 *
 * All keys PascalCase per `mem://standards/pascalcase-json-keys`.
 */

import type { ProjectInstruction } from "../../types/instruction/project-instruction";
import { InjectionWorld } from "../../types/instruction/enums/injection-world";
import { InjectionRunAt } from "../../types/instruction/enums/injection-run-at";
import { MatchType } from "../../types/instruction/enums/match-type";
import { AssetInjectTarget } from "../../types/instruction/enums/asset-inject-target";
import type { EmptySettings } from "../../types/instruction/seed/empty-settings";

const instruction: ProjectInstruction<EmptySettings> = {
    SchemaVersion: "1.0",
    Name: "payment-banner-hider",
    DisplayName: "Payment Banner Hider",
    Version: "3.63.0",
    Description: "Auto-hides the Lovable 'Payment issue detected.' sticky banner with a smooth CSS3 fade.",
    World: InjectionWorld.Main,
    IsGlobal: true,
    Dependencies: [],
    LoadOrder: 2,
    Seed: {
        Id: "default-payment-banner-hider",
        SeedOnInstall: true,
        IsRemovable: true,
        AutoInject: true,
        RunAt: InjectionRunAt.DocumentIdle,
        TargetUrls: [
            { Pattern: "https://lovable.dev/*", MatchType: MatchType.Glob },
        ],
        Cookies: [],
        Settings: {},
    },
    Assets: {
        Css: [
            { File: "payment-banner-hider.css", Inject: AssetInjectTarget.Head },
        ],
        Configs: [],
        Scripts: [
            { File: "payment-banner-hider.js", Order: 1, IsIife: true },
        ],
        Templates: [],
        Prompts: [],
    },
};

export default instruction;
