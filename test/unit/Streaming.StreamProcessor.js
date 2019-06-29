import StreamProcessor from '../../src/streaming/StreamProcessor';
import Constants from '../../src/streaming/constants/Constants';

const expect = require('chai').expect;

const context = {};

describe('StreamProcessor', function () {
    it('should return NaN when getIndexHandlerTime is called and streamProcessor is defined, without its attributes', function () {
        const streamProcessor = StreamProcessor(context).create({});
        const time = streamProcessor.getIndexHandlerTime();

        expect(time).to.be.NaN; // jshint ignore:line
    });

    it('should not throw an error when setIndexHandlerTime is called and indexHandler is undefined', function () {
        const streamProcessor = StreamProcessor(context).create({});

        expect(streamProcessor.setIndexHandlerTime.bind(streamProcessor)).to.not.throw();
    });

    it('should return null when getInitRequest is called and indexHandler is undefined', function () {
        const streamProcessor = StreamProcessor(context).create({});

        const initRequest = streamProcessor.getInitRequest(0);

        expect(initRequest).to.be.null;                // jshint ignore:line
    });

    it('should throw an error when getInitRequest is called and streamProcessor is defined, but quality is not a number', function () {
        const streamProcessor = StreamProcessor(context).create({});

        expect(streamProcessor.getInitRequest.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
    });

    it('should return null when getFragmentRequest is called and without parameters', function () {
        const streamProcessor = StreamProcessor(context).create({});

        const nextFragRequest = streamProcessor.getFragmentRequest();

        expect(nextFragRequest).to.be.null;                // jshint ignore:line
    });

    describe('representationController parameter is properly defined, without its attributes', () => {
        const streamProcessor = StreamProcessor(context).create({});

        it('should throw an error when getRepresentationInfo is called and representationController parameter is defined, but quality is not a number', function () {
            expect(streamProcessor.getRepresentationInfo.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });
    });
});