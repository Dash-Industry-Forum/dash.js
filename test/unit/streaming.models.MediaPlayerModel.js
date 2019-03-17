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
    const settings = Settings(context).getInstance();

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

        const s = { streaming: { retryAttempts: {}}};
        s.streaming.retryAttempts[HTTPRequest.MEDIA_SEGMENT_TYPE] = 50;
        settings.update(s);

        FragmentLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
        expect(FragmentLoaderRetryAttempts).to.equal(50);
    });

    it('should configure FragmentLoaderRetryInterval', function () {
        let FragmentLoaderRetryInterval =  mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
        expect(FragmentLoaderRetryInterval).to.equal(1000);

        const s = { streaming: { retryIntervals: {}}};
        s.streaming.retryIntervals[HTTPRequest.MEDIA_SEGMENT_TYPE] = 50;
        settings.update(s);

        FragmentLoaderRetryInterval =  mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MEDIA_SEGMENT_TYPE);
        expect(FragmentLoaderRetryInterval).to.equal(50);
    });

    it('should configure ManifestLoaderRetryAttempts', function () {
        let ManifestLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MPD_TYPE);
        expect(ManifestLoaderRetryAttempts).to.equal(3);

        const s = { streaming: { retryAttempts: {}}};
        s.streaming.retryAttempts[HTTPRequest.MPD_TYPE] = 50;
        settings.update(s);

        ManifestLoaderRetryAttempts = mediaPlayerModel.getRetryAttemptsForType(HTTPRequest.MPD_TYPE);
        expect(ManifestLoaderRetryAttempts).to.equal(50);
    });

    it('should configure ManifestLoaderRetryInterval', function () {
        let ManifestLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MPD_TYPE);
        expect(ManifestLoaderRetryInterval).to.equal(500);

        const s = { streaming: { retryIntervals: {}}};
        s.streaming.retryIntervals[HTTPRequest.MPD_TYPE] = 50;
        settings.update(s);

        ManifestLoaderRetryInterval = mediaPlayerModel.getRetryIntervalsForType(HTTPRequest.MPD_TYPE);
        expect(ManifestLoaderRetryInterval).to.equal(50);
    });

    it('should configure StableBufferTime', function () {
        const s = { streaming: { stableBufferTime: 50 } };
        settings.update(s);

        let StableBufferTime = mediaPlayerModel.getStableBufferTime();
        expect(StableBufferTime).to.equal(50);
    });
});