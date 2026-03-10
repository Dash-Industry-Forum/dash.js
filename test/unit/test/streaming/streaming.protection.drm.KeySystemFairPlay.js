import KeySystemFairPlay from '../../../../src/streaming/protection/drm/KeySystemFairPlay.js';
import ProtectionConstants from '../../../../src/streaming/constants/ProtectionConstants.js';
import {expect} from 'chai';

describe('KeySystemFairPlay', function () {

    let context = {};
    let keySystem;

    beforeEach(function () {
        keySystem = KeySystemFairPlay(context).getInstance();
    });

    afterEach(function () {
        keySystem = null;
        context = {};
    });

    it('should exist', () => {
        expect(KeySystemFairPlay).to.exist;
    });

    it('should have the correct uuid', () => {
        expect(keySystem.uuid).to.equal(ProtectionConstants.FAIRPLAY_UUID);
    });

    it('should have the correct systemString', () => {
        expect(keySystem.systemString).to.equal(ProtectionConstants.FAIRPLAY_KEYSTEM_STRING);
    });

    it('should have the correct schemeIdURI', () => {
        expect(keySystem.schemeIdURI).to.equal('urn:uuid:' + ProtectionConstants.FAIRPLAY_UUID);
    });

    it('should return null from getInitData (no PSSH in FairPlay)', () => {
        const initData = keySystem.getInitData({});
        expect(initData).to.be.null;
    });

    it('should return Uint8Array from getLicenseRequestFromMessage', () => {
        const message = new ArrayBuffer(4);
        new Uint8Array(message).set([1, 2, 3, 4]);
        const result = keySystem.getLicenseRequestFromMessage(message);
        expect(result).to.be.instanceOf(Uint8Array);
        expect(result.length).to.equal(4);
        expect(result[0]).to.equal(1);
        expect(result[3]).to.equal(4);
    });

    it('should return Content-Type: application/octet-stream from getRequestHeadersFromMessage', () => {
        const headers = keySystem.getRequestHeadersFromMessage();
        expect(headers).to.deep.equal({ 'Content-Type': 'application/octet-stream' });
    });

    it('should return null from getLicenseServerURLFromInitData', () => {
        const url = keySystem.getLicenseServerURLFromInitData();
        expect(url).to.be.null;
    });

    it('should return null from getCDMData', () => {
        const cdmData = keySystem.getCDMData();
        expect(cdmData).to.be.null;
    });
});
