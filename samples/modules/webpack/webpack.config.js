
module.exports = {
	entry: './src/entry.js',
	output: {
		path: './out',
		filename: 'out.js'
	},
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
