import { loopCreditState, state } from '../shared-state';
import { getDisplayProjectName } from '../logging';

export interface TitleBarDisplayState {
  text: string;
  title: string;
  color: string;
  opacity: string;
  /** Font size in px — 16 for project, 14 for workspace, 10 for detecting state. */
  fontSize: string;
  /** Font weight — 600 for project, 500 for workspace/detecting. */
  fontWeight: string;
}

export function getCurrentWorkspaceDisplayName(): string {
  return state.workspaceName
    || (loopCreditState.currentWs ? (loopCreditState.currentWs.fullName || loopCreditState.currentWs.name) : '');
}

export function getTitleBarDisplayState(): TitleBarDisplayState {
  const projectName = getDisplayProjectName();
  const wsName = getCurrentWorkspaceDisplayName();

  if (projectName && projectName !== 'Unknown Project') {
    return {
      text: projectName,
      title: 'Project: ' + projectName + (wsName ? ' | Workspace: ' + wsName : ' (workspace not yet detected)') + ' — click to re-detect workspace',
      color: '#fbbf24',
      opacity: '1',
      fontSize: '16px',
      fontWeight: '600',
    };
  }

  if (wsName) {
    return {
      text: wsName,
      title: 'Workspace: ' + wsName + ' (project name not yet detected) — click to re-detect workspace',
      color: '#fbbf24',
      opacity: '0.85',
      fontSize: '14px',
      fontWeight: '500',
    };
  }

  return {
    text: '⟳ detecting…',
    title: 'Project name not detected — click to re-detect workspace',
    color: '#9ca3af',
    opacity: '1',
    fontSize: '10px',
    fontWeight: '500',
  };
}