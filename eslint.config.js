import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".cache",
      "chrome-extension",
      "coverage",
      "dist",
      "playwright-report",
      "skipped",
      "test-results",
      "v1.72.3-working-code",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      sonarjs,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "no-var": "error",
      "@typescript-eslint/no-restricted-types": "off",

      // ── Namespace Logger mandate (Batch C step 24 / audit S13) ──────
      // Ban bare `console.error(...)` in production source. Use the
      // appropriate Logger module instead (bg-logger, hook-logger,
      // popup-logger, etc.). Allowlist of legitimate consumers lives in
      // scripts/audit-logger-compliance.mjs and is overridden per-file
      // below. See mem://standards/error-logging-via-namespace-logger.md
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='error'][callee.object.name='console'], CallExpression[callee.property.name='error'][callee.object.property.name='console']",
          message: "Use Logger.error / logError / logBgError instead of console.error (see scripts/audit-logger-compliance.mjs allowlist).",
        },
      ],

      // --- SonarJS: Code smells & complexity ---
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 4 }],
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-collapsible-if": "warn",
      "sonarjs/no-redundant-boolean": "warn",
      "sonarjs/no-unused-collection": "off",
      "sonarjs/no-dead-store": "off",
      "sonarjs/no-unused-function-argument": "off",
      "sonarjs/no-unused-vars": "off",
      "sonarjs/prefer-immediate-return": "warn",
      "sonarjs/no-small-switch": "warn",
      "sonarjs/no-gratuitous-expressions": "warn",

      // ── Template-literal standardization ─────────────────────────────
      // `no-nested-template-literals` was previously "warn" and tripped
      // CI only because of `--max-warnings=0`. Promoting to "error" makes
      // the intent explicit in the config itself, so a future contributor
      // who relaxes `--max-warnings` (or runs ESLint locally without it)
      // still gets a hard failure on nested back-tick interpolations.
      // Companion guard `scripts/check-no-nested-template-literals.mjs`
      // hard-pins the same rule on `run-summary-types.ts` even if this
      // line is ever softened.
      "sonarjs/no-nested-template-literals": "error",
      // Forbid useless concatenation like `"foo" + "bar"` — pure-literal joins
      // that should just be one string. Hard error: zero violations today.
      "no-useless-concat": "error",

      // ── Identifier denylist ──────────────────────────────────────────
      // Ban placeholder / throw-away identifier names that signal an
      // unfinished refactor or hide intent. Keep this list conservative:
      // common "bar" (progress/toolbar) and "foo" stay legal because of
      // legitimate DOM usage; only true placeholders are forbidden.
      // Companion to the Constant Naming Convention memory.
      "id-denylist": [
        "error",
        "tmp",
        "temp",
        "baz",
        "qux",
        "foobar",
        "cfg",
        "arr",
        "str",
        "num",
        "val",
        "cb",
        "obj",
        "fn",
        "el",
        "msg",
        "ctx",
      ],

      // --- Function size (matches 25-line standard) ---
      "max-lines-per-function": ["warn", {
        max: 25,
        skipBlankLines: true,
        skipComments: true,
      }],
    },
  },
  // ── Staged id-denylist legacy quarantine: cb/obj/fn/el/msg/ctx ─────
  // `cb`, `obj`, `fn`, `el`, `msg`, and `ctx` are now banned globally for new/cleaned
  // authored files. The files below carry pre-existing debt and remain on
  // the staged 0.8 backlog; do not add newly-cleaned files here. Files
  // graduate off this list as their authored-source debt is cleaned.
  {
    files: [
      "src/background/recorder/__tests__/xpath-of-element.test.ts",
      "src/background/recorder/condition-evaluator.ts",
      "src/background/recorder/condition-step.ts",
      "src/background/recorder/data-source-parsers.ts",
      "src/background/recorder/drift-element-diff.ts",
      "src/background/recorder/failure-logger.ts",
      "src/background/recorder/field-reference-resolver.ts",
      "src/background/recorder/form-snapshot.ts",
      "src/background/recorder/hover-highlighter.ts",
      "src/background/recorder/js-step-diagnostics.ts",
      "src/background/recorder/js-step-sandbox.ts",
      "src/background/recorder/live-dom-replay.ts",
      "src/background/recorder/selector-comparison.ts",
      "src/background/recorder/selector-tester.ts",
      "src/background/recorder/step-library/**/*.ts",
      "src/background/recorder/url-tab-click.ts",
      "src/background/recorder/xpath-of-element.ts",
      "src/background/script-resolver.ts",
      "src/background/session-log-writer.ts",
      
      "src/components/options/ActivityLogTimeline.tsx",
      "src/components/options/LibraryView.tsx",
      "src/components/options/OpfsSessionBrowserPanel.tsx",
      "src/components/options/ProjectCreateForm.tsx",
      "src/components/options/ProjectGroupPanel.tsx",
      "src/components/options/ProjectUrlRulesEditor.tsx",
      "src/components/options/ProjectsList.tsx",
      "src/components/options/ProjectsListView.tsx",
      "src/components/options/ScriptBundleDetailView.tsx",
      "src/components/options/StepEditorDialog.tsx",
      "src/components/options/StepWaitDialog.tsx",
      "src/components/options/StorageBrowserView.tsx",
      "src/components/options/api-explorer/types.ts",
      "src/components/options/json-tree/**/*.ts",
      "src/components/options/json-tree/**/*.tsx",
      "src/components/options/project-database/useSchemaBuilder.ts",
      "src/components/options/recorder/RecorderVisualisationPanel.tsx",
      "src/components/options/recorder/recorder-self-test.ts",
      "src/components/popup/BootFailureBanner.tsx",
      "src/components/popup/InjectionCopyButton.tsx",
      "src/components/popup/InjectionErrorPanel.tsx",
      "src/components/popup/SessionCopyButton.tsx",
      "src/components/popup/__tests__/BootFailureBanner.report.test.tsx",
      "src/components/recorder/KeywordEventsPanel.tsx",
      "src/components/recorder/SelectorComparisonPanel.tsx",
      "src/components/recorder/SelectorTesterPanel.tsx",
      "src/components/recorder/__tests__/KeywordEventsPanel.selection.test.tsx",
      "src/components/recorder/__tests__/LiveRecordedActionsTree.scroll.test.tsx",
      "src/components/recorder/failure-report-validator.ts",
      "src/content-scripts/prompt-injector.ts",
      "src/content-scripts/xpath-recorder.ts",
      "src/hooks/__tests__/use-draggable.test.tsx",
      "src/hooks/use-draggable.ts",
      "src/hooks/use-popup-actions.ts",
      "src/lib/__tests__/sqlite-bundle-contract.test.ts",
      "src/lib/__tests__/sqlite-bundle-roundtrip.test.ts",
      "src/lib/developer-guide-bundle.ts",
      "src/lib/keyword-event-chain-shortcuts.ts",
      "src/lib/step-executors.ts",
      "src/options/sections/ProjectEditor.tsx",
      "src/options/sections/ProjectsSection.tsx",
      "src/pages/Options.tsx",
      
      "src/test/regression/injection-pipeline.test.ts",
      "src/test/regression/injection-result-builder.test.ts",
      "src/test/regression/recorder-xpath-batch.test.ts",
      "standalone-scripts/lovable-dashboard/src/focus-selected.ts",
      "standalone-scripts/lovable-dashboard/src/homepage-dashboard-variables.ts",
      "standalone-scripts/lovable-dashboard/src/index.ts",
      "standalone-scripts/lovable-dashboard/src/macro-sync.ts",
      "standalone-scripts/lovable-dashboard/src/nav-controls.ts",
      "standalone-scripts/lovable-dashboard/src/search-bar.ts",
      "standalone-scripts/lovable-dashboard/src/workspace-dictionary.ts",
      "standalone-scripts/lovable-owner-switch/src/flow/dom-xpath.ts",
      "standalone-scripts/lovable-owner-switch/src/flow/row-finalize.ts",
      "standalone-scripts/lovable-owner-switch/src/flow/run-owner-emails.ts",
      "standalone-scripts/lovable-owner-switch/src/flow/run-row.ts",
      "standalone-scripts/lovable-user-add/src/flow/row-finalize.ts",
      "standalone-scripts/lovable-user-add/src/flow/run-row.ts",
      "standalone-scripts/macro-controller/src/__tests__/credit-fetch-controller.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/credit-totals-csv.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/credit-totals-dnd.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/credit-totals-filter.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/dom-helpers.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/issue-121-sort-filter-immediate.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/log-csv-export.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/open-tabs-probe-responder.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/open-tabs-section.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/panel-minimize-expand-display.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/plan-task-ui.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/project-name-dropdown.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/selected-workspaces-store.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/settings-credit-fetch-delay.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/user-gesture-guard.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/ws-credit-sort-filter.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/ws-members-mutations-bulk.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/ws-members-mutations.test.ts",
      "standalone-scripts/macro-controller/src/__tests__/ws-members-panel.test.ts",
      "standalone-scripts/macro-controller/src/api-namespace.ts",
      "standalone-scripts/macro-controller/src/async-utils.ts",
      "standalone-scripts/macro-controller/src/auth-bridge.ts",
      "standalone-scripts/macro-controller/src/auth-recovery.ts",
      "standalone-scripts/macro-controller/src/auth-resolve.ts",
      "standalone-scripts/macro-controller/src/config-validator.ts",
      "standalone-scripts/macro-controller/src/core/MacroController.ts",
      "standalone-scripts/macro-controller/src/core/UIManager.ts",
      "standalone-scripts/macro-controller/src/credit-api.ts",
      "standalone-scripts/macro-controller/src/credit-poll-events.ts",
      "standalone-scripts/macro-controller/src/dom-cache.ts",
      "standalone-scripts/macro-controller/src/dom-helpers.ts",
      "standalone-scripts/macro-controller/src/error-utils.ts",
      "standalone-scripts/macro-controller/src/gitsync/progress-probe.ts",
      "standalone-scripts/macro-controller/src/globals.d.ts",
      "standalone-scripts/macro-controller/src/logging.ts",
      "standalone-scripts/macro-controller/src/macro-looping.ts",
      "standalone-scripts/macro-controller/src/project-name-dropdown.ts",
      "standalone-scripts/macro-controller/src/remix-bulk.ts",
      "standalone-scripts/macro-controller/src/remix-dropdown.ts",
      "standalone-scripts/macro-controller/src/remix-modal.ts",
      "standalone-scripts/macro-controller/src/remix/invalidate-sentinel.ts",
      "standalone-scripts/macro-controller/src/rename-api.ts",
      "standalone-scripts/macro-controller/src/rename-template.ts",
      "standalone-scripts/macro-controller/src/selected-workspaces-store.ts",
      "standalone-scripts/macro-controller/src/settings-modal.ts",
      "standalone-scripts/macro-controller/src/settings-store.ts",
      "standalone-scripts/macro-controller/src/startup-toast.ts",
      "standalone-scripts/macro-controller/src/startup-token-gate.ts",
      "standalone-scripts/macro-controller/src/task-manager.ts",
      "standalone-scripts/macro-controller/src/toast.ts",
      "standalone-scripts/macro-controller/src/ui/auto-attach.ts",
      "standalone-scripts/macro-controller/src/ui/bulk-rename.ts",
      "standalone-scripts/macro-controller/src/ui/check-button.ts",
      "standalone-scripts/macro-controller/src/ui/countdown.ts",
      "standalone-scripts/macro-controller/src/ui/credit-totals-modal.ts",
      "standalone-scripts/macro-controller/src/ui/database-json-migrate.ts",
      "standalone-scripts/macro-controller/src/ui/database-json-tab.ts",
      "standalone-scripts/macro-controller/src/ui/database-schema-editors.ts",
      "standalone-scripts/macro-controller/src/ui/database-schema-helpers.ts",
      "standalone-scripts/macro-controller/src/ui/database-schema-tab.ts",
      "standalone-scripts/macro-controller/src/ui/error-overlay.ts",
      "standalone-scripts/macro-controller/src/ui/hot-reload-section.ts",
      "standalone-scripts/macro-controller/src/ui/js-executor.ts",
      "standalone-scripts/macro-controller/src/ui/macro-ui.ts",
      "standalone-scripts/macro-controller/src/ui/menu-helpers.ts",
      "standalone-scripts/macro-controller/src/ui/panel-builder.ts",
      "standalone-scripts/macro-controller/src/ui/panel-controls.ts",
      "standalone-scripts/macro-controller/src/ui/panel-layout.ts",
      "standalone-scripts/macro-controller/src/ui/plan-task-ui.ts",
      "standalone-scripts/macro-controller/src/ui/projects-modal.ts",
      "standalone-scripts/macro-controller/src/ui/prompt-cache.ts",
      "standalone-scripts/macro-controller/src/ui/prompt-dropdown.ts",
      "standalone-scripts/macro-controller/src/ui/prompt-filter-menu.ts",
      "standalone-scripts/macro-controller/src/ui/prompt-loader.ts",
      "standalone-scripts/macro-controller/src/ui/prompt-utils.ts",
      "standalone-scripts/macro-controller/src/ui/redock-observer.ts",
      "standalone-scripts/macro-controller/src/ui/save-prompt.ts",
      "standalone-scripts/macro-controller/src/ui/section-auth-diag.ts",
      "standalone-scripts/macro-controller/src/ui/section-open-tabs.ts",
      "standalone-scripts/macro-controller/src/ui/settings-tab-panels.ts",
      "standalone-scripts/macro-controller/src/ui/settings-ui.ts",
      
      "standalone-scripts/macro-controller/src/ui/summary-bar/component.ts",
      "standalone-scripts/macro-controller/src/ui/task-next-ui.ts",
      "standalone-scripts/macro-controller/src/ui/ui-status-renderer.ts",
      "standalone-scripts/macro-controller/src/ui/ui-updaters.ts",
      "standalone-scripts/macro-controller/src/ui/ws-dropdown-builder.ts",
      "standalone-scripts/macro-controller/src/ui/ws-filter-menu.ts",
      "standalone-scripts/macro-controller/src/visible-workspaces-store.ts",
      "standalone-scripts/macro-controller/src/workspace-detection.ts",
      "standalone-scripts/macro-controller/src/workspace-observer.ts",
      "standalone-scripts/macro-controller/src/ws-checkbox-handler.ts",
      "standalone-scripts/macro-controller/src/ws-dialog-detection.ts",
      "standalone-scripts/macro-controller/src/ws-hover-card.ts",
      "standalone-scripts/macro-controller/src/ws-members-panel.ts",
      "standalone-scripts/macro-controller/src/ws-move.ts",
      "standalone-scripts/macro-controller/src/ws-name-matching.ts",
      "standalone-scripts/macro-controller/src/xpath-utils.ts",
      "standalone-scripts/macro-controller/tests/e2e/credit-totals/run-credit-totals-e2e.test.ts",
      
      "standalone-scripts/marco-sdk/src/logger.ts",
      "standalone-scripts/marco-sdk/src/notify.ts",
      "standalone-scripts/marco-sdk/src/prompts.ts",
      "standalone-scripts/marco-sdk/src/self-namespace.ts",
      "standalone-scripts/marco-sdk/src/self-test.ts",
      "standalone-scripts/marco-sdk/src/utils.ts",
      "standalone-scripts/payment-banner-hider/src/index.ts",
      "standalone-scripts/payment-banner-hider/src/smoke-test.ts",
      "standalone-scripts/types/project-namespace-shape.d.ts",
      "standalone-scripts/types/riseup-namespace.d.ts",
      "tests/e2e/cold-start.spec.ts",
      "tests/e2e/e2e-02-project-crud.spec.ts",
      "tests/e2e/e2e-21-xpath-capture.spec.ts",
      "tests/e2e/fixtures.ts",
      "tests/e2e/reporters/extension-artifacts-reporter.ts",
      "tests/e2e/script-injection.spec.ts",
      "vite.config.extension.ts",
    ],
    rules: {
      "id-denylist": ["error", "tmp", "temp", "baz", "qux", "foobar", "cfg", "arr", "str", "num", "val"],
    },
  },
  // --- Overrides: suppress known-safe patterns ---
  {
    files: ["standalone-scripts/**/*.{ts,tsx}"],
    rules: {
      // no-explicit-any enforced here too — no exceptions
    },
  },
  {
    files: ["tests/**/*.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}", "standalone-scripts/**/src/__tests__/**/*.{ts,tsx}", "standalone-scripts/**/tests/**/*.{ts,tsx}", "chrome-extension/tests/**/*.{ts,tsx}", "spec/**/*.ts", "src/test/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "max-lines-per-function": "off",
      "sonarjs/no-duplicate-string": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}", "src/components/theme/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // ── Logger allowlist (Batch C step 24) ──────────────────────────────
  // These files are legitimate `console.error` consumers (logger impls,
  // recursion guards, generated, tests, runtime-emitted stubs, Monaco
  // user-snippets, React error boundary, injection visibility renderer).
  // The matching audit allowlist lives in scripts/audit-logger-compliance.mjs.
  {
    files: [
      "src/background/bg-logger.ts",
      "src/lib/lib-logger.ts",
      "src/components/options/options-logger.ts",
      "src/components/recorder/recorder-logger.ts",
      "src/content-scripts/prompt-injector-logger.ts",
      "src/hooks/popup-logger.ts",
      "src/hooks/hook-logger.ts",
      "src/background/session-log-writer.ts",
      "src/background/db-manager.ts",
      "src/background/handlers/injection-namespace-bootstrap.ts",
      "src/components/ErrorBoundary.tsx",
      "src/lib/developer-guide-data.generated.ts",
      "src/background/builtin-script-guard.ts",
      "src/background/manifest-seeder.ts",
      "src/background/project-namespace-builder.ts",
      "src/background/handlers/injection-wrapper.ts",
      "src/components/options/monaco-js-intellisense.ts",
      "src/background/schema-migration.ts",
      "src/background/recorder/failure-logger.ts",
      "src/background/injection-diagnostics.ts",
      "src/background/context-menu-handler.ts",
      "standalone-scripts/lovable-common/src/logger.ts",
      "standalone-scripts/lovable-dashboard/src/logger.ts",
      "standalone-scripts/payment-banner-hider/src/logger.ts",
      "standalone-scripts/macro-controller/src/core/MacroController.ts",
      "standalone-scripts/macro-controller/src/credit-api.ts",
      "standalone-scripts/macro-controller/src/error-utils.ts",
      "standalone-scripts/macro-controller/src/logging.ts",
      "standalone-scripts/macro-controller/src/queue-control/auto-resume.ts",
      "standalone-scripts/macro-controller/src/user-gesture-guard.ts",
      "standalone-scripts/marco-sdk/src/logger.ts",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  // --- Build configs & generated files — disable function size ---
  {
    files: ["vite.config*.ts", "chrome-extension/vite.config.ts", "src/test/snapshots/**/*.{ts,tsx}"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
  // --- React components with JSX — raise to 50 ---
  {
    files: ["src/components/**/*.tsx", "src/pages/**/*.tsx", "src/options/**/*.tsx", "src/popup/**/*.tsx"],
    rules: {
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  // --- Background handlers & content scripts — raise to 40 ---
  {
    files: ["src/background/**/*.ts", "src/content-scripts/**/*.ts", "src/hooks/**/*.ts", "src/lib/**/*.ts", "src/platform/**/*.ts"],
    ignores: ["**/__tests__/**"],
    rules: {
      "max-lines-per-function": ["warn", { max: 40, skipBlankLines: true, skipComments: true }],
    },
  },
  // --- Standalone scripts (non-controller) — raise to 50 ---
  {
    files: ["standalone-scripts/**/src/**/*.ts"],
    ignores: [
      "standalone-scripts/**/__tests__/**",
      "standalone-scripts/macro-controller/**",
    ],
    rules: {
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  // --- Macro controller — raised to 60 (declared AFTER the generic
  //     standalone-scripts override so it wins in flat-config order) ---
  {
    files: ["standalone-scripts/macro-controller/src/**/*.ts"],
    ignores: ["standalone-scripts/macro-controller/**/__tests__/**"],
    rules: {
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
    },
  },
  // ── Instruction-type definitions — enforce `type` aliases ────────────
  // The entire instruction manifest type tree (and every project's
  // instruction.ts) is authored with `type X = { ... }` aliases. This
  // matches the dual-emit compile contract and keeps the schema flat
  // and serialisable. Pin the style so a future contributor cannot
  // silently introduce `interface` declarations here.
  {
    files: [
      "standalone-scripts/types/instruction/**/*.ts",
      "standalone-scripts/*/src/instruction.ts",
    ],
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
  {
    files: ["skipped/**/*.{js,ts}"],
    rules: {
      // Archived / inactive scripts — skip all linting
    },
  },
  // ── Legacy paths with pre-existing `no-nested-template-literals` debt ──
  //
  // Every file in this list contains at least one nested template literal
  // (`` `outer ${`inner ${x}`} ` ``) that predates the rule promotion to
  // "error". Demote to "warn" here so:
  //   - NEW code (any file outside this list) gets the hard gate the user
  //     asked for ("prevent nested template literals in new code").
  //   - These specific files still surface the warning in IDE + lint
  //     output and remain on the migration backlog (tracked in plan.md
  //     "Lint debt — nested template literals").
  //   - CI's `--max-warnings=0` still flags the warnings — but the
  //     `lint-standalone` job is scoped to `standalone-scripts/**`, and
  //     none of these legacy files live there, so the existing CI lint
  //     budget is unaffected.
  // The companion `scripts/check-no-nested-template-literals.mjs` keeps
  // its own pinned TARGETS[] list — adding a file here does NOT remove
  // it from the hard-pinned scanner.
  {
    files: [
      "src/background/recorder/failure-logger.ts",
      "src/background/recorder/field-reference-resolver.ts",
      "src/background/recorder/step-library/csv-parse.ts",
      "src/components/options/StepGroupLibraryPanel.tsx",
      "src/components/recorder/SelectorComparisonPanel.tsx",
      "src/components/recorder/SelectorTesterPanel.tsx",
      "src/components/recorder/failure-toast.ts",
      "src/components/recorder/selector-replay-trace.ts",
    ],
    rules: {
      "sonarjs/no-nested-template-literals": "warn",
    },
  },
);
