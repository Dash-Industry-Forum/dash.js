const path = require('path');
const pkg = require('../package.json');

const commonConfig = {
    devtool: 'source-map',
    target: ['web', 'es5'],
    module: {
        rules: [
            {
                test: /\.(js)$/,
                loader: 'string-replace-loader',
                options: {
                    search: '__VERSION__',
                    replace: pkg.version,
                }
            },
            {
                test: /\.(js)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: `babel-loader`,
                        options: { presets: ['@babel/env'] }
                    }
                ]
            }
        ]
    },
    //Webpack 5 no longer polyfills Node.js core modules automatically
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
