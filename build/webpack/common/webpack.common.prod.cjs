const EsLintWebpackPlugin = require('eslint-webpack-plugin');
const { prodEntries } = require('../common/webpack.common.base.cjs');

const plugins = [
    new EsLintWebpackPlugin({
        configType: 'flat',
        files: [
            'src/**/*.js',
            'test/unit/mocks/*.js',
            'test/unit/test/**/*.js'
        ]
    })
]

const configCommonDebugProdUmd = {
    mode: 'development',
    entry: prodEntries,
    output: {
        filename: '[name].debug.js'
    }
};

const configCommonMinProdUmd = {
    mode: 'production',
    entry: prodEntries,
    output: {
        filename: '[name].min.js'
    },
    performance: { hints: false },
    plugins
};

const configCommonDebugProdEsm = {
    mode: 'development',
    entry: prodEntries,
    output: {
        filename: '[name].debug.esm.js'
    }
};

const configCommonMinProdEsm = {
    mode: 'production',
    entry: prodEntries,
    output: {
        filename: '[name].min.esm.js'
    },
    optimization: {
        usedExports: false,
    },
    performance: { hints: false },
    plugins
};

module.exports = { configCommonDebugProdEsm, configCommonMinProdEsm, configCommonDebugProdUmd, configCommonMinProdUmd };
