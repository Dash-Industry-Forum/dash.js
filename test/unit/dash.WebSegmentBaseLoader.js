import WebmSegmentBaseLoader from '../../src/dash/WebmSegmentBaseLoader';

const expect = require('chai').expect;

const context = {};
const webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();

describe('WebmSegmentBaseLoader', function () {
    it('should throw an exception when attempting to call loadInitialization While the setConfig function was not called, and parameters are undefined', function () {
        expect(webmSegmentBaseLoader.loadInitialization.bind(webmSegmentBaseLoader)).to.throw('setConfig function has to be called previously');
    });

    it('should throw an exception when attempting to call loadSegments While the setConfig function was not called, and parameters are undefined', function () {
        expect(webmSegmentBaseLoader.loadSegments.bind(webmSegmentBaseLoader)).to.throw('setConfig function has to be called previously');
    });

    it('should throw an exception when attempting to call setConfig with an empty config parameter or malformed', function () {
        expect(webmSegmentBaseLoader.setConfig.bind(webmSegmentBaseLoader, {})).to.throw('Missing config parameter(s)');
    });
});
