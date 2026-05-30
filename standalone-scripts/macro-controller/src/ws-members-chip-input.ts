/**
 * Multi-email chip input component.
 * Validates emails, supports paste-splitting, and keyboard removal.
 */
export function createChipInput(options: {
  placeholder?: string;
  onValidEmailsChange?: (emails: string[]) => void;
}): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ws-chip-input-container';
  container.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border: 1px solid #4b5563;
    border-radius: 4px;
    background: #1f2937;
    min-height: 32px;
    font-size: 12px;
    cursor: text;
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = options.placeholder || 'Enter emails...';
  input.style.cssText = `
    flex: 1;
    min-width: 120px;
    border: none;
    outline: none;
    background: transparent;
    color: #f3f4f6;
    padding: 2px 4px;
  `;

  const validEmails = new Set<string>();

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function addEmail(email: string): void {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || validEmails.has(trimmed)) return;

    const isValid = validateEmail(trimmed);
    if (isValid) {
      validEmails.add(trimmed);
      renderChips();
      options.onValidEmailsChange?.(Array.from(validEmails));
    }
    input.value = '';
  }

  function renderChips(): void {
    // Clear existing chips
    const chips = container.querySelectorAll('.ws-email-chip');
    chips.forEach(c => c.remove());

    Array.from(validEmails).forEach(email => {
      const chip = document.createElement('span');
      chip.className = 'ws-email-chip';
      chip.style.cssText = `
        display: inline-flex;
        align-items: center;
        background: #374151;
        color: #e5e7eb;
        padding: 1px 6px;
        border-radius: 9999px;
        font-size: 11px;
      `;
      chip.textContent = email;

      const removeBtn = document.createElement('span');
      removeBtn.textContent = '×';
      removeBtn.style.cssText = 'margin-left: 4px; cursor: pointer; font-weight: bold;';
      removeBtn.onclick = () => {
        validEmails.delete(email);
        renderChips();
        options.onValidEmailsChange?.(Array.from(validEmails));
      };

      chip.appendChild(removeBtn);
      container.insertBefore(chip, input);
    });
  }

  input.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(input.value);
    } else if (e.key === 'Backspace' && !input.value && validEmails.size > 0) {
      const last = Array.from(validEmails).pop();
      if (last) {
        validEmails.delete(last);
        renderChips();
        options.onValidEmailsChange?.(Array.from(validEmails));
      }
    }
  };

  input.onpaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') || '';
    const emails = text.split(/[\s,;]+/).filter(Boolean);
    emails.forEach(addEmail);
  };

  container.onclick = () => input.focus();
  container.appendChild(input);

  return container;
}
