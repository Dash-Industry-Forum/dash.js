import globals from 'globals';

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
    },
}];
