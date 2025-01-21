const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const { write } = require('fs');

module.exports = {
  mode: 'production',
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "../lib/bootstrap/bootstrap.min.css", to: "lib" },
        { from: "../lib/main.css", to: "lib" },
        { from: "../highlighter.js", to: "lib" },
        { from: "../lib/img/dashjs-logo.png", to: "img" },
      ]
    }),
  ],
  entry: './src/App.ts',
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
  devtool: 'source-map',
};