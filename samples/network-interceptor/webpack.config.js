const path = require('path');

module.exports = {
  entry: './src/App.ts',
  externals: {
    dashjs: 'dashjs'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    library: 'app',
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devtool: 'eval-source-map',
  devServer: {
    static: path.join(__dirname, "dist"),
    compress: true,
    port: 4000,
  },
};