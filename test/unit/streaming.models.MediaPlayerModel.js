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

    it('Method addABRCustomRule should throw an exception', function () {
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, 'unknownRuleType', 'newRuleName')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, true, 'newRuleName')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, ABRRulesCollection.ABANDON_FRAGMENT_RULES, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(mediaPlayerModel.addABRCustomRule.bind(mediaPlayerModel, ABRRulesCollection.ABANDON_FRAGMENT_RULES, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
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