import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel';
import {
    HTTPRequest
} from '../../src/streaming/vo/metrics/HTTPRequest';
import Settings from '../../src/core/Settings';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import ServiceDescriptionController from '../../src/dash/controllers/ServiceDescriptionController';

const chai = require('chai');
const expect = chai.expect;

describe('MediaPlayerModel', function () {
    const context = {};

    let mediaPlayerModel;
    let playbackController;
    let serviceDescriptionController = ServiceDescriptionController(context).getInstance();
    let settings = Settings(context).getInstance();
    let dummyManifestInfo;

    beforeEach(() => {
        settings.reset();
        playbackController = new PlaybackControllerMock();
        serviceDescriptionController.reset();
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        mediaPlayerModel.setConfig({
            playbackController,
            serviceDescriptionController
        })
        dummyManifestInfo = {
            serviceDescriptions: [{
                latency: {
                    target: 5000,
                    max: 8000,
                    min: 3000
                },
                playbackRate: {
                    max: 1.4,
                    min: 0.5
                },
                operatingBandwidth: {
                    mediaType: 'any',
                    max: 9000000,
                    min: 1000000,
                    target: 5000000
                }
            }]
        }
    });

    it('Should return max drift if specified in the settings', () => {
        settings.update({ streaming: { liveCatchup: { maxDrift: 30 } } });
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const maxDrift = mediaPlayerModel.getCatchupMaxDrift();

        expect(maxDrift).to.be.equal(30);
    })

    it('Should return max drift if specified in Service Description', () => {
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const maxDrift = mediaPlayerModel.getCatchupMaxDrift();

        expect(maxDrift).to.be.equal(3.5);
    })

    it('Should return default max drift', () => {
        const maxDrift = mediaPlayerModel.getCatchupMaxDrift();

        expect(maxDrift).to.not.be.NaN;
    })

    it('Should return catchup playback rates if specified in the settings', () => {
        settings.update({ streaming: { liveCatchup: { playbackRate: { max: 0.3, min: -0.2 }} } });
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(0.3);
        expect(playbackRates.min).to.be.equal(-0.2);
    });

    it('Should set playbackRate.min to 0 if only playbackRate.max is specified in the settings', () => {
        settings.update({ streaming: { liveCatchup: { playbackRate: { max: 0.3 }} } });
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(0.3);
        expect(playbackRates.min).to.be.equal(0);
    });

    it('Should set playbackRate.max to 0 if only playbackRate.min is specified in the settings', () => {
        settings.update({ streaming: { liveCatchup: { playbackRate: { min: -0.2 }} } });
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(0);
        expect(playbackRates.min).to.be.equal(-0.2);
    });

    it('Should return catchup playback rates if specified in Service Description', () => {
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(0.4);
        expect(playbackRates.min).to.be.equal(-0.5);
    })

    it('Should limit catchup playback rates from service description if they are beyond the rate thresholds', () => {
        dummyManifestInfo.serviceDescriptions[0].playbackRate.max = 2.5;
        dummyManifestInfo.serviceDescriptions[0].playbackRate.min = 0.1;
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(1);
        expect(playbackRates.min).to.be.equal(-0.5);
    });

    it('Should limit catchup playback rates from settings if they are beyond the rate thresholds', () => {
        settings.update({ streaming: { liveCatchup: { playbackRate: { min: -0.8, max: 2.5 }} } });
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(1);
        expect(playbackRates.min).to.be.equal(-0.5);
    });


    it('Should set catchup playback rates from service description to 0 if the sign of the set values is incorrect', () => {
        // i.e. if max rate is incorrectly negative, or min rate is incorrectly positive
        dummyManifestInfo.serviceDescriptions[0].playbackRate.max = -2.0;
        dummyManifestInfo.serviceDescriptions[0].playbackRate.min = 1.5;
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(0);
        expect(playbackRates.min).to.be.equal(0);
    });

    it('Should set catchup playback rates from settings to 0 if the sign of the set values is incorrect', () => {
        // i.e. if max rate is incorrectly negative, or min rate is incorrectly positive
        settings.update({ streaming: { liveCatchup: { playbackRate: { min: 1.5, max: -2.0 }} } });
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(0);
        expect(playbackRates.min).to.be.equal(0);
    });

    it('Should return default catchup playback rates', () => {
        const playbackRates = mediaPlayerModel.getCatchupPlaybackRates();

        expect(playbackRates.max).to.be.equal(0.5);
        expect(playbackRates.min).to.be.equal(-0.5);
    })

    it('Should return abr bitrate parameter if specified in the settings', () => {
        settings.update({
            streaming: {
                abr: {
                    maxBitrate: { audio: 1, video: 2 },
                    minBitrate: { audio: 3, video: 4 },
                    initialBitrate: { audio: 5, video: 6 }
                }
            }
        });
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        let value = mediaPlayerModel.getAbrBitrateParameter('maxBitrate','audio');
        expect(value).to.be.equal(1);
        value = mediaPlayerModel.getAbrBitrateParameter('maxBitrate','video');
        expect(value).to.be.equal(2);
        value = mediaPlayerModel.getAbrBitrateParameter('minBitrate','audio');
        expect(value).to.be.equal(3);
        value = mediaPlayerModel.getAbrBitrateParameter('minBitrate','video');
        expect(value).to.be.equal(4);
        value = mediaPlayerModel.getAbrBitrateParameter('initialBitrate','audio');
        expect(value).to.be.equal(5);
        value = mediaPlayerModel.getAbrBitrateParameter('initialBitrate','video');
        expect(value).to.be.equal(6);
    })

    it('Should return abr bitrate parameter if specified via Service Description', () => {
        serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
        let value = mediaPlayerModel.getAbrBitrateParameter('maxBitrate','audio');
        expect(value).to.be.equal(9000);
        value = mediaPlayerModel.getAbrBitrateParameter('maxBitrate','video');
        expect(value).to.be.equal(9000);
        value = mediaPlayerModel.getAbrBitrateParameter('minBitrate','audio');
        expect(value).to.be.equal(1000);
        value = mediaPlayerModel.getAbrBitrateParameter('minBitrate','video');
        expect(value).to.be.equal(1000);
        value = mediaPlayerModel.getAbrBitrateParameter('initialBitrate','audio');
        expect(value).to.be.equal(5000);
        value = mediaPlayerModel.getAbrBitrateParameter('initialBitrate','video');
        expect(value).to.be.equal(5000);
    })

    it('Should return -1 for abr bitrate parameters if not specified', () => {
        let value = mediaPlayerModel.getAbrBitrateParameter('maxBitrate','audio');
        expect(value).to.be.equal(-1);
        value = mediaPlayerModel.getAbrBitrateParameter('maxBitrate','video');
        expect(value).to.be.equal(-1);
        value = mediaPlayerModel.getAbrBitrateParameter('minBitrate','audio');
        expect(value).to.be.equal(-1);
        value = mediaPlayerModel.getAbrBitrateParameter('minBitrate','video');
        expect(value).to.be.equal(-1);
        value = mediaPlayerModel.getAbrBitrateParameter('initialBitrate','audio');
        expect(value).to.be.equal(-1);
        value = mediaPlayerModel.getAbrBitrateParameter('initialBitrate','video');
        expect(value).to.be.equal(-1);
    })

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

        let stableBufferTime = mediaPlayerModel.getStableBufferTime();
        expect(stableBufferTime).to.equal(10);
    });

    it('should configure initial buffer level', function () {
        const s = { streaming: { buffer: { initialBufferLevel: 8 } } };
        settings.update(s);

        let value = mediaPlayerModel.getInitialBufferLevel();
        expect(value).to.equal(8);
    });

    it('should configure initial buffer level with stable buffer time lower than initial buffer level', function () {
        const stableBufferTime = settings.get().streaming.buffer.stableBufferTime;
        const s = { streaming: { buffer: { initialBufferLevel: stableBufferTime + 10 } } };
        settings.update(s);

        let value = mediaPlayerModel.getInitialBufferLevel();
        expect(value).to.equal(stableBufferTime);
    });

});
