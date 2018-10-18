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

    it('setCatchUpPlaybackRate should throw an exception if input argument is not a number or out of 0-0.5 range', function () {
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(0.9);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(13);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(0.1);}).to.not.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate('string');}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(true);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(false);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
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

    it('Method setRetryIntervalForType should throw an exception', function () {
        expect(mediaPlayerModel.setRetryIntervalForType.bind(mediaPlayerModel, HTTPRequest.MPD_TYPE, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryIntervalForType.bind(mediaPlayerModel, HTTPRequest.MPD_TYPE, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setRetryAttemptsForType should throw an exception', function () {
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, HTTPRequest.MPD_TYPE, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, HTTPRequest.MEDIA_SEGMENT_TYPE, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, 'text', 10)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, 1, 10)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, true, 10)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setCacheLoadThresholdForType should throw an exception', function () {
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, Constants.AUDIO, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, Constants.AUDIO, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, true, 5)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, 1, 5)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, 'text', 5)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method addABRCustomRule should throw an exception', function () {
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, 'unknownRuleType', 'newRuleName')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, true, 'newRuleName')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, ABRRulesCollection.ABANDON_FRAGMENT_RULES, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, ABRRulesCollection.ABANDON_FRAGMENT_RULES, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setLastBitrateCachingInfo should throw an exception if needed', function () {
        expect(mediaPlayerModel.setLastBitrateCachingInfo.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastBitrateCachingInfo.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastBitrateCachingInfo.bind(mediaPlayerModel, true, NaN)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastBitrateCachingInfo.bind(mediaPlayerModel, true, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastBitrateCachingInfo.bind(mediaPlayerModel, true, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);

        let lastBitrateCachingInfo = mediaPlayerModel.getLastBitrateCachingInfo();

        expect(lastBitrateCachingInfo.enabled).to.be.equal(true);
        expect(lastBitrateCachingInfo.ttl).to.be.equal(360000);

        mediaPlayerModel.setLastBitrateCachingInfo(false, 40);

        lastBitrateCachingInfo = mediaPlayerModel.getLastBitrateCachingInfo();

        expect(lastBitrateCachingInfo.enabled).to.be.equal(false);
        expect(lastBitrateCachingInfo.ttl).to.be.equal(40);

        mediaPlayerModel.setLastBitrateCachingInfo(true);

        expect(lastBitrateCachingInfo.enabled).to.be.equal(true);
        expect(lastBitrateCachingInfo.ttl).to.be.equal(40);
    });

    it('Method setLastMediaSettingsCachingInfo should throw an exception if needed', function () {
        expect(mediaPlayerModel.setLastMediaSettingsCachingInfo.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastMediaSettingsCachingInfo.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastMediaSettingsCachingInfo.bind(mediaPlayerModel, true, NaN)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastMediaSettingsCachingInfo.bind(mediaPlayerModel, true, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLastMediaSettingsCachingInfo.bind(mediaPlayerModel, true, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);

        let lastMediaSettingsCachingInfo = mediaPlayerModel.getLastMediaSettingsCachingInfo();

        expect(lastMediaSettingsCachingInfo.enabled).to.be.equal(true);
        expect(lastMediaSettingsCachingInfo.ttl).to.be.equal(360000);

        mediaPlayerModel.setLastMediaSettingsCachingInfo(false, 40);

        lastMediaSettingsCachingInfo = mediaPlayerModel.getLastMediaSettingsCachingInfo();

        expect(lastMediaSettingsCachingInfo.enabled).to.be.equal(false);
        expect(lastMediaSettingsCachingInfo.ttl).to.be.equal(40);

        mediaPlayerModel.setLastMediaSettingsCachingInfo(true);

        expect(lastMediaSettingsCachingInfo.enabled).to.be.equal(true);
        expect(lastMediaSettingsCachingInfo.ttl).to.be.equal(40);
    });

    it('should configure LiveDelay', function () {
        const s = { streaming: { liveDelay: 5 }};
        settings.update(s);

        let livedelay = mediaPlayerModel.getLiveDelay();
        expect(livedelay).to.equal(5);
    });

    it('should configure StableBufferTime', function () {
        const s = { streaming: { stableBufferTime: 50 } };
        settings.update(s);

        let StableBufferTime = mediaPlayerModel.getStableBufferTime();
        expect(StableBufferTime).to.equal(50);
    });
});