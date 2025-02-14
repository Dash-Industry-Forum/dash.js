const { merge } = require('webpack-merge');
const { umdConfig } = require('./webpack.legacy.base.cjs');
const {
    configCommonDebugProdUmd,
    configCommonMinProdUmd
} = require('../common/webpack.common.prod.cjs');

const configLegacyDebugUmd = merge(umdConfig, configCommonDebugProdUmd);

const configLegacyMinUmd = merge(umdConfig, configCommonMinProdUmd);

module.exports = [configLegacyDebugUmd, configLegacyMinUmd];
