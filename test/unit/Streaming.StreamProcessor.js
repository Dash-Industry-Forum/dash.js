import StreamProcessor from '../../src/streaming/StreamProcessor';
import Constants from '../../src/streaming/constants/Constants';
const expect = require('chai').expect;
const context = {};

const streamInfo = {
    id: 'streamId',
    manifestInfo: {
        isDynamic: true
    }
};

describe('StreamProcessor', function () {
    describe('StreamProcessor not initialized', function () {
        let streamProcessor = null;

        beforeEach(function () {
            streamProcessor = StreamProcessor(context).create({streamInfo: streamInfo});
        });

        afterEach(function () {
            streamProcessor.reset();
        });

        it('setBufferingTime should not throw an error', function () {
            expect(streamProcessor.setBufferingTime.bind(streamProcessor)).to.not.throw();
        });

        it('getInitRequest should return null', function () {
            const initRequest = streamProcessor.getInitRequest(0);
            expect(initRequest).to.be.null; // jshint ignore:line
        });

        it('getInitRequest should throw an error when quality is not a number', function () {
            expect(streamProcessor.getInitRequest.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });

        it('getFragmentRequest should return null', function () {
            const nextFragRequest = streamProcessor.getFragmentRequest();
            expect(nextFragRequest).to.be.null; // jshint ignore:line
        });

        it('getRepresentationInfo should throw an error when quality is not a number', function () {
            expect(streamProcessor.getRepresentationInfo.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });
    });

});
