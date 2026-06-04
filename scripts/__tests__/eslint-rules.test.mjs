#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

const eslint = new ESLint({ overrideConfigFile: 'eslint.config.js' });

const CONSOLE_ERROR_VIOLATING = `
export function broken() {
    try { /* noop */ } catch (err) {
        console.error("bad", err);
    }
}
`;

const CONSOLE_ERROR_COMPLIANT = `
import { logError } from "./hook-logger";
export function ok() {
    try { /* noop */ } catch (err) {
        logError("ok", "boom", err);
    }
}
`;

const DENYLIST_VIOLATING = `
export function readValue() {
    const val = "placeholder";
    return val;
}
`;

const DENYLIST_COMPLIANT = `
export function readValue() {
    const resolvedValue = "named";
    return resolvedValue;
}
`;

async function lintMessages(source, filePath, ruleId) {
    const results = await eslint.lintText(source, { filePath });
    return results[0].messages.filter((message) => message.ruleId === ruleId);
}

test('no-restricted-syntax reports console.error outside the logger allowlist', async () => {
    const messages = await lintMessages(
        CONSOLE_ERROR_VIOLATING,
        'src/hooks/__fixture-violating.ts',
        'no-restricted-syntax',
    );
    assert.ok(messages.length >= 1);
    assert.match(messages[0].message, /Logger\.error/);
});

test('no-restricted-syntax allows console.error in allowlisted logger files', async () => {
    const messages = await lintMessages(
        CONSOLE_ERROR_VIOLATING,
        'src/background/bg-logger.ts',
        'no-restricted-syntax',
    );
    assert.equal(messages.length, 0);
});

test('no-restricted-syntax allows Logger.error-style usage everywhere', async () => {
    const messages = await lintMessages(
        CONSOLE_ERROR_COMPLIANT,
        'src/hooks/__fixture-compliant.ts',
        'no-restricted-syntax',
    );
    assert.equal(messages.length, 0);
});

test('id-denylist reports the staged val placeholder identifier', async () => {
    const messages = await lintMessages(
        DENYLIST_VIOLATING,
        'src/hooks/__fixture-denylist.ts',
        'id-denylist',
    );
    assert.ok(messages.length >= 1);
    assert.match(messages[0].message, /val/);
});

test('id-denylist allows descriptive replacement names', async () => {
    const messages = await lintMessages(
        DENYLIST_COMPLIANT,
        'src/hooks/__fixture-denylist-ok.ts',
        'id-denylist',
    );
    assert.equal(messages.length, 0);
});
