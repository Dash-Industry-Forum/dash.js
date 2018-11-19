import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel';
import Constants from '../../src/streaming/constants/Constants';
import {
    HTTPRequest
} from '../../src/streaming/vo/metrics/HTTPRequest';
import ABRRulesCollection from '../../src/streaming/rules/abr/ABRRulesCollection';

const chai = require('chai');
const expect = chai.expect;

describe('MediaPlayerModel', function () {
    const context = {};
    const mediaPlayerModel = MediaPlayerModel(context).getInstance();

    it('should not set a value to lowLatencyEnabled attribute that is not a boolean type', function () {
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(false);
        expect(mediaPlayerModel.setLowLatencyEnabled.bind(mediaPlayerModel, undefined)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(false);
        expect(mediaPlayerModel.setLowLatencyEnabled.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(false);
        mediaPlayerModel.setLowLatencyEnabled(true);
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(true);
    });

    it('setCatchUpPlaybackRate should throw an exception if input argument is not a number or out of 0-0.5 range', function () {
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(0.9);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(13);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(0.1);}).to.not.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate('string');}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(true);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(() => {mediaPlayerModel.setCatchUpPlaybackRate(false);}).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('should not set a value to fastSwitchEnabled attribute that is not a boolean type', function () {
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(false);
        expect(mediaPlayerModel.setFastSwitchEnabled.bind(mediaPlayerModel, undefined)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(false);
        expect(mediaPlayerModel.setFastSwitchEnabled.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(false);
        mediaPlayerModel.setFastSwitchEnabled(true);
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(true);
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

    it('Method setKeepProtectionMediaKeys should throw an exception', function () {
        expect(mediaPlayerModel.setKeepProtectionMediaKeys.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setKeepProtectionMediaKeys.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setJumpGaps should throw an exception', function () {
        expect(mediaPlayerModel.setJumpGaps.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setJumpGaps.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setRetryIntervalForType should throw an exception', function () {
        expect(mediaPlayerModel.setRetryIntervalForType.bind(mediaPlayerModel, HTTPRequest.MPD_TYPE, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryIntervalForType.bind(mediaPlayerModel, HTTPRequest.MPD_TYPE, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setBufferAheadToKeep should throw an exception', function () {
        expect(mediaPlayerModel.setBufferAheadToKeep.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setBufferAheadToKeep.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setUseManifestDateHeaderTimeSource should throw an exception', function () {
        expect(mediaPlayerModel.setUseManifestDateHeaderTimeSource.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setUseManifestDateHeaderTimeSource.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setBufferToKeep should throw an exception', function () {
        expect(mediaPlayerModel.setBufferToKeep.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setBufferToKeep.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setBufferPruningInterval should throw an exception', function () {
        expect(mediaPlayerModel.setBufferPruningInterval.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setBufferPruningInterval.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setRetryAttemptsForType should throw an exception', function () {
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, HTTPRequest.MPD_TYPE, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, HTTPRequest.MEDIA_SEGMENT_TYPE, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, 'text', 10)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, 1, 10)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setRetryAttemptsForType.bind(mediaPlayerModel, true, 10)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setBandwidthSafetyFactor should throw an exception', function () {
        expect(mediaPlayerModel.setBandwidthSafetyFactor.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setBandwidthSafetyFactor.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setSegmentOverlapToleranceTime should throw an exception', function () {
        expect(mediaPlayerModel.setSegmentOverlapToleranceTime.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setSegmentOverlapToleranceTime.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setCacheLoadThresholdForType should throw an exception', function () {
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, Constants.AUDIO, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, Constants.AUDIO, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, true, 5)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, 1, 5)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setCacheLoadThresholdForType.bind(mediaPlayerModel, 'text', 5)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setStableBufferTime should throw an exception', function () {
        expect(mediaPlayerModel.setStableBufferTime.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setStableBufferTime.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setBufferTimeAtTopQuality should throw an exception', function () {
        expect(mediaPlayerModel.setBufferTimeAtTopQuality.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setBufferTimeAtTopQuality.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setSmallGapLimit should throw an exception', function () {
        expect(mediaPlayerModel.setSmallGapLimit.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setSmallGapLimit.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setBufferTimeAtTopQualityLongForm should throw an exception', function () {
        expect(mediaPlayerModel.setBufferTimeAtTopQualityLongForm.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setBufferTimeAtTopQualityLongForm.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setLongFormContentDurationThreshold should throw an exception', function () {
        expect(mediaPlayerModel.setLongFormContentDurationThreshold.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLongFormContentDurationThreshold.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setManifestUpdateRetryInterval should throw an exception', function () {
        expect(mediaPlayerModel.setManifestUpdateRetryInterval.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setManifestUpdateRetryInterval.bind(mediaPlayerModel, 'true')).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setAbandonLoadTimeout should throw an exception', function () {
        expect(mediaPlayerModel.setAbandonLoadTimeout.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setAbandonLoadTimeout.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setUseDefaultABRRules should throw an exception', function () {
        expect(mediaPlayerModel.setUseDefaultABRRules.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setUseDefaultABRRules.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setUseSuggestedPresentationDelay should throw an exception', function () {
        expect(mediaPlayerModel.setUseSuggestedPresentationDelay.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setUseSuggestedPresentationDelay.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setWallclockTimeUpdateInterval should throw an exception', function () {
        expect(mediaPlayerModel.setWallclockTimeUpdateInterval.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setWallclockTimeUpdateInterval.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setScheduleWhilePaused should throw an exception', function () {
        expect(mediaPlayerModel.setScheduleWhilePaused.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setScheduleWhilePaused.bind(mediaPlayerModel, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setLiveDelayFragmentCount should throw an exception', function () {
        expect(mediaPlayerModel.setLiveDelayFragmentCount.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLiveDelayFragmentCount.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method setLiveDelay should throw an exception', function () {
        expect(mediaPlayerModel.setLiveDelay.bind(mediaPlayerModel, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.setLiveDelay.bind(mediaPlayerModel, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
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
});