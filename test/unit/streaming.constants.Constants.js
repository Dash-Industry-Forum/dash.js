import Constants from '../../src/streaming/constants/Constants';

const expect = require('chai').expect;

describe('Constants', function () {
    it('Constants should exist', () => {
        expect(Constants).to.exist; // jshint ignore:line
        expect(Constants.STREAM).to.equal('stream');
        expect(Constants.VIDEO).to.equal('video');
        expect(Constants.AUDIO).to.equal('audio');
        expect(Constants.TEXT).to.equal('text');
        expect(Constants.MUXED).to.equal('muxed');
        expect(Constants.LOCATION).to.equal('Location');
        expect(Constants.INITIALIZE).to.equal('initialize');
        expect(Constants.TEXT_SHOWING).to.equal('showing');
        expect(Constants.TEXT_HIDDEN).to.equal('hidden');
        expect(Constants.CC1).to.equal('CC1');
        expect(Constants.CC3).to.equal('CC3');
        expect(Constants.STPP).to.equal('stpp');
        expect(Constants.TTML).to.equal('ttml');
        expect(Constants.VTT).to.equal('vtt');
        expect(Constants.WVTT).to.equal('wvtt');
        expect(Constants.UTF8).to.equal('utf-8');
        expect(Constants.SCHEME_ID_URI).to.equal('schemeIdUri');
        expect(Constants.START_TIME).to.equal('starttime');
        expect(Constants.BAD_ARGUMENT_ERROR).to.equal('Invalid Arguments');
        expect(Constants.MISSING_CONFIG_ERROR).to.equal('Missing config parameter(s)');
        expect(Constants.DVB_REPORTING_URL).to.equal('dvb:reportingUrl');
        expect(Constants.DVB_PROBABILITY).to.equal('dvb:probability');
    });
});
