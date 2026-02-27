import FairPlay from '../../../../src/streaming/protection/servers/FairPlay.js';
import {expect} from 'chai';

describe('FairPlay', function () {

    let licenseServerData;
    const context = {};

    it('FairPlay should exist', () => {
        expect(FairPlay).to.exist;
    });

    describe('Methods', function () {
        beforeEach(function () {
            licenseServerData = FairPlay(context).getInstance();
        });

        afterEach(function () {
            licenseServerData = null;
        });

        it('should return POST as HTTP method', () => {
            expect(licenseServerData.getHTTPMethod()).to.equal('POST');
        });

        it('should return arraybuffer as response type', () => {
            expect(licenseServerData.getResponseType()).to.equal('arraybuffer');
        });

        it('should pass through raw binary CKC unchanged', () => {
            // Binary data that is NOT valid UTF-8 text or base64
            const binaryData = new Uint8Array([0x00, 0x01, 0xFF, 0xFE, 0x80, 0x90]);
            const result = licenseServerData.getLicenseMessage(binaryData.buffer);
            expect(result).to.equal(binaryData.buffer);
        });

        it('should decode base64-encoded CKC response', () => {
            // "Hello" base64-encoded is "SGVsbG8="
            const base64Text = 'SGVsbG8=';
            const encoder = new TextEncoder();
            const response = encoder.encode(base64Text).buffer;
            const result = licenseServerData.getLicenseMessage(response);
            const decoded = new Uint8Array(result);
            expect(String.fromCharCode.apply(null, decoded)).to.equal('Hello');
        });

        it('should decode <ckc> wrapped base64 response', () => {
            const wrappedText = '<ckc>SGVsbG8=</ckc>';
            const encoder = new TextEncoder();
            const response = encoder.encode(wrappedText).buffer;
            const result = licenseServerData.getLicenseMessage(response);
            const decoded = new Uint8Array(result);
            expect(String.fromCharCode.apply(null, decoded)).to.equal('Hello');
        });

        it('should decode JSON wrapped CKC response', () => {
            const jsonText = '{"ckc": "SGVsbG8="}';
            const encoder = new TextEncoder();
            const response = encoder.encode(jsonText).buffer;
            const result = licenseServerData.getLicenseMessage(response);
            const decoded = new Uint8Array(result);
            expect(String.fromCharCode.apply(null, decoded)).to.equal('Hello');
        });

        it('should return the url unchanged from getServerURLFromMessage', () => {
            const url = 'https://fps.example.com/license';
            const result = licenseServerData.getServerURLFromMessage(url);
            expect(result).to.equal(url);
        });

        it('should convert error response to string', () => {
            const errorBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
            const result = licenseServerData.getErrorResponse(errorBytes.buffer);
            expect(result).to.equal('Hello');
        });
    });
});
