const { merge } = require('webpack-merge');
const { umdConfig, esmConfig } = require('./webpack.legacy.base.cjs');
const {
    configCommonDebugProdEsm,
    configCommonMinProdEsm,
    configCommonDebugProdUmd,
    configCommonMinProdUmd
} = require('../common/webpack.common.prod.cjs');

const configLegacyDebugUmd = merge(umdConfig, configCommonDebugProdUmd);

const configLegacyMinUmd = merge(umdConfig, configCommonMinProdUmd);

const configLegacyDebugEsm = merge(esmConfig, configCommonDebugProdEsm);

const configLegacyMinEsm = merge(esmConfig, configCommonMinProdEsm);

module.exports = [configLegacyDebugUmd, configLegacyMinUmd, configLegacyDebugEsm, configLegacyMinEsm];
