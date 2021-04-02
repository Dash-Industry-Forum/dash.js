const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

const out_dir = '../dist';

const config = {
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, out_dir),
        publicPath: '/dist/',
        library: 'dashjs',
        libraryTarget: 'umd',
        libraryExport: 'default',
    },
    module: {
        rules: [
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
    plugins: [
        new CleanWebpackPlugin(),
        new ESLintPlugin({
            files: [
                'src/**/*.js',
                'test/unit/mocks/*.js',
                'test/unit/*.js'
            ]
        })
    ]
}

module.exports = { config };

// module.exports = {
//     mode: 'development',
//     devtool: 'source-map',
//     entry: {
//         'dash.all': './index.js',
//         'dash.mss': './src/mss/index.js',
//     },
//     output: {
//         filename: '[name].debug.js',
//         path: path.resolve(__dirname, out_dir),
//         publicPath: '/dist/',
//         library: 'dashjs',
//         libraryTarget: 'umd',
//         libraryExport: 'default',
//     },
//     module: {
//         rules: [
//             {
//                 test: /\.(js)$/,
//                 exclude: /node_modules/,
//                 use: [
//                     {
//                         loader: `babel-loader`,
//                         options: { presets: ['@babel/env'] }
//                     }
//                 ]
//             }
//         ]
//     },
//     devServer: {
//         contentBase: path.join(__dirname, '/'),
//         open: true,
//         openPage: 'samples/index.html',
//         hot: true,
//         compress: true,
//         port: 3000,
//         watchOptions: {
//             aggregateTimeout: 300,
//             poll: 1000
//         }
//     },
//     plugins: [
//         new CleanWebpackPlugin(),
//         new ESLintPlugin({
//             files: [
//                 'src/**/*.js',
//                 'test/unit/mocks/*.js',
//                 'test/unit/*.js'
//             ]
//         }),
//         new webpack.HotModuleReplacementPlugin(),
//     ]
// };
