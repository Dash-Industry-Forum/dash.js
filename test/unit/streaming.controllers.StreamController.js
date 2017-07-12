import StreamController from '../../src/streaming/controllers/StreamController';

const chai = require('chai');
const expect = chai.expect;

const context = {};
const streamController = StreamController(context).getInstance();

describe('StreamController', function () {

    describe('streams array is empty', () => {

        it('should return null if getTimeRelativeToStreamId is called without parameters', () => {
            const time = streamController.getTimeRelativeToStreamId();

            expect(time).to.be.null; // jshint ignore:line*/
        });

        it('should return undefined if getStreamById is called without parameters', () => {
            const streamId = streamController.getStreamById();

            expect(streamId).to.be.undefined; // jshint ignore:line*/
        });

        it('should return null if getActiveStreamInfo is called without parameters, activeStream is undefined', () => {
            const activeStream = streamController.getActiveStreamInfo();

            expect(activeStream).to.be.null; // jshint ignore:line*/
        });

        it("should throw an exception when attempting to call load while setConfig has not been called", function () {
            expect(streamController.load.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it("should throw an exception when attempting to call loadWithManifest while setConfig has not been called", function () {
            expect(streamController.loadWithManifest.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it("should throw an exception when attempting to call reset while setConfig has not been called", function () {
            expect(streamController.reset.bind(streamController)).to.throw('setConfig function has to be called previously');
        });
    });
});