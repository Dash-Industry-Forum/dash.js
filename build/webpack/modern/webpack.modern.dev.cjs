const { merge } = require('webpack-merge');
const { umdConfig } = require('./webpack.modern.base.cjs');
const { devEntries } = require('../common/webpack.common.base.cjs');
const path = require('path');

// Prefer port 3000, fall back to the next free port if it is already taken (e.g. another dash.js dev server)
process.env.WEBPACK_DEV_SERVER_BASE_PORT = process.env.WEBPACK_DEV_SERVER_BASE_PORT || '3000';

const umdDevConfig = merge(umdConfig, {
    mode: 'development',
    entry: devEntries,
    output: {
        filename: '[name].debug.js',
    },
    devServer: {
        static: {
            directory: path.join(__dirname, '../../../'),
        },
        open: ['samples/index.html'],
        hot: true,
        compress: true,
        port: 'auto'
    }
});

module.exports = [umdDevConfig];
