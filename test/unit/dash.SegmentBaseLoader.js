import SegmentBaseLoader from '../../src/dash/SegmentBaseLoader';

const expect = require('chai').expect;

const context = {};
const segmentBaseLoader = SegmentBaseLoader(context).getInstance();

describe('SegmentBaseLoader', function () {
    it('should throw an exception when attempting to call loadInitialization While the setConfig function was not called, and parameters are undefined', function () {
        expect(segmentBaseLoader.loadInitialization.bind(segmentBaseLoader)).to.throw('setConfig function has to be called previously');
    });

    it('should throw an exception when attempting to call loadSegments While the setConfig function was not called, and parameters are undefined', function () {
        expect(segmentBaseLoader.loadSegments.bind(segmentBaseLoader)).to.throw('setConfig function has to be called previously');
    });
});