import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel';
import {
    HTTPRequest
} from '../../src/streaming/vo/metrics/HTTPRequest';
import Settings from '../../src/core/Settings';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';

const chai = require('chai');
const expect = chai.expect;

describe('MediaPlayerModel', function () {
    const context = {};

    let mediaPlayerModel;
    let playbackController;
    let settings = Settings(context).getInstance();

    beforeEach(() => {
        settings.reset();
        playbackController = new PlaybackControllerMock();
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        mediaPlayerModel.setConfig({
            playbackController
        })
    });

    it('should configure FragmentLoaderRetryAttempts', function () {
        let FragmentLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
        expect(FragmentLoaderRetryAttempts).to.equal(3);

        const s = { streaming: { retryAttempts: {} } };
        s.streaming.retryAttempts[HTTPRequest.MEDIA_SEGMENT_TYPE] = 50;
        settings.update(s);

        FragmentLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
        expect(FragmentLoaderRetryAttempts).to.equal(50);
    });

    it('should configure FragmentLoaderRetryInterval', function () {
        let FragmentLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
        expect(FragmentLoaderRetryInterval).to.equal(1000);

        const s = { streaming: { retryIntervals: {} } };
        s.streaming.retryIntervals[HTTPRequest.MEDIA_SEGMENT_TYPE] = 50;
        settings.update(s);

        FragmentLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
        expect(FragmentLoaderRetryInterval).to.equal(50);
    });

    it('should configure ManifestLoaderRetryAttempts', function () {
        let manifestLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryAttempts).to.equal(3);

        const s = { streaming: { retryAttempts: {} } };
        s.streaming.retryAttempts[HTTPRequest.MPD_TYPE] = 50;
        settings.update(s);

        manifestLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryAttempts).to.equal(50);
    });

    it('should configure low latency retry attempt multiplication factor', function () {
        let manifestLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryAttempts).to.equal(3);

        const s = {
            streaming:
                {
                    retryAttempts: {
                        lowLatencyMultiplyFactor: 10
                    }
                }
        };
        settings.update(s);
        playbackController.setLowLatencyModeEnabled(true);

        manifestLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryAttempts).to.equal(30);
    });

    it('should configure ManifestLoaderRetryInterval', function () {
        let manifestLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryInterval).to.equal(500);

        const s = { streaming: { retryIntervals: {} } };
        s.streaming.retryIntervals[HTTPRequest.MPD_TYPE] = 50;
        settings.update(s);

        manifestLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryInterval).to.equal(50);
    });

    it('should configure low latency retry interval reduction factor', function () {
        let manifestLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryInterval).to.equal(500);

        const s = {
            streaming:
                {
                    retryIntervals: {
                        lowLatencyReductionFactor: 5
                    }
                }
        };
        settings.update(s);
        playbackController.setLowLatencyModeEnabled(true);

        manifestLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryInterval).to.equal(100);
    });

    it('should configure StableBufferTime', function () {
        const s = { streaming: { buffer: { stableBufferTime: 10 } } };
        settings.update(s);

        let StableBufferTime = mediaPlayerModel.getStableBufferTime();
        expect(StableBufferTime).to.equal(10);
    });

});
