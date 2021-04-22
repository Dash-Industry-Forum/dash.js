import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel';
import Constants from '../../src/streaming/constants/Constants';
import {
    HTTPRequest
} from '../../src/streaming/vo/metrics/HTTPRequest';
import ABRRulesCollection from '../../src/streaming/rules/abr/ABRRulesCollection';
import Settings from '../../src/core/Settings';

const chai = require('chai');
const expect = chai.expect;

describe('MediaPlayerModel', function () {
    const context = {};
    const mediaPlayerModel = MediaPlayerModel(context).getInstance();
    let settings = Settings(context).getInstance();

    beforeEach(() => {
        settings.reset();
    });

    it('Method removeUTCTimingSource should throw an exception', function () {
        expect(mediaPlayerModel.removeUTCTimingSource.bind(mediaPlayerModel, true, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.removeUTCTimingSource.bind(mediaPlayerModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.removeUTCTimingSource.bind(mediaPlayerModel, 'string', true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.removeUTCTimingSource.bind(mediaPlayerModel, 'string', 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.removeUTCTimingSource.bind(mediaPlayerModel, true, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.removeUTCTimingSource.bind(mediaPlayerModel, 1, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method addUTCTimingSource should throw an exception', function () {
        expect(mediaPlayerModel.addUTCTimingSource.bind(mediaPlayerModel, true, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addUTCTimingSource.bind(mediaPlayerModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addUTCTimingSource.bind(mediaPlayerModel, 'string', true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addUTCTimingSource.bind(mediaPlayerModel, 'string', 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addUTCTimingSource.bind(mediaPlayerModel, true, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addUTCTimingSource.bind(mediaPlayerModel, 1, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method addABRCustomRule should throw an exception', function () {
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, 'unknownRuleType', 'newRuleName')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, true, 'newRuleName')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, ABRRulesCollection.ABANDON_FRAGMENT_RULES, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, ABRRulesCollection.ABANDON_FRAGMENT_RULES, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
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
                    lowLatencyEnabled: true,
                    retryAttempts: {
                        lowLatencyMultiplyFactor: 10
                    }
                }
        };
        settings.update(s);

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
                    lowLatencyEnabled: true,
                    retryIntervals: {
                        lowLatencyReductionFactor: 5
                    }
                }
        };
        settings.update(s);

        manifestLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MPD_TYPE);
        expect(manifestLoaderRetryInterval).to.equal(100);
    });

    it('should configure StableBufferTime', function () {
        const s = { streaming: { buffer: { stableBufferTime: 50 } } };
        settings.update(s);

        let StableBufferTime = mediaPlayerModel.getStableBufferTime();
        expect(StableBufferTime).to.equal(50);
    });

    it('should configure liveCatchupLatencyThreshold', function () {
        settings.update({ streaming: { liveCatchup: { latencyThreshold: NaN } } });
        let liveCatchupLatencyThreshold = mediaPlayerModel.getLiveCatchupLatencyThreshold();
        expect(liveCatchupLatencyThreshold).to.be.NaN; // jshint ignore:line

        settings.update({
            streaming: {
                lowLatencyEnabled: true,
                delay: { liveDelay: 3 },
                liveCatchup: { minDrift: 3 }
            }
        });

        liveCatchupLatencyThreshold = mediaPlayerModel.getLiveCatchupLatencyThreshold();
        expect(liveCatchupLatencyThreshold).to.equal(24);

        settings.update({ streaming: { liveCatchup: { minDrift: NaN } } });

        liveCatchupLatencyThreshold = mediaPlayerModel.getLiveCatchupLatencyThreshold();
        expect(liveCatchupLatencyThreshold).to.equal(12);

        settings.update({ streaming: { liveCatchup: { latencyThreshold: 50 } } });

        liveCatchupLatencyThreshold = mediaPlayerModel.getLiveCatchupLatencyThreshold();
        expect(liveCatchupLatencyThreshold).to.equal(50);
    });

});
