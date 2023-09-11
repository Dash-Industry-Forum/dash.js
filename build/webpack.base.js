const path = require('path');
const pkg = require('../package.json');

const out_dir = '../dist';

const config = {
    devtool: 'source-map',
    target: ['web', 'es5'],
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
    //Webpack 5 no longer polyfills Node.js core modules automatically
    resolve: {
        fallback: {
            stream: require.resolve('stream-browserify'),
        },
    },
}

module.exports = {config};
