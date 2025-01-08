const { merge } = require('webpack-merge');
const { umdConfig } = require('./webpack.modern.base.cjs');
const { devEntries } = require('../common/webpack.common.base.cjs');
const path = require('path');

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
        port: 3000
    }
});

module.exports = [umdDevConfig];
