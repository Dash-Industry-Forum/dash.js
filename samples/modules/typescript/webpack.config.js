const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    entry: './src/entry.ts',
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'out.js'
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true,
            filename: 'index.html',
            template: 'index.html'
        })
    ],
    module: {
        // Webpack doesn't understand TypeScript files and a loader is needed.
        // `node_modules` folder is excluded in order to prevent problems with
        // the library dependencies, as well as `__tests__` folders that
        // contain the tests for the library
        // Changed `loaders` to `rules` to be compatible with Webpack 4+
        rules: [ 
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                exclude: /node_modules/,
                options: { 
                    // we don't want any declaration file in the bundles
                    // folder since it wouldn't be of any use ans the source
                    // map already include everything for debugging
                    declaration: false,
                }
            }
        ]
    },
    resolve: {
        fallback: {
            // need for the timers polyfill
            timers: require.resolve('timers-browserify') 
        }
    }
};