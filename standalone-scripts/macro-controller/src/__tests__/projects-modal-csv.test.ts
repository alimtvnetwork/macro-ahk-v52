import { describe, expect, it } from 'vitest';

import {
  filterWorkspaceBlocksByVisibility,
  isWorkspaceFilterVisible,
  isWorkspaceWithinCreditsRange,
  isCsvProjectNameFallback,
  resolveCsvProjectName,
  type OpenTabIndex,
  type OpenTabRow,
  type ProjectEntry,
} from '../ui/projects-modal';

function project(partial: Partial<ProjectEntry>): ProjectEntry {
  return {
    id: 'project-1',
    name: 'List Name',
    githubRepo: '',
    githubBranch: '',
    lastMessageAt: '',
    ...partial,
  };
}

function workspaceBlock(id: string): { readonly ws: { readonly id: string }; readonly label: string } {
  return { ws: { id }, label: id };
}

function openTab(partial: Partial<OpenTabRow>): OpenTabRow {
  return {
    tabId: 1,
    title: 'Tab',
    url: 'https://lovable.dev/projects/project-1',
    active: true,
    projectId: 'project-1',
    projectName: 'Open Tab Name',
    detectedWorkspaceName: null,
    detectedWorkspaceId: null,
    ...partial,
  };
}

function tabIndex(row: OpenTabRow): OpenTabIndex {
  return {
    byProjectId: new Map([[row.projectId ?? '', row]]),
    byUrlProjectId: new Map([['project-1', row]]),
  };
}

describe('Projects modal CSV project-name fallback', () => {
  it('keeps the projects.list name when it is present', () => {
    const tab = openTab({ projectName: 'Open Tab Name' });
    const entry = project({ name: 'Projects List Name' });

    expect(resolveCsvProjectName(entry, tabIndex(tab))).toBe('Projects List Name');
    expect(isCsvProjectNameFallback(entry, tabIndex(tab))).toBe(false);
  });

  it('uses the open-tab project name when projects.list only has the id', () => {
    const tab = openTab({ projectName: 'Real Project Name' });
    const entry = project({ id: 'project-1', name: 'project-1' });

    expect(resolveCsvProjectName(entry, tabIndex(tab))).toBe('Real Project Name');
    expect(isCsvProjectNameFallback(entry, tabIndex(tab))).toBe(true);
  });

  it('falls back to the project id when no human-readable name exists', () => {
    const tab = openTab({ projectName: null });
    const entry = project({ id: 'project-1', name: '' });

    expect(resolveCsvProjectName(entry, tabIndex(tab))).toBe('project-1');
    expect(isCsvProjectNameFallback(entry, tabIndex(tab))).toBe(false);
  });
});

describe('Projects modal workspace filter', () => {
  it('keeps workspaces visible when they are not hidden', () => {
    expect(isWorkspaceFilterVisible('workspace-1', new Set(['workspace-2']))).toBe(true);
  });

  it('hides workspaces selected in the hidden workspace set', () => {
    const blocks = [workspaceBlock('workspace-1'), workspaceBlock('workspace-2')];

    expect(filterWorkspaceBlocksByVisibility(blocks, new Set(['workspace-2']))).toEqual([workspaceBlock('workspace-1')]);
  });
});
describe('Projects modal credits-used range filter (Task 12)', () => {
  it('keeps a workspace when used falls within [min, max]', () => {
    expect(isWorkspaceWithinCreditsRange(50, 0, 100)).toBe(true);
  });

  it('excludes a workspace when used is below min', () => {
    expect(isWorkspaceWithinCreditsRange(10, 50, null)).toBe(false);
  });

  it('excludes a workspace when used is above max', () => {
    expect(isWorkspaceWithinCreditsRange(200, null, 100)).toBe(false);
  });

  it('null/null bounds keep every workspace', () => {
    expect(isWorkspaceWithinCreditsRange(0, null, null)).toBe(true);
    expect(isWorkspaceWithinCreditsRange(9999, null, null)).toBe(true);
  });

  it('inclusive boundaries are honoured', () => {
    expect(isWorkspaceWithinCreditsRange(50, 50, 50)).toBe(true);
  });
});
