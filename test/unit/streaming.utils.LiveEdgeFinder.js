import LiveEdgeFinder from '../../src/streaming/utils/LiveEdgeFinder';

const expect = require('chai').expect;

const context = {};
const liveEdgeFinder = LiveEdgeFinder(context).create({});

describe('LiveEdgeFinder', function () {
    it('should throw an error when getLiveEdge is called and config object has not been set properly', function () {
        expect(liveEdgeFinder.getLiveEdge.bind()).to.be.throw('Missing config parameter(s)');
    });
});