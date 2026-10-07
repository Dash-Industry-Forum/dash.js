import assert from 'node:assert/strict';
import test from 'node:test';
import configureKarma from './karma.unit.conf.cjs';

function getKarmaConfig(overrides = {}) {
    let karmaConfig;

    configureKarma({
        LOG_WARN: 'warn',
        ...overrides,
        set: (config) => {
            karmaConfig = config;
        }
    });

    return karmaConfig;
}

test('uses the complete unit test suite by default', () => {
    const karmaConfig = getKarmaConfig();

    assert.equal(karmaConfig.files[0].pattern, 'test/unit/test/**/*.js');
});

test('uses the requested unit test file pattern', () => {
    const testFile = 'test/unit/test/core/core.EventBus.js';
    const defaultConfig = getKarmaConfig();
    const filteredConfig = getKarmaConfig({ testFile });

    assert.equal(filteredConfig.files[0].pattern, testFile);
    assert.deepEqual(filteredConfig.files.slice(1), defaultConfig.files.slice(1));
});
