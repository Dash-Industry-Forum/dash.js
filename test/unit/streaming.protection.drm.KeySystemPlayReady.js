import KeySystemPlayReady from '../../src/streaming/protection/drm/KeySystemPlayReady.js';

const expect = require('chai').expect;
const fs = require('fs');
const domParser = require('xmldom').DOMParser;

describe('KeySystemPlayready', function(){

    let keySystem;
    let cdmData = null;

    const protData = {
        cdmData: '2lfuDn3JoEo0dM324cA5tSv1gNNw65mgysBqNJqtxGUk7ShUOE03N6LK0cryu2roCQtDghmF7cC6xyt1WTA86CmrUNFRjo1tcxQtTVEW9Xw68pH7/yU2GbtK4zbctx49sffi4fYy8fGEUB5079CesBONxoKli5j2ADM8CWz93a5mYegZWraOq3EH0nvwvRXZ'
    }

    const expectedCDMData = '<PlayReadyCDMData type="LicenseAcquisition"><LicenseAcquisition version="1.0" Proactive="false"><CustomData encoding="base64encoded"></CustomData></LicenseAcquisition></PlayReadyCDMData>';
    
    const context = {};

    it('should exist', () => {
        expect(KeySystemPlayReady).to.exist; // jshint ignore:line
    });

    keySystem = KeySystemPlayReady(context).getInstance();
    keySystem.init(protData);
    cdmData = keySystem.getCDMData();

    it('should return the correct cdmData', function() {
        expect(keySystem).to.be.not.undefined;
        expect(cdmData).to.be.not.null;
        expect(cdmData).to.equal(expectedCDMData);
    });

})