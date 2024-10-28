const { merge } = require('webpack-merge');
const EsLintWebpackPlugin = require('eslint-webpack-plugin');
const { umdConfig, esmConfig } = require('./webpack.base.cjs');

const entries = {
    'dash.all': './index.js',
    'dash.mss': './src/mss/index.js',
    'dash.mediaplayer': './index_mediaplayerOnly.js',
    'dash.protection': './src/streaming/protection/Protection.js',
    'dash.reporting': './src/streaming/metrics/MetricsReporting.js',
    'dash.offline': './src/offline/index.js'
}

const configDevUmd = merge(umdConfig, {
    mode: 'development',
    entry: entries,
    output: {
        filename: '[name].debug.js'
    }
});

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

const configProdUmd = merge(umdConfig, {
    mode: 'production',
    entry: entries,
    output: {
        filename: '[name].min.js'
    },
    performance: { hints: false },
    plugins
});

const configDevEsm = merge(esmConfig, {
    mode: 'development',
    entry: entries,
    output: {
        filename: '[name].debug.esm.js'
    }
});

const configProdEsm = merge(esmConfig, {
    mode: 'production',
    entry: entries,
    output: {
        filename: '[name].min.esm.js'
    },
    optimization: {
        usedExports: false,
    },
    performance: { hints: false },
    plugins
});

module.exports = [configDevUmd, configProdUmd, configDevEsm, configProdEsm];
