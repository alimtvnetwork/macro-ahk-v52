/**
 * MacroLoop Controller — SQLite DB Management (prompts.macro)
 */

import { sendToExtension } from '../ui/prompt-loader';
import { log } from '../logging';
import { logError } from '../error-utils';

const DB_NAME = 'prompts.macro';

export interface DbTask {
  id: string;
  projectId: string;
  projectName: string;
  prompt: string;
  status: string;
  error?: string;
  timestamp: number;
}

/**
 * Initialize the macro database schema.
 */
export async function initMacroDb(): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS Projects (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      ProjectId TEXT UNIQUE,
      Name TEXT,
      Url TEXT,
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Communications (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      ProjectId TEXT,
      Prompt TEXT,
      Response TEXT,
      Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ProjectId) REFERENCES Projects(ProjectId)
    );
    CREATE TABLE IF NOT EXISTS TaskQueue (
      Id TEXT PRIMARY KEY,
      ProjectId TEXT,
      ProjectName TEXT,
      Prompt TEXT,
      Status TEXT,
      Error TEXT,
      Timestamp INTEGER,
      FOREIGN KEY(ProjectId) REFERENCES Projects(ProjectId)
    );
    DROP VIEW IF EXISTS v_prompt_history;
    CREATE VIEW v_prompt_history AS
    SELECT c.Id, c.ProjectId, c.Prompt, c.Response, c.Timestamp, p.Name as ProjectName, p.Url as ProjectUrl
    FROM Communications c
    LEFT JOIN Projects p ON c.ProjectId = p.ProjectId;
  `;
  
  try {
    const resp = await sendToExtension('PROJECT_API', {
      project: DB_NAME,
      method: 'SCHEMA',
      endpoint: 'rawSql',
      params: { sql: schema }
    });
    if (resp && resp.isOk) {
      log('Macro DB initialized: ' + DB_NAME, 'success');
    } else {
      logError('MacroDb', 'Schema init failed: ' + (resp?.errorMessage || 'unknown error'));
    }
  } catch (err) {
    logError('MacroDb', 'Failed to send schema init', err);
  }
}

/**
 * Save project metadata.
 */
export async function saveProjectMetadata(projectId: string, name: string, url: string): Promise<void> {
  if (!projectId) return;
  
  const sql = `INSERT OR REPLACE INTO Projects (ProjectId, Name, Url, UpdatedAt) 
               VALUES ('${projectId.replace(/'/g, "''")}', '${name.replace(/'/g, "''")}', '${url.replace(/'/g, "''")}', CURRENT_TIMESTAMP)`;
  
  try {
    await sendToExtension('PROJECT_API', {
      project: DB_NAME,
      method: 'SCHEMA',
      endpoint: 'rawSql',
      params: { sql }
    });
  } catch (err) {
    logError('MacroDb', 'saveProjectMetadata failed', err);
  }
}

/**
 * Save a communication (prompt/response).
 */
export async function saveCommunication(projectId: string, prompt: string, response: string = ''): Promise<void> {
  if (!projectId || !prompt) return;
  
  // Also update Project metadata if we have it in state
  const { state } = await import('../shared-state');
  const projectName = state.projectNameFromApi || state.projectNameFromDom || 'Unknown Project';
  await saveProjectMetadata(projectId, projectName, window.location.href);

  const sql = `INSERT INTO Communications (ProjectId, Prompt, Response) 
               VALUES ('${projectId.replace(/'/g, "''")}', '${prompt.replace(/'/g, "''")}', '${response.replace(/'/g, "''")}')`;
  
  try {
    await sendToExtension('PROJECT_API', {
      project: DB_NAME,
      method: 'SCHEMA',
      endpoint: 'rawSql',
      params: { sql }
    });
    log('Communication saved to Macro DB', 'info');
  } catch (err) {
    logError('MacroDb', 'saveCommunication failed', err);
  }
}

/**
 * Sync the entire task queue for a project to SQLite.
 */
export async function syncTaskQueueToDb(projectId: string, tasks: DbTask[]): Promise<void> {
  if (!projectId) return;

  // Clear existing queue for this project
  const deleteSql = `DELETE FROM TaskQueue WHERE ProjectId = '${projectId.replace(/'/g, "''")}'`;
  
  const insertValues = tasks.map(t => {
    return `('${t.id}', '${t.projectId.replace(/'/g, "''")}', '${(t as { projectName?: string }).projectName ? (t as { projectName: string }).projectName.replace(/'/g, "''") : "Unknown"}', '${t.prompt.replace(/'/g, "''")}', '${t.status}', '${(t.error || '').replace(/'/g, "''")}', ${t.timestamp})`;
  }).join(',');

  const sql = insertValues.length > 0 
    ? `${deleteSql}; INSERT INTO TaskQueue (Id, ProjectId, ProjectName, Prompt, Status, Error, Timestamp) VALUES ${insertValues}`
    : deleteSql;

  try {
    await sendToExtension('PROJECT_API', {
      project: DB_NAME,
      method: 'SCHEMA',
      endpoint: 'rawSql',
      params: { sql }
    });
  } catch (err) {
    logError('MacroDb', 'syncTaskQueueToDb failed', err);
  }
}

/**
 * Manual trigger to sync current IndexedDB queue state to SQLite.
 */
export async function forceSyncQueueToDb(): Promise<void> {
  const { visualSyncConfirm } = await import('../ui/prompt-utils');
  const { loadTaskQueue } = await import('../task-queue');
  const { extractProjectIdFromUrl } = await import('../workspace-detection');
  
  const projectId = extractProjectIdFromUrl();
  if (!projectId) return;

  const queueState = await loadTaskQueue();
  // const projectName = state.projectNameFromApi || state.projectNameFromDom || 'Unknown Project';
  
  log('[MacroDb] Force-syncing task queue to SQLite...', 'check');
  await syncTaskQueueToDb(projectId, queueState.tasks);
  visualSyncConfirm();
  log('[MacroDb] Queue synced to SQLite', 'success');
}

/**
 * Purge communication history older than N days.
 */
export async function purgeOldCommunications(days: number = 30): Promise<void> {
  const sql = `DELETE FROM Communications WHERE Timestamp < datetime('now', '-${days} days')`;
  try {
    await sendToExtension('PROJECT_API', {
      project: DB_NAME,
      method: 'SCHEMA',
      endpoint: 'rawSql',
      params: { sql }
    });
    log(`[MacroDb] Purged communications older than ${days} days`, 'info');
  } catch (err) {
    logError('MacroDb', 'purgeOldCommunications failed', err);
  }
}

/**
 * Get communication history for the current project.
 */
export async function getCommunicationHistory(projectId: string, limit: number = 50): Promise<any[]> {
  const sql = `SELECT * FROM v_prompt_history WHERE ProjectId = '${projectId.replace(/'/g, "''")}' ORDER BY Timestamp DESC LIMIT ${limit}`;
  try {
    const resp = await sendToExtension('PROJECT_API', {
      project: DB_NAME,
      method: 'QUERY',
      endpoint: 'rawSql',
      params: { sql }
    });
    return resp?.isOk ? (Array.isArray(resp.rows) ? resp.rows : []) : [];
  } catch (err) {
    logError('MacroDb', 'getCommunicationHistory failed', err);
    return [];
  }
}

/**
 * Export the entire prompts.macro database as a SQL dump.
 */
export async function exportDatabaseDump(): Promise<void> {
  try {
    const resp = await sendToExtension('PROJECT_API', {
      project: DB_NAME,
      method: 'EXPORT',
      endpoint: 'dump'
    });
    
    if (resp && resp.isOk && resp.dump) {
      const blob = new Blob([resp.dump as string], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `prompts-macro-dump-${stamp}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      log('Database dump exported successfully', 'success');
    } else {
      logError('MacroDb', 'Export failed: ' + (resp?.errorMessage || 'no dump data'));
    }
  } catch (err) {
    logError('MacroDb', 'Failed to export database', err);
  }
}

