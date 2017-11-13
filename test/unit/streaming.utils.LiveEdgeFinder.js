import LiveEdgeFinder from '../../src/streaming/utils/LiveEdgeFinder';

const expect = require('chai').expect;

const context = {};
let liveEdgeFinder;

describe('LiveEdgeFinder', function () {
    it('should throw an error when getLiveEdge is called and config object has not been set properly', function () {
        liveEdgeFinder = LiveEdgeFinder(context).create();
        expect(liveEdgeFinder.getLiveEdge.bind()).to.be.throw('Missing config parameter(s)');
    });

    it('should throw an error when getLiveEdge is called and config object has not been set properly', function () {
        liveEdgeFinder = LiveEdgeFinder(context).create({});
        expect(liveEdgeFinder.getLiveEdge.bind()).to.be.throw('Missing config parameter(s)');
    });
});