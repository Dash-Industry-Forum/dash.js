/* jshint expr: true */

import KeySystemW3CClearKey from '../../src/streaming/protection/drm/KeySystemW3CClearKey';
import BASE64 from '../../externals/base64';
import DebugMock from './mocks/DebugMock';
const chai = require('chai');
const expect = chai.expect;

describe('KeySystemW3CClearKey', function () {

    let context;
    let config;
    let keySystem;
    let message = new Uint8Array([123,34,107,105,100,115,34,58,91,34,97,75,69,114,88,72,78,71,98,51,103,97,68,98,89,98,95,114,111,99,112,119,34,93,44,34,116,121,112,101,34,58,34,116,101,109,112,111,114,97,114,121,34,125]);
    let debug = new DebugMock();
    const protData = {
        'clearkeys': {
            'aKErXHNGb3gaDbYb_rocpw': 'FmY0xnWCPCNaSpRG-tUuTQ'
        }
    };

    beforeEach(function () {
        config = { BASE64, debug: debug };
        context = {};
    });

    it('should exist', () => {
        expect(KeySystemW3CClearKey).to.exist;
    });

    it('CDMData to be null', function () {
        keySystem = KeySystemW3CClearKey(context).getInstance(config);
        expect(keySystem.getCDMData.apply(keySystem)).to.be.null;
    });

    it('should warn when using this system', function () {
        keySystem = KeySystemW3CClearKey(context).getInstance(config);
        keySystem.getClearKeysFromProtectionData(protData, message);
        expect(debug.log.warn).to.equal('ClearKey schemeIdURI is using W3C Common PSSH systemID (1077efec-c0b2-4d02-ace3-3c1e52e2fb4b) in Content Protection. See DASH-IF IOP v4.1 section 7.6.2.4');
    });

    it('returns clearkey pair', function () {
        keySystem = KeySystemW3CClearKey(context).getInstance(config);
        const keyPairs = keySystem.getClearKeysFromProtectionData(protData, message).keyPairs;

        expect(keyPairs.length).to.equal(1);
        expect(keyPairs[0].keyID).to.equal(Object.keys(protData.clearkeys)[0]);
        expect(keyPairs[0].key).to.equal(protData.clearkeys[Object.keys(protData.clearkeys)[0]]);
    });
});
