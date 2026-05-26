/**
 * Build the FixtureCoverage project + its library scripts/configs/prompts.
 * Pure synchronous builders — no I/O, no Chrome, no DOM.
 *
 * Spec: spec/30-import-export/03-test-plan.md §2.
 */

import type {
  StoredProject,
  StoredScript,
  StoredConfig,
} from "@/hooks/use-projects-scripts";
import type { PromptEntry } from "@/hooks/use-prompts";

const FIXTURE_NOW = "2026-05-16T00:00:00.000Z";

export function buildFixtureProject(): StoredProject {
  const variables = JSON.stringify({
    Foo: "bar",
    Nested: { A: 1, B: [true, false, null] },
  });
  return {
    id: "project-fixture-uid-0001",
    schemaVersion: 1,
    name: "FixtureCoverage",
    slug: "fixture-coverage",
    version: "1.0.0",
    description: "End-to-end fixture covering every artifact category.",
    targetUrls: [{ pattern: "https://example.com/*", matchType: "glob" }],
    scripts: [
      { path: "in-project-script-1", order: 0, runAt: "document_idle", code: "console.log('inline-1');" },
      { path: "in-project-script-2", order: 1, runAt: "document_start", code: "globalThis.x=1;" },
      { path: "ExternalLib1", order: 2 },
    ],
    configs: [{ path: "ExternalCfg1", description: "library config ref" }],
    cookies: [
      { cookieName: "session", url: "https://example.com", role: "session" },
    ],
    settings: { autoRun: true, theme: "dark", variables },
    dependencies: [{ projectId: "dep-a", version: "1.0.0" }],
    isGlobal: false,
    isRemovable: true,
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
  };
}

export function buildFixtureLibraryScripts(): StoredScript[] {
  return [
    {
      id: "lib-script-uid-ExternalLib1",
      name: "ExternalLib1",
      description: "Library script referenced by FixtureCoverage.",
      code: "/* lib */ globalThis.libLoaded = true;",
      order: 0,
      runAt: "document_idle",
      isIife: false,
      hasDomUsage: false,
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
  ];
}

export function buildFixtureLibraryConfigs(): StoredConfig[] {
  return [
    {
      id: "lib-config-uid-ExternalCfg1",
      name: "ExternalCfg1",
      description: "Library config referenced by FixtureCoverage.",
      json: JSON.stringify({ k: "v" }),
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
  ];
}

export function buildFixturePrompts(): PromptEntry[] {
  // 3 representative prompts. Real 14-prompt MD round-trip lives in
  // prompts-roundtrip.test.ts and reads from standalone-scripts/prompts/*.
  return [
    {
      id: "prompt-fixture-uid-0001",
      slug: "fixture-default",
      name: "Fixture Default",
      text: "## Default fixture prompt body.\n",
      order: 0,
      isDefault: true,
      isFavorite: false,
      category: "Default",
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
    {
      id: "prompt-fixture-uid-0002",
      slug: "fixture-favorite",
      name: "Fixture Favorite",
      text: "Favorite prompt body with **markdown**.\n",
      order: 1,
      isDefault: false,
      isFavorite: true,
      category: "Workflow",
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
    {
      id: "prompt-fixture-uid-0003",
      slug: "fixture-plain",
      name: "Fixture Plain",
      text: "Plain prompt — no flags.\n",
      order: 2,
      isDefault: false,
      isFavorite: false,
      category: "Workflow",
      createdAt: FIXTURE_NOW,
      updatedAt: FIXTURE_NOW,
    },
  ];
}

export interface FixtureBundle {
  projects: StoredProject[];
  scripts: StoredScript[];
  configs: StoredConfig[];
  prompts: PromptEntry[];
}

export function buildFullFixture(): FixtureBundle {
  return {
    projects: [buildFixtureProject()],
    scripts: buildFixtureLibraryScripts(),
    configs: buildFixtureLibraryConfigs(),
    prompts: buildFixturePrompts(),
  };
}
