const { prodEntries } = require('../common/webpack.common.base.cjs');

const configCommonDebugProdUmd = {
    mode: 'development',
    entry: prodEntries,
    output: {
        filename: '[name].debug.js'
    }
};

const configCommonMinProdUmd = {
    mode: 'production',
    entry: prodEntries,
    output: {
        filename: '[name].min.js'
    },
    performance: { hints: false }
};

const configCommonDebugProdEsm = {
    mode: 'development',
    entry: prodEntries,
    output: {
        filename: '[name].debug.js'
    }
};

const configCommonMinProdEsm = {
    mode: 'production',
    entry: prodEntries,
    output: {
        filename: '[name].min.js'
    },
    optimization: {
        usedExports: false,
    },
    performance: { hints: false }
};

module.exports = { configCommonDebugProdEsm, configCommonMinProdEsm, configCommonDebugProdUmd, configCommonMinProdUmd };
