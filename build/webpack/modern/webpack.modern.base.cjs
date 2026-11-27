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
                '@babel/preset-env'
            ],
        ],
        plugins: [
            '@babel/plugin-transform-runtime'
        ],
    },
},)

const umdConfig = merge(modernConfig, {
    output: {
        path: path.resolve(__dirname, '../../../dist/modern/umd'),
        // 'auto' resolves lazily loaded chunks (the C2PA validation engine) next to the
        // script itself, so the bundle also works from a CDN or any other path.
        publicPath: 'auto',
        library: 'dashjs',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
});

const esmConfig = merge(modernConfig, {
    experiments: {
        outputModule: true
    },
    // Keep the C2PA validation engine a real dynamic import in the ESM bundle. An app's
    // bundler then resolves and code-splits it; it can't see a chunk that webpack's
    // runtime loads by a computed URL.
    externals: {
        '@svta/cml-c2pa': 'import @svta/cml-c2pa'
    },
    output: {
        path: path.resolve(__dirname, '../../../dist/modern/esm'),
        publicPath: 'auto',
        // Needed for the external import below. A browser that loads this ES module bundle
        // supports dynamic import() and async functions.
        environment: {
            dynamicImport: true,
            asyncFunction: true
        },
        library: {
            type: 'module',
        },
    },
});

module.exports = { umdConfig, esmConfig };
