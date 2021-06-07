const { merge } = require('webpack-merge');
const ESLintPlugin = require('eslint-webpack-plugin');
const common = require('./webpack.base.js').config;

const entries = {
    'dash.all': './index.js',
    'dash.mss': './src/mss/index.js',
    'dash.mediaplayer': './index_mediaplayerOnly.js',
    'dash.protection': './src/streaming/protection/Protection.js',
    'dash.reporting': './src/streaming/metrics/MetricsReporting.js',
    'dash.offline': './src/offline/index.js'
}

const configDev = merge(common, {
    mode: 'development',
    entry: entries,
    output: {
        filename: '[name].debug.js'
    }
});

const configProd = merge(common, {
    mode: 'production',
    entry: entries,
    output: {
        filename: '[name].min.js'
    },
    performance: { hints: false },
    plugins: [
        new ESLintPlugin({
            files: [
                'src/**/*.js',
                'test/unit/mocks/*.js',
                'test/unit/*.js'
            ]
        })
    ]
});

module.exports = [configDev, configProd];
