const { merge } = require('webpack-merge');
const common = require('./webpack.base.cjs').config;
const path = require('path');

const config = merge(common, {
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

module.exports = config;
