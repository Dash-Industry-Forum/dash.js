const pkg = require('../../../package.json');

const commonBaseConfig = {
    devtool: 'source-map',
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
                    }
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

const prodEntries = {
    'dash.all': './index.js',
    'dash.mss': './src/mss/index.js',
    'dash.mediaplayer': './index_mediaplayerOnly.js',
    'dash.protection': './src/streaming/protection/Protection.js',
    'dash.reporting': './src/streaming/metrics/MetricsReporting.js',
    'dash.offline': './src/offline/index.js'
}

const devEntries = {
    'dash.all': './index.js',
    'dash.mss': './src/mss/index.js',
    'dash.offline': './src/offline/index.js'
}

module.exports = { commonBaseConfig, prodEntries, devEntries };
