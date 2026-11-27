import globals from 'globals';
import vitest from '@vitest/eslint-plugin';

// Unit test files that still use done callbacks (DONE_CALLBACK_FILES) or contain tests without an
// assertion (NO_EXPECT_FILES). The area PRs of #5210 convert them; these lists only shrink.
const DONE_CALLBACK_FILES = [
    'test/unit/test/dash/dash.SegmentBaseLoader.js',
    'test/unit/test/dash/dash.WebSegmentBaseLoader.js',
    'test/unit/test/dash/dash.controllers.RepresentationController.js',
    'test/unit/test/streaming/streaming.MediaPlayer.js',
    'test/unit/test/streaming/streaming.Stream.js',
    'test/unit/test/streaming/streaming.controllers.AbrController.js',
    'test/unit/test/streaming/streaming.controllers.BufferController.js',
    'test/unit/test/streaming/streaming.controllers.EventController.js',
    'test/unit/test/streaming/streaming.controllers.FragmentController.js',
    'test/unit/test/streaming/streaming.controllers.MediaController.js',
    'test/unit/test/streaming/streaming.controllers.MediaSourceController.js',
    'test/unit/test/streaming/streaming.controllers.PlaybackControllers.js',
    'test/unit/test/streaming/streaming.controllers.SourceBufferSink.js',
    'test/unit/test/streaming/streaming.controllers.StreamController.js',
    'test/unit/test/streaming/streaming.controllers.TimeSyncController.js',
    'test/unit/test/streaming/streaming.controllers.XLinkController.js',
    'test/unit/test/streaming/streaming.models.MetricsModel.js',
    'test/unit/test/streaming/streaming.models.VideoModel.js',
    'test/unit/test/streaming/streaming.protection.controllers.ProtectionController.js',
    'test/unit/test/streaming/streaming.text.NotFragmentedTextBufferController.js',
    'test/unit/test/streaming/streaming.utils.CapabilitiesFilter.js'
];
const NO_EXPECT_FILES = [
    'test/unit/test/dash/dash.SegmentBaseLoader.js',
    'test/unit/test/dash/dash.WebSegmentBaseLoader.js',
    'test/unit/test/dash/dash.controllers.ContentSteeringController.js',
    'test/unit/test/reference-player/refplayer.SettingsPanel.js',
    'test/unit/test/streaming/streaming.controllers.BufferController.js',
    'test/unit/test/streaming/streaming.controllers.CatchupController.js',
    'test/unit/test/streaming/streaming.controllers.FragmentController.js',
    'test/unit/test/streaming/streaming.controllers.GapController.js',
    'test/unit/test/streaming/streaming.controllers.MediaController.js',
    'test/unit/test/streaming/streaming.controllers.MediaSourceController.js',
    'test/unit/test/streaming/streaming.controllers.PlaybackControllers.js',
    'test/unit/test/streaming/streaming.controllers.ServiceDescriptionController.js',
    'test/unit/test/streaming/streaming.controllers.SourceBufferSink.js',
    'test/unit/test/streaming/streaming.controllers.StreamController.js',
    'test/unit/test/streaming/streaming.controllers.TimeSyncController.js',
    'test/unit/test/streaming/streaming.models.VideoModel.js'
];

export default [{
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.mocha,
            ...globals.node,
            dashjs: true,
            ManagedMediaSource: true,
            WebKitMediaSource: true,
            MediaSource: true,
            WebKitMediaKeys: true,
            MSMediaKeys: true,
            MediaKeys: true,
            google: true,
        },

        ecmaVersion: 2020,
        sourceType: 'module',

        parserOptions: {
            parser: '@babel/eslint-parser',
            requireConfigFile: false,
        },
    },

    rules: {
        'no-caller': 2,
        'no-undef': 2,
        'no-unused-vars': [
            'error',
            {
                vars: 'all',
                args: 'after-used',
                ignoreRestSiblings: true,
                caughtErrors: 'none' // Allow unused variables in catch blocks
            }
        ],
        'no-use-before-define': 0,
        strict: 0,
        'no-loop-func': 0,
        'no-multi-spaces': 'error',

        'keyword-spacing': ['error', {
            before: true,
            after: true,
        }],

        quotes: ['error', 'single', {
            allowTemplateLiterals: true,
        }],

        indent: ['error', 4, {
            SwitchCase: 1,
        }],

        curly: ['error', 'all'],

        'space-infix-ops': ['error', {
            int32Hint: true,
        }],
        'no-unreachable': 'error',
        'max-len': ['error', {
            code: 120,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true,
            // JSDoc cannot parse [name=default] split across lines
            ignorePattern: '^\\s*\\* @property ',
        }],
    },
}, {
    // Unit test conventions, see test/unit/README.md
    files: ['test/unit/**/*.js'],
    plugins: { vitest },
    rules: {
        'vitest/no-focused-tests': 'error',
        'vitest/no-disabled-tests': 'error',
        'vitest/no-commented-out-tests': 'error',
        'vitest/no-identical-title': 'error',
        'vitest/no-duplicate-hooks': 'error',
        'vitest/no-conditional-tests': 'error',
        'vitest/no-standalone-expect': 'error',
        'vitest/no-import-node-test': 'error',
        'vitest/valid-describe-callback': 'error',
        'vitest/valid-expect': 'error',
        // Table-driven tests pass the title as a variable
        'vitest/valid-title': ['error', { allowArguments: true }],
        'vitest/no-done-callback': 'error',
        'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'sinon.assert.*'] }],
        'no-restricted-imports': ['error', {
            paths: [
                { name: 'chai-spies', message: 'Use vi.fn() or vi.spyOn() from vite-plus/test.' },
                { name: 'chai', importNames: ['assert', 'should'], message: 'Use expect.' }
            ]
        }],
        'no-restricted-properties': ['error',
            { object: 'chai', property: 'assert', message: 'Use expect.' },
            { object: 'chai', property: 'should', message: 'Use expect.' }
        ]
    }
}, {
    files: DONE_CALLBACK_FILES,
    rules: { 'vitest/no-done-callback': 'off' }
}, {
    files: NO_EXPECT_FILES,
    rules: { 'vitest/expect-expect': 'off' }
}];
