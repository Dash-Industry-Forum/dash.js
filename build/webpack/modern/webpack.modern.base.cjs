const path = require('path');
const { merge } = require('webpack-merge');
const { commonBaseConfig } = require('../common/webpack.common.base.cjs');

const modernConfig = merge(commonBaseConfig, {
    target: ['browserslist']
});

modernConfig.module.rules[0].use.push({
    loader: 'babel-loader',
    options: {
        sourceType: 'unambiguous',
        presets: [
            [
                '@babel/preset-env',
                {
                    useBuiltIns: 'usage',
                    corejs: '3.39.0',
                }
            ],
        ],
        plugins: [
            '@babel/plugin-transform-runtime',
            '@babel/plugin-transform-parameters'
        ],
    },
},)

const umdConfig = merge(modernConfig, {
    output: {
        path: path.resolve(__dirname, '../../../dist/modern/umd'),
        publicPath: '/dist/modern/umd/',
        library: 'dashjs',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
});

const esmConfig = merge(modernConfig, {
    experiments: {
        outputModule: true
    },
    output: {
        path: path.resolve(__dirname, '../../../dist/modern/esm'),
        publicPath: '/dist/modern/esm/',
        library: {
            type: 'module',
        },
        libraryExport: 'default',
    },
});

module.exports = { umdConfig, esmConfig };
