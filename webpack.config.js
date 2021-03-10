const path = require('path');

const output_folder = 'dist';

module.exports = [
    {
        mode: 'development',
        devtool: 'source-map',
        entry: {
            'dash.all': './index.js',
            'dash.mss': './src/mss/index.js',
            'dash.mediaplayer': './index_mediaplayerOnly.js'
        },
        output: {
            filename: '[name].debug.js',
            path: path.resolve(__dirname, output_folder),
            library: 'dashjs',
            libraryTarget: 'umd'
        },
    },
    {
        mode: 'production',
        devtool: 'source-map',
        entry: {
            'dash.all': './index.js',
            'dash.mss': './src/mss/index.js',
            'dash.mediaplayer': './index_mediaplayerOnly.js'
        },
        output: {
            filename: '[name].min.js',
            path: path.resolve(__dirname, output_folder),
            library: 'dashjs',
            libraryTarget: 'umd'
        },
    },
    {
        output: {
            filename: '[name].debug.js',
            path: path.resolve(__dirname, output_folder),
            library: ['dashjs', 'Protection'],
            libraryTarget: 'var',
            libraryExport: 'default'
        },
        entry: {
            'dash.protection': './src/streaming/protection/Protection.js'
        },
        mode: 'development',
        devtool: 'source-map'
    },
    {
        output: {
            filename: '[name].min.js',
            path: path.resolve(__dirname, output_folder),
            library: ['dashjs', 'Protection'],
            libraryTarget: 'var',
            libraryExport: 'default'
        },
        entry: {
            'dash.protection': './src/streaming/protection/Protection.js'
        },
        mode: 'production'
    },
    {
        output: {
            filename: '[name].debug.js',
            path: path.resolve(__dirname, output_folder),
            library: ['dashjs', 'MetricsReporting'],
            libraryTarget: 'var',
            libraryExport: 'default'
        },
        entry: {
            'dash.reporting': './src/streaming/metrics/MetricsReporting.js',
        },
        mode: 'development',
        devtool: 'source-map'
    },
    {
        output: {
            filename: '[name].min.js',
            path: path.resolve(__dirname, output_folder),
            library: ['dashjs', 'MetricsReporting'],
            libraryTarget: 'var',
            libraryExport: 'default'
        },
        entry: {
            'dash.reporting': './src/streaming/metrics/MetricsReporting.js',
        },
        mode: 'production'
    }
];
