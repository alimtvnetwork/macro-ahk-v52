/**
 * MacroLoop Controller — Rename Template Engine
 *
 * Applies numbering variables ($$$, ###, ***) with zero-padding
 * across prefix, template, and suffix fields.
 *
 * @see .lovable/memory/features/macro-controller/rename-system.md
 */

interface VariableStartNumbers {
  dollar: number;
  hash: number;
  star: number;
}

/** Apply rename template with numbering variables to produce a final name. */
export function applyRenameTemplate(
  template: string,
  prefix: string,
  suffix: string,
  startNums: number | Record<string, number>,
  index: number,
  originalName: string,
): string {
  const starts = normalizeStartNumbers(startNums);

  const base = template ? applyVars(template, starts, index) : originalName;
  const resolvedPrefix = applyVars(prefix || '', starts, index);
  const resolvedSuffix = applyVars(suffix || '', starts, index);
  return resolvedPrefix + base + resolvedSuffix;
}

function normalizeStartNumbers(startNums: number | Record<string, number>): VariableStartNumbers {
  const isObjectInput = typeof startNums === 'object' && startNums !== null;

  if (isObjectInput) {
    const obj = startNums as Record<string, number>;
    return {
      dollar: obj.dollar || 1,
      hash: obj.hash || 1,
      star: obj.star || 1,
    };
  }

  const n = (startNums as number) || 1;
  return { dollar: n, hash: n, star: n };
}

function applyVars(text: string, starts: VariableStartNumbers, index: number): string {
  const isEmpty = !text;
  if (isEmpty) return text;

  text = text.replace(/(\$+)/, function (m: string) {
    return zeroPad((starts.dollar || 1) + index, m.length);
  });

  text = text.replace(/(#+)/, function (m: string) {
    return zeroPad((starts.hash || 1) + index, m.length);
  });

  text = text.replace(/(\*{2,})/, function (m: string) {
    return zeroPad((starts.star || 1) + index, m.length);
  });

  return text;
}

function zeroPad(n: number, minLength: number): string {
  let s = String(n);
  while (s.length < minLength) s = '0' + s;
  return s;
}
