/**
 * Lovable Owner Switch — Project Instruction Manifest
 *
 * Phase P4 scaffold: declares dependency on `lovable-common` (XPaths +
 * LovableApiClient) and registers the empty `LovableOwnerSwitch` entry
 * class. Migrations (P5), CSV (P6), UI (P7) and flow (P8–P10) plug in
 * via subsequent phases without changing this manifest's shape.
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
    Name: "lovable-owner-switch",
    DisplayName: "Lovable Owner Switch",
    Version: "3.66.0",
    Description: "Bulk-switch Lovable workspace ownership from a CSV of LoginEmail → OwnerEmail rows.",
    World: InjectionWorld.Main,
    IsGlobal: false,
    Dependencies: ["lovable-common"],
    LoadOrder: 60,
    Seed: {
        Id: "default-lovable-owner-switch",
        SeedOnInstall: true,
        IsRemovable: false,
        AutoInject: true,
        RunAt: InjectionRunAt.DocumentIdle,
        TargetUrls: [{ Pattern: "https://lovable.dev/*", MatchType: MatchType.Glob }],
        Cookies: [],
        Settings: {},
    },
    Assets: {
        Css: [],
        Configs: [],
        Scripts: [
            { File: "lovable-owner-switch.js", Order: 1, IsIife: true },
        ],
        Templates: [],
        Prompts: [],
    },
};

export default instruction;
