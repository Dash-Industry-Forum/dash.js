const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const pkg = require('../package.json');

const out_dir = '../dist';

const config = {
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, out_dir),
        publicPath: '/dist/',
        library: 'dashjs',
        libraryTarget: 'umd',
        libraryExport: 'default'
    },
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
                        options: {presets: ['@babel/env']}
                    }
                ]
            }
        ]
    },
    plugins: [
        new ESLintPlugin({
            files: [
                'src/**/*.js',
                'test/unit/mocks/*.js',
                'test/unit/*.js'
            ]
        })
    ]
}

module.exports = {config};
