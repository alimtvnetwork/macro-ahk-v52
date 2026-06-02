/**
 * S94 — Namespace DB runtime validators.
 *
 * Enforces the two memory invariants:
 *   1. Max 25 user namespaces.
 *   2. `System.*` is reserved and cannot be created by user code.
 *
 * Importable by `createNamespaceDatabase()` once it lands; standalone module
 * so the validators have unit tests today.
 */

export const NAMESPACE_MAX = 25;
export const RESERVED_PREFIX = 'System.';

export class NamespaceValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'NamespaceValidationError';
  }
}

export function validateNamespaceName(name: string): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new NamespaceValidationError('EMPTY', 'namespace must be a non-empty string');
  }
  if (name.startsWith(RESERVED_PREFIX)) {
    throw new NamespaceValidationError(
      'RESERVED',
      `namespace "${name}" uses reserved prefix "${RESERVED_PREFIX}"`,
    );
  }
  if (!/^[A-Za-z][A-Za-z0-9_.]*$/.test(name)) {
    throw new NamespaceValidationError('FORMAT', `namespace "${name}" has invalid format`);
  }
}

export function assertCapacity(existingCount: number): void {
  if (existingCount >= NAMESPACE_MAX) {
    throw new NamespaceValidationError(
      'CAPACITY',
      `namespace cap reached (${NAMESPACE_MAX})`,
    );
  }
}
