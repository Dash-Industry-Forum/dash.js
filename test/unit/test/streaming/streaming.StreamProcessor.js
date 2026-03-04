import StreamProcessor from '../../../../src/streaming/StreamProcessor.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import {expect} from 'chai';

Events.extend(MediaPlayerEvents);

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

        it('setEnhancementStreamProcessor should exist', function () {
            expect(streamProcessor.setEnhancementStreamProcessor).to.be.a('function');
        });

        it('setEnhancementStreamProcessor should not throw an error', function () {
            expect(streamProcessor.setEnhancementStreamProcessor.bind(streamProcessor, {})).to.not.throw();
        });

    });

});
