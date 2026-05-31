/**
 * MacroLoop Controller — SQLite DB Management (prompts.macro)
 */

import { sendToExtension } from '../ui/prompt-loader';
import { log } from '../logging';
import { logError } from '../error-utils';

const DB_NAME = 'prompts.macro';

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
