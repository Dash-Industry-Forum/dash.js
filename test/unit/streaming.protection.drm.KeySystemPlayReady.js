import KeySystemPlayReady from '../../src/streaming/protection/drm/KeySystemPlayReady.js';
import BASE64 from '../../externals/base64';

const expect = require('chai').expect;
const jsdom = require('jsdom').JSDOM;

describe('KeySystemPlayready', function () {

    let  context = {};
    let keySystem,
        DOMParser;
    let cdmData = null;

    const protData = {
        cdmData: '2lfuDn3JoEo0dM324cA5tSv1gNNw65mgysBqNJqtxGUk7ShUOE03N6LK0cryu2roCQtDghmF7cC6xyt1WTA86CmrUNFRjo1tcxQtTVEW9Xw68pH7/yU2GbtK4zbctx49sffi4fYy8fGEUB5079CesBONxoKli5j2ADM8CWz93a5mYegZWraOq3EH0nvwvRXZ'
    };

    const expectedCDMData = '<PlayReadyCDMData type="LicenseAcquisition"><LicenseAcquisition version="1.0" Proactive="false"><CustomData encoding="base64encoded">MgBsAGYAdQBEAG4AMwBKAG8ARQBvADAAZABNADMAMgA0AGMAQQA1AHQAUwB2ADEAZwBOAE4AdwA2ADUAbQBnAHkAcwBCAHEATgBKAHEAdAB4AEcAVQBrADcAUwBoAFUATwBFADAAMwBOADYATABLADAAYwByAHkAdQAyAHIAbwBDAFEAdABEAGcAaABtAEYANwBjAEMANgB4AHkAdAAxAFcAVABBADgANgBDAG0AcgBVAE4ARgBSAGoAbwAxAHQAYwB4AFEAdABUAFYARQBXADkAWAB3ADYAOABwAEgANwAvAHkAVQAyAEcAYgB0AEsANAB6AGIAYwB0AHgANAA5AHMAZgBmAGkANABmAFkAeQA4AGYARwBFAFUAQgA1ADAANwA5AEMAZQBzAEIATwBOAHgAbwBLAGwAaQA1AGoAMgBBAEQATQA4AEMAVwB6ADkAMwBhADUAbQBZAGUAZwBaAFcAcgBhAE8AcQAzAEUASAAwAG4AdgB3AHYAUgBYAFoA</CustomData></LicenseAcquisition></PlayReadyCDMData>';

    describe('Not well initialized', () => {
        beforeEach(function () {
            keySystem = KeySystemPlayReady(context).getInstance();
            if (typeof DOMParser === 'undefined') {
                global.DOMParser = new jsdom().window.DOMParser;
            }
        });

        afterEach(function () {
            keySystem = null;
            global.DOMParser = undefined;
            context = {};
        });

        it('should exist', () => {
            expect(KeySystemPlayReady).to.exist;   // jshint ignore:line
        });

        it('should throw an exception when getting an instance while the config attribute has not been set properly', function () {
            expect(keySystem.getCDMData.bind(keySystem)).to.throw('Missing config parameter(s)');
        });

        it('should throw an exception when getting an instance while the config attribute has not been set properly', function () {
            expect(keySystem.getInitData.bind(keySystem)).to.throw('Missing config parameter(s)');
        });

        it('should throw an exception when getting an instance while the config attribute has not been set properly', function () {
            expect(keySystem.getLicenseRequestFromMessage.bind(keySystem)).to.throw('Missing config parameter(s)');
        });
    });

    describe('Well initialized', () => {
        beforeEach(function () {
            keySystem = KeySystemPlayReady(context).getInstance({BASE64: BASE64});
            if (typeof DOMParser === 'undefined') {
                global.DOMParser = new jsdom().window.DOMParser;
            }
        });

        afterEach(function () {
            keySystem = null;
            global.DOMParser = undefined;
            context = {};
        });

        /* only allow utf-8 and utf-16 formats */
        it('should throw an exception when messageformat is not supported', function () {
            expect(keySystem.setPlayReadyMessageFormat.bind(keySystem, 'utf8')).to.throw('Specified message format is not one of "utf-8" or "utf-16"');
        });

        it('should not throw an exception when messageformat is supported', function () {
            expect(keySystem.setPlayReadyMessageFormat.bind(keySystem, 'utf-8')).not.to.throw('Specified message format is not one of "utf-8" or "utf-16"');
        });

        it('should return null when getSessionId is called and protData is undefined', function () {
            const sessionId = keySystem.getSessionId();
            expect(sessionId).to.be.null;   // jshint ignore:line
        });

        it('should return null when getCDMData is called and protData is undefined', function () {
            const cdmData = keySystem.getCDMData();
            expect(cdmData).to.be.null;   // jshint ignore:line
        });

        it('should return null when getInitData is called without parameter', function () {
            const initData = keySystem.getInitData();
            expect(initData).to.be.null;   // jshint ignore:line
        });

        it('should return null when getLicenseServerURLFromInitData is called without parameter', function () {
            const licenseServerUrl = keySystem.getLicenseServerURLFromInitData();
            expect(licenseServerUrl).to.be.null;   // jshint ignore:line
        });

        it('should return null when getLicenseRequestFromMessage is called without parameter', function () {
            const licenseRequest = keySystem.getLicenseRequestFromMessage();
            expect(licenseRequest).to.be.undefined;   // jshint ignore:line
        });

        it('should return at least Content-Type header when getRequestHeadersFromMessage is called without parameter', function () {
            const requestHeaders = keySystem.getRequestHeadersFromMessage();
            expect(requestHeaders['Content-Type']).to.equal('text/xml; charset=utf-8');
        });

        it('should return the correct cdmData', function () {
            keySystem.init(protData);
            cdmData = keySystem.getCDMData();
            expect(keySystem).to.be.defined;   // jshint ignore:line
            expect(cdmData).to.be.not.null;   // jshint ignore:line
            expect(cdmData).to.be.instanceOf(ArrayBuffer);
            var cdmDataString = String.fromCharCode.apply(null, new Uint16Array(cdmData));
            expect(cdmDataString).to.equal(expectedCDMData);
        });
    });
});
