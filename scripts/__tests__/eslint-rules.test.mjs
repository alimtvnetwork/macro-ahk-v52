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

const GLOBAL_CONSOLE_ERROR_VIOLATING = `
export function broken() {
    try { /* noop */ } catch (err) {
        globalThis.console.error("bad", err);
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
    const cb = () => val;
    const obj = { value: cb() };
    const fn = () => obj.value;
    const el = document.body;
    const msg = "message";
    const ctx = { message: msg };
    return fn() + ctx.message + (el ? "" : "");
}
`;

const DENYLIST_QUARANTINED = `
export function legacyValue() {
    const cb = () => "legacy";
    const obj = { value: cb() };
    const fn = () => obj.value;
    const el = document.body;
    const msg = "message";
    const ctx = { message: msg };
    return fn() + ctx.message + (el ? "" : "");
}
`;

const DENYLIST_STILL_VIOLATING_IN_QUARANTINE = `
export function legacyValue() {
    const val = "still banned";
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

test('no-restricted-syntax reports globalThis.console.error outside the logger allowlist', async () => {
    const messages = await lintMessages(
        GLOBAL_CONSOLE_ERROR_VIOLATING,
        'standalone-scripts/lovable-user-add/src/__fixture-violating.ts',
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

test('id-denylist reports staged placeholder identifiers in cleaned files', async () => {
    const messages = await lintMessages(
        DENYLIST_VIOLATING,
        'src/hooks/__fixture-denylist.ts',
        'id-denylist',
    );
    assert.ok(messages.some((message) => /val/.test(message.message)));
    assert.ok(messages.some((message) => /cb/.test(message.message)));
    assert.ok(messages.some((message) => /obj/.test(message.message)));
    assert.ok(messages.some((message) => /\bfn\b/.test(message.message)));
    assert.ok(messages.some((message) => /\bel\b/.test(message.message)));
    assert.ok(messages.some((message) => /msg/.test(message.message)));
    assert.ok(messages.some((message) => /ctx/.test(message.message)));
});

test('id-denylist quarantines legacy cb/obj/fn/el/msg/ctx debt without re-allowing val', async () => {
    const legacyMessages = await lintMessages(
        DENYLIST_QUARANTINED,
        'src/background/config-seeder.ts',
        'id-denylist',
    );
    assert.equal(legacyMessages.length, 0);

    const valMessages = await lintMessages(
        DENYLIST_STILL_VIOLATING_IN_QUARANTINE,
        'src/background/config-seeder.ts',
        'id-denylist',
    );
    assert.ok(valMessages.some((message) => /val/.test(message.message)));
});

test('id-denylist fully applies to cleaned XPath source files', async () => {
    const messages = await lintMessages(
        DENYLIST_QUARANTINED,
        'standalone-scripts/xpath/src/react-click.ts',
        'id-denylist',
    );
    assert.ok(messages.some((message) => /cb/.test(message.message)));
    assert.ok(messages.some((message) => /obj/.test(message.message)));
    assert.ok(messages.some((message) => /\bfn\b/.test(message.message)));
    assert.ok(messages.some((message) => /\bel\b/.test(message.message)));
    assert.ok(messages.some((message) => /msg/.test(message.message)));
    assert.ok(messages.some((message) => /ctx/.test(message.message)));
});

test('id-denylist fully applies to newly graduated 0.8 cleanup files', async () => {
    const cleanedFiles = [
        'src/lib/open-extension-options.ts',
        'standalone-scripts/payment-banner-hider/src/globals.d.ts',
    ];

    for (const filePath of cleanedFiles) {
        const messages = await lintMessages(DENYLIST_QUARANTINED, filePath, 'id-denylist');
        assert.ok(messages.some((message) => /cb/.test(message.message)), filePath);
        assert.ok(messages.some((message) => /obj/.test(message.message)), filePath);
        assert.ok(messages.some((message) => /\bfn\b/.test(message.message)), filePath);
        assert.ok(messages.some((message) => /\bel\b/.test(message.message)), filePath);
        assert.ok(messages.some((message) => /msg/.test(message.message)), filePath);
        assert.ok(messages.some((message) => /ctx/.test(message.message)), filePath);
    }
});

test('id-denylist allows descriptive replacement names', async () => {
    const messages = await lintMessages(
        DENYLIST_COMPLIANT,
        'src/hooks/__fixture-denylist-ok.ts',
        'id-denylist',
    );
    assert.equal(messages.length, 0);
});
