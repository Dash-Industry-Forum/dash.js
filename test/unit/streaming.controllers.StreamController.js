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

        it('should return null if getStreamById is called without parameters', () => {
            const streamId = streamController.getStreamById();

            expect(streamId).to.be.null; // jshint ignore:line*/
        });

        it('should return null if getActiveStreamInfo is called without parameters, activeStream is undefined', () => {
            const activeStream = streamController.getActiveStreamInfo();

            expect(activeStream).to.be.null; // jshint ignore:line*/
        });
    });
});