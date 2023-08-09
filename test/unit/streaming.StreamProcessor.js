import StreamProcessor from '../../src/streaming/StreamProcessor';
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

        it('setExplicitBufferingTime should not throw an error', function () {
            expect(streamProcessor.setExplicitBufferingTime.bind(streamProcessor)).to.not.throw();
        });

    });

});
