const path = require('path');
const { merge } = require('webpack-merge');
const { commonBaseConfig } = require('../common/webpack.common.base.cjs');

const legacyConfig = merge(commonBaseConfig, {
    target: ['web', 'es5']
});

legacyConfig.module.rules[0].use.push({
    loader: 'babel-loader',
    options: {
        sourceType: 'unambiguous',
        presets: [
            [
                '@babel/preset-env',
                {
                    useBuiltIns: 'usage',
                    targets: {
                        ie: '11',
                    },
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

const umdConfig = merge(legacyConfig, {
    output: {
        path: path.resolve(__dirname, '../../../dist/legacy/umd'),
        // See the modern UMD config: chunks load next to the script, wherever it is hosted.
        publicPath: 'auto',
        library: 'dashjs',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
});

module.exports = { umdConfig };
