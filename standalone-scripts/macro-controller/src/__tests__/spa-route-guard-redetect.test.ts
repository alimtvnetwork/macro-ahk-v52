/**
 * SPA route guard — re-detect workspace on project switch.
 *
 * Regression guard for the user-reported bug: "after moving to a new
 * workspace ... when it loads, it sometimes does not have the workspace
 * name". Previously the SPA route guard only stopped the loop on a
 * project switch; the stale workspace name lingered until manual Check
 * or loop start. After the fix, switching projects MUST trigger a fresh
 * mark-viewed REST call via `autoDetectLoopCurrentWorkspace`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted spies — must be declared before vi.mock factories run.
const { autoDetectSpy, stopLoopSpy, resolveTokenSpy, showToastSpy, stateRef, loopCreditStateRef } = vi.hoisted(() => ({
  autoDetectSpy: vi.fn().mockResolvedValue(undefined),
  stopLoopSpy: vi.fn(),
  resolveTokenSpy: vi.fn().mockReturnValue('TEST_TOKEN'),
  showToastSpy: vi.fn(),
  stateRef: { running: false, workspaceName: 'OldWs', workspaceFromApi: true } as { running: boolean; workspaceName: string; workspaceFromApi: boolean },
  loopCreditStateRef: { currentWs: { id: 'old', name: 'OldWs' } } as { currentWs: { id: string; name: string } | null },
}));

vi.mock('../workspace-detection', () => ({
  extractProjectIdFromUrl: () => {
    const m = window.location.href.match(/\/projects\/([^/?#]+)/);
    return m ? m[1] : null;
  },
  invalidateProjectIdCache: vi.fn(),
  autoDetectLoopCurrentWorkspace: autoDetectSpy,
}));

vi.mock('../shared-state', () => ({
  state: stateRef,
  loopCreditState: loopCreditStateRef,
}));

vi.mock('../loop-engine', () => ({ stopLoop: stopLoopSpy }));
vi.mock('../toast', () => ({ showToast: showToastSpy }));
vi.mock('../auth', () => ({ resolveToken: resolveTokenSpy }));
vi.mock('../logging', () => ({ log: vi.fn(), logSub: vi.fn() }));
vi.mock('../error-utils', () => ({ logError: vi.fn() }));

describe('spa-route-guard — workspace re-detection on project switch', () => {
  let teardown: () => void;

  beforeEach(() => {
    autoDetectSpy.mockClear();
    stopLoopSpy.mockClear();
    resolveTokenSpy.mockClear();
    stateRef.running = false;
    stateRef.workspaceName = 'OldWs';
    stateRef.workspaceFromApi = true;
    loopCreditStateRef.currentWs = { id: 'old', name: 'OldWs' };
    // Reset the global install guard between tests.
    (window as unknown as { __marcoRouteGuardInstalled?: boolean }).__marcoRouteGuardInstalled = false;
    window.history.replaceState({}, '', '/projects/aaaa-1111');
  });

  afterEach(() => {
    if (teardown) teardown();
  });

  it('does NOT re-detect when same project URL changes (no project switch)', async () => {
    const mod = await import('../spa-route-guard');
    teardown = mod.installSpaRouteGuard();
    window.history.pushState({}, '', '/projects/aaaa-1111?x=1');
    expect(autoDetectSpy).not.toHaveBeenCalled();
  });

  it('re-runs autoDetectLoopCurrentWorkspace when switching to a new project', async () => {
    const mod = await import('../spa-route-guard');
    teardown = mod.installSpaRouteGuard();
    window.history.pushState({}, '', '/projects/bbbb-2222');
    expect(autoDetectSpy).toHaveBeenCalledTimes(1);
    expect(autoDetectSpy).toHaveBeenCalledWith('TEST_TOKEN', { skipDialog: true });
  });

  it('clears stale workspace state before re-detecting', async () => {
    const mod = await import('../spa-route-guard');
    teardown = mod.installSpaRouteGuard();
    window.history.pushState({}, '', '/projects/cccc-3333');
    expect(stateRef.workspaceName).toBe('');
    expect(stateRef.workspaceFromApi).toBe(false);
    expect(loopCreditStateRef.currentWs).toBeNull();
  });

  it('does NOT re-detect when leaving project entirely (no new projectId)', async () => {
    const mod = await import('../spa-route-guard');
    teardown = mod.installSpaRouteGuard();
    window.history.pushState({}, '', '/dashboard');
    // Loop still stops, but no point re-detecting without a projectId.
    expect(autoDetectSpy).not.toHaveBeenCalled();
  });

  it('still stops the loop when switching projects while running', async () => {
    stateRef.running = true;
    const mod = await import('../spa-route-guard');
    teardown = mod.installSpaRouteGuard();
    window.history.pushState({}, '', '/projects/dddd-4444');
    expect(stopLoopSpy).toHaveBeenCalledTimes(1);
    expect(autoDetectSpy).toHaveBeenCalledTimes(1);
  });

  it('survives missing token (passes empty string through to detector)', async () => {
    resolveTokenSpy.mockReturnValueOnce('');
    const mod = await import('../spa-route-guard');
    teardown = mod.installSpaRouteGuard();
    window.history.pushState({}, '', '/projects/eeee-5555');
    expect(autoDetectSpy).toHaveBeenCalledWith('', { skipDialog: true });
  });
});
