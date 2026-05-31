/**
 * Prompt IO Dialog — UI Shell (Issue 131)
 *
 * Floating, draggable dialog for importing and exporting prompts.
 */

import {
  cPanelBg,
  cPrimary,
  cPrimaryLighter,
  cPrimaryBgA,
} from '../shared-state';
import { showToast } from '../toast';
import { log } from '../logging';
import {
  exportPromptsToJson,
  parsePromptsText,
  performPromptImport,
  performClearAllPrompts,
} from './prompt-io';

import { rerenderPromptsDropdown } from './prompt-loader';

export function renderPromptIODialog(): void {
  removePromptIODialog();

  const panel = document.createElement('div');
  panel.id = 'ahk-loop-prompt-io-dialog';
  panel.style.cssText = `
    position:fixed;top:100px;right:60px;z-index:100005;
    background:${cPanelBg};border:1px solid ${cPrimary};
    border-radius:8px;padding:0;min-width:380px;max-width:450px;
    box-shadow:0 8px 32px rgba(0,0,0,.6);font-family:monospace;
    overflow:hidden;
  `;

  // Title Bar
  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:8px 12px;background:${cPrimaryBgA};
    cursor:grab;user-select:none;border-bottom:1px solid rgba(124,58,237,0.3);
  `;

  const titleText = document.createElement('span');
  titleText.style.cssText = `font-size:11px;color:${cPrimaryLighter};font-weight:700;`;
  titleText.textContent = '📥 Prompts Import / Export';

  const closeBtn = document.createElement('span');
  closeBtn.style.cssText = 'cursor:pointer;color:#94a3b8;font-size:14px;padding:0 4px;';
  closeBtn.textContent = '✕';
  closeBtn.onclick = removePromptIODialog;

  titleBar.appendChild(titleText);
  titleBar.appendChild(closeBtn);
  panel.appendChild(titleBar);

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:14px;';

  // Options row
  const optionsRow = document.createElement('div');
  optionsRow.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:10px;color:#94a3b8;';
  
  const overwriteLabel = document.createElement('label');
  overwriteLabel.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';
  
  const overwriteCheck = document.createElement('input');
  overwriteCheck.type = 'checkbox';
  overwriteCheck.checked = true;
  overwriteCheck.style.cssText = 'margin:0;';
  
  overwriteLabel.appendChild(overwriteCheck);
  overwriteLabel.appendChild(document.createTextNode('Overwrite existing prompts (by slug/name)'));
  optionsRow.appendChild(overwriteLabel);
  body.appendChild(optionsRow);


  // Export
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '📤 Export to JSON';
  exportBtn.style.cssText = `
    padding:8px;background:${cPrimary};color:white;border:none;
    border-radius:4px;cursor:pointer;font-weight:bold;
  `;
  exportBtn.onclick = () => { void exportPromptsToJson(); };
  body.appendChild(exportBtn);

  // Hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.style.display = 'none';
  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (file) void _handleFile(file, overwriteCheck.checked);
    fileInput.value = '';

  };
  body.appendChild(fileInput);

  // Drop Zone (clickable)
  const dropZone = document.createElement('div');
  dropZone.id = 'prompt-io-drop-zone';
  const baseDropStyle = `
    border:2px dashed #475569;border-radius:6px;padding:24px;
    text-align:center;color:#94a3b8;background:rgba(0,0,0,0.2);
    transition:all 0.15s;cursor:pointer;
  `;
  dropZone.style.cssText = baseDropStyle;
  dropZone.innerHTML = `
    <div style="font-size:24px;margin-bottom:8px;">📄</div>
    <div style="font-size:12px;">Drop JSON file here</div>
    <div style="font-size:10px;margin-top:4px;color:#64748b;">or click to browse</div>
  `;
  dropZone.onclick = () => fileInput.click();

  function setActive(active: boolean): void {
    dropZone.style.cssText = baseDropStyle + (active
      ? `border-color:${cPrimaryLighter};background:rgba(124,58,237,0.15);color:${cPrimaryLighter};`
      : '');
  }
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    setActive(true);
  });
  dropZone.addEventListener('dragleave', () => setActive(false));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    setActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) void _handleFile(file, overwriteCheck.checked);

  });
  body.appendChild(dropZone);

  // Destructive Actions
  const footer = document.createElement('div');
  footer.style.cssText = 'margin-top:4px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:flex-end;';
  
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑 Clear All Prompts';
  clearBtn.style.cssText = 'background:transparent;border:none;color:#ef4444;font-size:10px;cursor:pointer;padding:4px 8px;border-radius:4px;opacity:0.7;';
  clearBtn.onmouseenter = () => { clearBtn.style.opacity = '1'; clearBtn.style.background = 'rgba(239,68,68,0.1)'; };
  clearBtn.onmouseleave = () => { clearBtn.style.opacity = '0.7'; clearBtn.style.background = 'transparent'; };
  clearBtn.onclick = async () => {
    if (confirm('DANGEROUS: This will delete ALL custom prompts from your local cache. Are you sure?')) {
      await performClearAllPrompts();
      showToast('All prompts cleared', 'success');
      rerenderPromptsDropdown();
    }
  };
  footer.appendChild(clearBtn);
  body.appendChild(footer);

  panel.appendChild(body);
  document.body.appendChild(panel);


  _makeDraggable(panel, titleBar);
}

async function _handleFile(file: File, overwrite: boolean): Promise<void> {
  try {
    const text = await file.text();
    const { valid, errors } = parsePromptsText(text);
    if (errors.length > 0) {
      log('[PromptIO] Import validation issues: ' + errors.join('; '), 'warn');
    }
    if (valid.length === 0) {
      showToast('No valid prompts in file', 'error');
      return;
    }
    const results = await performPromptImport(valid, { overwrite });
    showToast(`Imported ${results.total} prompts (${results.added} added, ${results.updated} updated)`, 'success');
    rerenderPromptsDropdown();

  } catch (err) {
    log('[PromptIO] Import failed: ' + String(err), 'error');
    showToast('Import failed: ' + (err instanceof Error ? err.message : String(err)), 'error');
  }
}

export function removePromptIODialog(): void {
  const existing = document.getElementById('ahk-loop-prompt-io-dialog');
  if (existing) existing.remove();
}

function _makeDraggable(panel: HTMLElement, handle: HTMLElement): void {
  let isDragging = false;
  let dragOffX = 0;
  let dragOffY = 0;

  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragOffX = e.clientX - panel.getBoundingClientRect().left;
    dragOffY = e.clientY - panel.getBoundingClientRect().top;
    handle.style.cursor = 'grabbing';
  });

  function onMove(e: MouseEvent): void {
    if (!isDragging) return;
    panel.style.left = (e.clientX - dragOffX) + 'px';
    panel.style.top = (e.clientY - dragOffY) + 'px';
    panel.style.right = 'auto';
  }
  function onUp(): void {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = 'grab';
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
