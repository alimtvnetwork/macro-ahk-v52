# Issue 126 — Ctrl+Shift+Down Script Attach Shortcut Regression

**Version target:** include in the final queued version bump after implementation.  
**Owner modules:** Chrome command handler, active-project script attachment/injection path, auto-attach diagnostics.

---

## 1. Problem

`Ctrl+Shift+Down` is expected to attach/inject the active project's scripts into the current Lovable tab. The shortcut has regressed again: pressing it does not attach the script even though this bug has been discussed and fixed before.

This must be treated as a regression of the existing shortcut contract, not as a new optional feature.

## 2. Required behaviour

1. Pressing `Ctrl+Shift+Down` must trigger the `run-scripts` command and attach/inject the active project scripts into the active Lovable tab.
2. The shortcut path must match the popup/manual Run behavior, including deliberate re-run semantics (`forceReload: true`).
3. If the active project has no attached scripts, the path must attempt the same auto-attach/healing flow used by project save or emit a CODE RED diagnostic that includes:
   - exact active project id/name,
   - active tab URL,
   - missing script binding or empty script list reason,
   - whether auto-attach evaluated and why it skipped.
4. No silent failure: all early exits must use the namespace/background logger with a reason code and reason detail.
5. Add a regression test proving `Ctrl+Shift+Down` cannot return success/no-op when an attachable script exists.

## 3. Files likely touched

```txt
src/background/shortcut-command-handler.ts
src/background/auto-attach-runner.ts
src/background/handlers/project-handler.ts
src/background/__tests__/shortcut-command-handler.test.ts
src/background/__tests__/auto-attach-runner.test.ts
manifest.json
```

## 4. Acceptance

- [ ] `Ctrl+Shift+Down` attaches/injects the active project's scripts on first press.
- [ ] Shortcut and popup/manual Run share the same force-run behavior.
- [ ] Empty/missing script bindings produce explicit diagnostics, not a silent abort.
- [ ] Unit/regression test covers the failing shortcut attach path.
- [ ] Final version bump and changelog happen after this and the other queued tasks are complete.