const pkg = require('../../../package.json');
const { IgnorePlugin } = require('webpack');

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
    plugins: [
        // IMSC uses SAX's string parser, not its Node stream API. Ignoring stream
        // lets SAX's try/catch select its browser fallback; stream: false does not.
        new IgnorePlugin({
            resourceRegExp: /^(stream|string_decoder)$/,
            contextRegExp: /[/\\]sax[/\\]lib$/
        })
    ],
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
