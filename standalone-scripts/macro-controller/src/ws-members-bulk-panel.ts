/**
 * Bulk Members Panel — Issue 130
 *
 * Floating panel for managing members across multiple selected workspaces.
 * Shows common members with tri-state badges and supports bulk actions.
 */

import { cPanelBg, cPanelFg, cPanelBorder, cPrimary, lDropdownRadius, tFontTiny } from './shared-state';
import { fetchMembersForMany, type PerWsMembers } from './ws-members-fetch';
import { aggregateMembers, type AggregatedMember } from './ws-members-aggregate';
import { createChipInput } from './ws-members-chip-input';
// import { showToast } from './toast';
// import { logError } from './error-utils';
import { makeDraggable } from './ui/drag-window';
import { loopCreditState } from './shared-state';
import { inviteMemberMany, promoteMemberMany, demoteMemberMany, removeMemberMany } from './ws-members-mutations';


const PANEL_ID = 'marco-ws-bulk-members-panel';
const Z_INDEX = 100003;

interface BulkPanelState {
  wsIds: string[];
  perWs: PerWsMembers[];
  loading: boolean;
  error?: string;
}

let activeState: BulkPanelState | null = null;

export function showWsMembersBulkPanel(wsIds: string[], x: number, y: number): void {
  activeState = { wsIds, perWs: [], loading: true };
  renderShell(x, y);
  
  const workspaces = loopCreditState.perWorkspace || [];
  fetchMembersForMany(wsIds, workspaces)
    .then(results => {
      if (activeState) {
        activeState.perWs = results;
        activeState.loading = false;
        renderBody();
      }
    })
    .catch(err => {
      if (activeState) {
        activeState.loading = false;
        activeState.error = String(err);
        renderBody();
      }
    });
}

function renderShell(x: number, y: number): void {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    document.body.appendChild(panel);
  }

  panel.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    z-index: ${Z_INDEX};
    background: ${cPanelBg};
    color: ${cPanelFg};
    border: 1px solid ${cPrimary};
    border-radius: ${lDropdownRadius};
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    width: 380px;
    display: flex;
    flex-direction: column;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  panel.innerHTML = `
    <div data-marco-drag-handle="1" style="padding: 8px 12px; border-bottom: 1px solid ${cPanelBorder}; background: rgba(0,0,0,0.2); cursor: move; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 13px; font-weight: 700;">Bulk Members (${activeState?.wsIds.length} Workspaces)</div>
        <div style="font-size: 10px; color: #94a3b8;">Common members identified with badges</div>
      </div>
      <button id="bulk-members-close" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer;">×</button>
    </div>
    <div id="bulk-members-body" style="flex: 1; max-height: 400px; overflow-y: auto;">
      <div style="padding: 20px; text-align: center; color: #94a3b8;">⏳ Loading aggregated data...</div>
    </div>
    <div id="bulk-members-footer" style="padding: 10px; border-top: 1px solid ${cPanelBorder}; background: rgba(0,0,0,0.1);"></div>
  `;

  document.getElementById('bulk-members-close')!.onclick = () => panel!.remove();
  makeDraggable(panel, panel.querySelector('[data-marco-drag-handle]') as HTMLElement);
}

function renderBody(): void {
  const body = document.getElementById('bulk-members-body');
  if (!body || !activeState) return;

  if (activeState.loading) {
    body.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">⏳ Aggregating...</div>';
    return;
  }

  if (activeState.error) {
    body.innerHTML = `<div style="padding: 20px; color: #fca5a5; font-size: 12px;">❌ Error: ${activeState.error}</div>`;
    return;
  }

  const { union, totalWs } = aggregateMembers(activeState.perWs);
  
  if (union.length === 0) {
    body.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">No members found.</div>';
  } else {
    body.innerHTML = union.map(m => renderMemberRow(m, totalWs)).join('');
    attachRowListeners(body, union);
  }
  renderFooter();
}

function attachRowListeners(body: HTMLElement, union: AggregatedMember[]): void {
  body.querySelectorAll('.bulk-member-row').forEach(row => {
    const userId = row.getAttribute('data-user-id')!;
    const member = union.find(m => m.userId === userId);
    if (!member) return;

    row.addEventListener('contextmenu', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        e.preventDefault();
        showMemberRowContextMenu(member, mouseEvent.clientX, mouseEvent.clientY);
    });

    const moreBtn = row.querySelector('.bulk-member-more');
    if (moreBtn) {
        moreBtn.addEventListener('click', (e: Event) => {
            const mouseEvent = e as MouseEvent;
            e.stopPropagation();
            showMemberRowContextMenu(member, mouseEvent.clientX, mouseEvent.clientY);
        });
    }
  });
}

function showMemberRowContextMenu(member: AggregatedMember, x: number, y: number): void {
    const existing = document.getElementById('bulk-member-row-ctx');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'bulk-member-row-ctx';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        z-index: ${Z_INDEX + 10};
        background: ${cPanelBg};
        border: 1px solid ${cPrimary};
        border-radius: ${lDropdownRadius};
        padding: 4px 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        min-width: 160px;
    `;

    const buildItem = (label: string, onClick: () => void) => {
        const item = document.createElement('div');
        item.textContent = label;
        item.style.cssText = `padding: 6px 12px; font-size: ${tFontTiny}; color: ${cPanelFg}; cursor: pointer;`;
        item.onmouseover = () => item.style.background = 'rgba(139,92,246,0.3)';
        item.onmouseout = () => item.style.background = 'transparent';
        item.onclick = () => {
            menu.remove();
            onClick();
        };
        return item;
    };

    menu.appendChild(buildItem('👑 Promote to Owner', () => {
        if (activeState) {
            promoteMemberMany(activeState.wsIds, member.userId, loopCreditState.perWorkspace || []);
        }
    }));
    menu.appendChild(buildItem('👤 Demote to Member', () => {
        if (activeState) {
            demoteMemberMany(activeState.wsIds, member.userId, loopCreditState.perWorkspace || []);
        }
    }));
    menu.appendChild(buildItem('❌ Remove from All', () => {
        if (confirm(`Remove ${member.fullName} from ALL selected workspaces?`) && activeState) {
            removeMemberMany(activeState.wsIds, member.userId, loopCreditState.perWorkspace || []);
        }
    }));

    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
    }, 10);
}


function renderMemberRow(m: AggregatedMember, totalWs: number): string {
  const isAll = m.presenceCount === totalWs;
  const badgeColor = isAll ? '#10b981' : '#f59e0b';
  const badgeLabel = isAll ? 'ALL' : `SOME (${m.presenceCount}/${totalWs})`;

  return `
    <div class="bulk-member-row" data-user-id="${m.userId}" data-email="${m.email}" style="padding: 8px 12px; border-bottom: 1px solid rgba(148,163,184,0.1); display: flex; align-items: center; justify-content: space-between;">
      <div style="min-width: 0;">
        <div style="font-size: 12px; font-weight: 600; color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.fullName}</div>
        <div style="font-size: 10px; color: #94a3b8;">${m.email}</div>
      </div>
      <div style="flex-shrink: 0; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 9px; font-weight: 700; color: #fff; background: ${badgeColor}; padding: 1px 5px; border-radius: 3px;">${badgeLabel}</span>
        <button class="bulk-member-more" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;">⋯</button>
      </div>
    </div>
  `;
}


function renderFooter(): void {
  const footer = document.getElementById('bulk-members-footer');
  if (!footer) return;

  footer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="font-size: 11px; font-weight: 700; color: #bae6fd;">+ Bulk Add Members</div>
      <div id="bulk-chip-input-container"></div>
      <div style="display: flex; justify-content: flex-end; gap: 6px;">
        <select id="bulk-role-select" style="background: #1f2937; color: #f3f4f6; border: 1px solid #4b5563; border-radius: 4px; font-size: 11px; padding: 2px 4px;">
          <option value="member">Member</option>
          <option value="owner">Owner</option>
        </select>
        <button id="bulk-invite-btn" style="background: ${cPrimary}; color: #fff; border: none; border-radius: 4px; padding: 4px 12px; font-size: 11px; font-weight: 600; cursor: pointer;">Invite to All</button>
      </div>
    </div>
  `;

  let validEmails: string[] = [];
  const chipInput = createChipInput({
    placeholder: "Paste emails here...",
    onValidEmailsChange: (emails) => {
      validEmails = emails;
      const btn = document.getElementById('bulk-invite-btn') as HTMLButtonElement;
      if (btn) btn.disabled = emails.length === 0;
    }
  });
  
  document.getElementById('bulk-chip-input-container')!.appendChild(chipInput);

  const inviteBtn = document.getElementById('bulk-invite-btn') as HTMLButtonElement;
  inviteBtn.disabled = true;
  inviteBtn.onclick = () => {
    const role = (document.getElementById('bulk-role-select') as HTMLSelectElement).value as MemberRole;
    if (activeState) {
        inviteMemberMany(activeState.wsIds, validEmails, role, loopCreditState.perWorkspace || []);
    }
  };
}

