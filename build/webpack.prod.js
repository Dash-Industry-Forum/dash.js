const { merge } = require('webpack-merge');
const common = require('./webpack.base.js').config;

const config = merge(common, {
    mode: 'production',
    entry: {
        'dash.all': './index.js',
        'dash.mss': './src/mss/index.js',
        'dash.mediaplayer': './index_mediaplayerOnly.js',
        'dash.protection': './src/streaming/protection/Protection.js',
        'dash.reporting': './src/streaming/metrics/MetricsReporting.js',
    },
    output: {
        filename: '[name].js',
    },
    performance: { hints: false }
});

module.exports = config;
