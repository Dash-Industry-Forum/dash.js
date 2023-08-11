import StreamProcessor from '../../src/streaming/StreamProcessor.js';
import Constants from '../../src/streaming/constants/Constants.js';
import {expect} from 'chai';

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

        it('setExplicitBufferingTime should not throw an error', function () {
            expect(streamProcessor.setExplicitBufferingTime.bind(streamProcessor)).to.not.throw();
        });

        it('getRepresentationInfo should throw an error when quality is not a number', function () {
            expect(streamProcessor.getRepresentationInfo.bind(streamProcessor, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });
    });

});
