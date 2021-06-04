const webpack = require('webpack');
const { merge } = require('webpack-merge');
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
    },
});

const configProd = merge(common, {
    mode: 'production',
    entry: entries,
    output: {
        filename: '[name].min.js'
    },
    plugins: [
        new webpack.ProvidePlugin({
            Promise: ['es6-promise', 'Promise']
        })
    ],
    performance: { hints: false }
});

module.exports = [configDev, configProd];
