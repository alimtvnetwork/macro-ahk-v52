import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNamespaceName,
  assertCapacity,
  NAMESPACE_MAX,
} from '../../src/shared/namespace-db-validators.ts';

test('rejects System.* reserved prefix', () => {
  assert.throws(() => validateNamespaceName('System.Foo'), /RESERVED/);
});
test('rejects empty + bad format', () => {
  assert.throws(() => validateNamespaceName(''), /EMPTY/);
  assert.throws(() => validateNamespaceName('1bad'), /FORMAT/);
});
test('accepts dot-separated user namespace', () => {
  validateNamespaceName('Workspace.Macros');
});
test('caps at 25', () => {
  assertCapacity(0);
  assertCapacity(NAMESPACE_MAX - 1);
  assert.throws(() => assertCapacity(NAMESPACE_MAX), /CAPACITY/);
});
