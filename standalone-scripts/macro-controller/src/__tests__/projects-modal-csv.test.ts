import { describe, expect, it } from 'vitest';

import {
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