const { merge } = require('webpack-merge');
const { umdConfig, esmConfig } = require('./webpack.base.cjs');
const path = require('path');

const umdDevConfig = merge(umdConfig, {
    mode: 'development',
    entry: {
        'dash.all': './index.js',
        'dash.mss': './src/mss/index.js',
        'dash.offline': './src/offline/index.js'
    },
    output: {
        filename: '[name].debug.js',
    },
    devServer: {
        static: {
            directory: path.join(__dirname, '../'),
        },
        open: ['samples/index.html'],
        hot: true,
        compress: true,
        port: 3000
    }
});

const esmDevConfig = merge(esmConfig, {
    mode: 'development',
    entry: {
        'dash.all': './index.js',
        'dash.mss': './src/mss/index.js',
        'dash.offline': './src/offline/index.js'
    },
    output: {
        filename: '[name].debug.esm.js',
    },
});

module.exports = [umdDevConfig, esmDevConfig];
