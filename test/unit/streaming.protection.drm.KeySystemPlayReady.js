/* jshint expr: true */

import KeySystemPlayReady from '../../src/streaming/protection/drm/KeySystemPlayReady.js';
import BASE64 from '../../externals/base64';

const expect = require('chai').expect;

describe('KeySystemPlayready', function () {

    let context;
    let keySystem;
    let cdmData = null;

    const protData = {
        cdmData: '2lfuDn3JoEo0dM324cA5tSv1gNNw65mgysBqNJqtxGUk7ShUOE03N6LK0cryu2roCQtDghmF7cC6xyt1WTA86CmrUNFRjo1tcxQtTVEW9Xw68pH7/yU2GbtK4zbctx49sffi4fYy8fGEUB5079CesBONxoKli5j2ADM8CWz93a5mYegZWraOq3EH0nvwvRXZ'
    };

    const expectedCDMData = '<PlayReadyCDMData type="LicenseAcquisition"><LicenseAcquisition version="1.0" Proactive="false"><CustomData encoding="base64encoded">MgBsAGYAdQBEAG4AMwBKAG8ARQBvADAAZABNADMAMgA0AGMAQQA1AHQAUwB2ADEAZwBOAE4AdwA2ADUAbQBnAHkAcwBCAHEATgBKAHEAdAB4AEcAVQBrADcAUwBoAFUATwBFADAAMwBOADYATABLADAAYwByAHkAdQAyAHIAbwBDAFEAdABEAGcAaABtAEYANwBjAEMANgB4AHkAdAAxAFcAVABBADgANgBDAG0AcgBVAE4ARgBSAGoAbwAxAHQAYwB4AFEAdABUAFYARQBXADkAWAB3ADYAOABwAEgANwAvAHkAVQAyAEcAYgB0AEsANAB6AGIAYwB0AHgANAA5AHMAZgBmAGkANABmAFkAeQA4AGYARwBFAFUAQgA1ADAANwA5AEMAZQBzAEIATwBOAHgAbwBLAGwAaQA1AGoAMgBBAEQATQA4AEMAVwB6ADkAMwBhADUAbQBZAGUAZwBaAFcAcgBhAE8AcQAzAEUASAAwAG4AdgB3AHYAUgBYAFoA</CustomData></LicenseAcquisition></PlayReadyCDMData>';

    beforeEach(function () {
        context = {};
    });

    it('should exist', () => {
        expect(KeySystemPlayReady).to.exist;
    });

    it('should throw an exception when getting an instance while the config attribute has not been set properly', function () {
        keySystem = KeySystemPlayReady(context).getInstance();
        expect(keySystem.getCDMData.bind(keySystem)).to.throw('Missing config parameter(s)');
    });

    it('should return the correct cdmData', function () {
        keySystem = KeySystemPlayReady(context).getInstance({BASE64: BASE64});
        keySystem.init(protData);
        cdmData = keySystem.getCDMData();
        expect(keySystem).to.be.defined;
        expect(cdmData).to.be.not.null;
        expect(cdmData).to.be.instanceOf(ArrayBuffer);
        var cdmDataString = String.fromCharCode.apply(null, new Uint16Array(cdmData));
        expect(cdmDataString).to.equal(expectedCDMData);
    });

});