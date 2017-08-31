import Stream from '../../src/streaming/Stream';

const expect = require('chai').expect;

const context = {};

let stream = Stream(context).create({
  /*manifestModel: manifestModel,
  dashManifestModel: dashManifestModel,
  sourceBufferController: sourceBufferController,
  videoModel: videoModel,
  streamController: instance*/
  });

describe('Stream', function () {
    it('should return an empty array when getProcessors is called but streamProcessors attribute is an empty array', () => {
        const processors = stream.getProcessors();

        expect(processors).to.be.instanceOf(Array); // jshint ignore:line
        expect(processors).to.be.empty;            // jshint ignore:line
    });

    it('should return an NaN when getId is called but streamInfo attribute is null or undefined', () => {
        const id = stream.getId();

        expect(id).to.be.NaN; // jshint ignore:line
    });

    it('should return an NaN when getStartTime is called but streamInfo attribute is null or undefined', () => {
        const startTime = stream.getStartTime();

        expect(startTime).to.be.NaN;                // jshint ignore:line
    });

    it('should return an NaN when getDuration is called but streamInfo attribute is null or undefined', () => {
        const duration = stream.getDuration();

        expect(duration).to.be.NaN;                // jshint ignore:line
    });

    it('should throw an error when getBitrateListFor is called and config object has not been set properly', function () {
        expect(stream.getBitrateListFor.bind(stream)).to.be.throw('Missing config parameter(s)');
    });

    it('should throw an error when activate is called and config object has not been set properly', function () {
        expect(stream.activate.bind(stream)).to.be.throw('Missing config parameter(s)');
    });
});