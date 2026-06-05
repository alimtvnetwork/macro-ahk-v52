const FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]*`/g;
const ACCEPTANCE_HEADING_RE = /^##\s+Acceptance\b/m;
const ACCEPTANCE_SECTION_RE = /^##\s+Acceptance\b[\s\S]*?(?=^##\s+|\s*$)/m;
const CHECKBOX_BULLET_RE = /^\s*- \[[ x]\]\s+\S/m;

export const ACCEPTANCE_EXEMPT_RE = /(^|\/)(README|00-overview|00-method|GLOSSARY|ACCEPTANCE-MATRIX|IMPLEMENTATION-CHECKLIST|BLIND-AI-SMOKE-TEST)\.md$/i;

export function getAcceptanceFailure(fileText) {
  const text = stripMarkdownCode(fileText);
  const section = getAcceptanceSection(text);
  const hasHeading = ACCEPTANCE_HEADING_RE.test(text);

  if (!hasHeading) {
    return '## Acceptance heading';
  }

  if (!CHECKBOX_BULLET_RE.test(section)) {
    return 'machine-checkable bullet (- [ ])';
  }

  return '';
}

function stripMarkdownCode(text) {
  return text.replace(FENCE_RE, '').replace(INLINE_CODE_RE, '');
}

function getAcceptanceSection(text) {
  return text.match(ACCEPTANCE_SECTION_RE)?.[0] ?? '';
}