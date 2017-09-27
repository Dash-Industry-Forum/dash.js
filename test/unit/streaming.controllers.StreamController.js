import StreamController from '../../src/streaming/controllers/StreamController';

const chai = require('chai');
const expect = chai.expect;

const context = {};
const streamController = StreamController(context).getInstance();

describe('StreamController', function () {

    describe('streams array is empty', () => {

        it('should return null if getTimeRelativeToStreamId is called without parameters', () => {
            const time = streamController.getTimeRelativeToStreamId();

            expect(time).to.be.null; // jshint ignore:line
        });

        it('should return undefined if getStreamById is called without parameters', () => {
            const stream = streamController.getStreamById();

            expect(stream).to.be.undefined; // jshint ignore:line
        });

        it('should return null if getActiveStreamInfo is called without parameters, activeStream is undefined', () => {
            const activeStream = streamController.getActiveStreamInfo();

            expect(activeStream).to.be.null; // jshint ignore:line
        });

        it('should throw an exception when attempting to call initialize while setConfig has not been called', function () {
            expect(streamController.initialize.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call load while setConfig has not been called', function () {
            expect(streamController.load.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call load while setConfig has not been called properly - empty manifestLoader object', function () {
            streamController.setConfig({manifestLoader: {}});
            expect(streamController.load.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call loadWithManifest while initialize has not been called', function () {
            expect(streamController.loadWithManifest.bind(streamController)).to.throw('initialize function has to be called previously');
        });

        it('should throw an exception when attempting to call reset while setConfig has not been called', function () {
            expect(streamController.reset.bind(streamController)).to.throw('setConfig function has to be called previously');
        });

        it('should return an empty array when attempting to call getActiveStreamProcessors while no activeStream has been defined', function () {
            const activeStreamProcessorsArray = streamController.getActiveStreamProcessors();

            expect(activeStreamProcessorsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(activeStreamProcessorsArray).to.be.empty;                // jshint ignore:line
        });

        it('should return false when attempting to call isAudioTrackPresent while no activeStream has been defined', function () {
            const isAudioTrackPresent = streamController.isAudioTrackPresent();

            expect(isAudioTrackPresent).to.be.false;    // jshint ignore:line
        });

        it('should return false when attempting to call isVideoTrackPresent while no activeStream has been defined', function () {
            const isVideoTrackPresent = streamController.isVideoTrackPresent();

            expect(isVideoTrackPresent).to.be.false;    // jshint ignore:line
        });

        it('should return Infinity when attempting to call getActiveStreamCommonEarliestTime while no activeStream has been defined', function () {
            const earliestTime = streamController.getActiveStreamCommonEarliestTime();

            expect(earliestTime).to.be.Infinity;    // jshint ignore:line
        });
    });
});