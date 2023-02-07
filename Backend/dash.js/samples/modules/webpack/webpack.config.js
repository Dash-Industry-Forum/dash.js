const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/entry.js',
    output: {
        path: './out',
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
        loaders: [
            {
                test: /\.js$/,
                loader: require.resolve('babel-loader'),
                query: {
                    presets: [
                        'es2015'
                    ]
                }
            }
        ]
    }
};
