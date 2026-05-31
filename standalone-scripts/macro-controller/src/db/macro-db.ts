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
export async function syncTaskQueueToDb(projectId: string, projectName: string, tasks: DbTask[]): Promise<void> {
  if (!projectId) return;

  // Clear existing queue for this project
  const deleteSql = `DELETE FROM TaskQueue WHERE ProjectId = '${projectId.replace(/'/g, "''")}'`;
  
  const insertValues = tasks.map(t => {
    return `('${t.id}', '${t.projectId.replace(/'/g, "''")}', '${t.projectName.replace(/'/g, "''")}', '${t.prompt.replace(/'/g, "''")}', '${t.status}', '${(t.error || '').replace(/'/g, "''")}', ${t.timestamp})`;
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
