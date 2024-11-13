const path = require('path');
const pkg = require('../package.json');

const commonConfig = {
    devtool: 'source-map',
    target: ['web', 'es5'],
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: [/core-js/],
                use: [
                    {
                        loader: 'string-replace-loader',
                        options: {
                            search: '__VERSION__',
                            replace: pkg.version,
                        },
                    },
                    {
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
                    },
                ],
            },
        ],
    },
    resolve: {
        fallback: {
            stream: require.resolve('stream-browserify'),
        },
    },
}

const umdConfig = {
    ...commonConfig,
    output: {
        path: path.resolve(__dirname, '../dist'),
        publicPath: '/dist/',
        library: 'dashjs',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
};

const esmConfig = {
    ...commonConfig,
    experiments: {
        outputModule: true
    },
    output: {
        path: path.resolve(__dirname, '../dist/esm'),
        publicPath: '/dist/esm/',
        library: {
            type: 'module',
        },
        libraryExport: 'default',
    },
};

module.exports = { umdConfig, esmConfig };
