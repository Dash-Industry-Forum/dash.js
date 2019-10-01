import InsufficientBufferRule from '../../src/streaming/rules/abr/InsufficientBufferRule';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';
import Constants from '../../src/streaming/constants/Constants';

import DashMetricsMock from './mocks/DashMetricsMock';

const expect = require('chai').expect;

const context = {};
let insufficientBufferRule;

describe('InsufficientBufferRule', function () {
    beforeEach(function () {
        insufficientBufferRule = InsufficientBufferRule(context).create({});
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an empty parameter', function () {
        const maxIndexRequest = insufficientBufferRule.getMaxIndex();

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an malformed parameter', function () {
        const maxIndexRequest = insufficientBufferRule.getMaxIndex({});

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should throw an exception when attempting to call getMaxIndex While the config attribute has not been set properly', function () {
        expect(insufficientBufferRule.getMaxIndex.bind(insufficientBufferRule, {getMediaType: {}})).to.throw(Constants.MISSING_CONFIG_ERROR);
    });

    it('should return an empty switch request when bufferState is empty', function () {
        const dashMetricsMock = new DashMetricsMock();
        const rulesContextMock = {
            getMediaInfo: function () {},
            getMediaType: function () { return 'video'; },
            getAbrController: function () {},
            getRepresentationInfo: function () { return { fragmentDuration: 4 };}
        };
        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock
        });

        const maxIndexRequest = rule.getMaxIndex(rulesContextMock);
        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switch request when first call is done with a buffer in state bufferStalled', function () {
        const dashMetricsMock = new DashMetricsMock();
        let bufferState = {
            state: 'bufferStalled'
        };
        const rulesContextMock = {
            getMediaInfo: function () {},
            getMediaType: function () { return 'video'; },
            getAbrController: function () {},
            getRepresentationInfo: function () { return { fragmentDuration: 4 };}
        };
        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock
        });
        dashMetricsMock.addBufferState('video', bufferState);
        let maxIndexRequest = rule.getMaxIndex(rulesContextMock);
        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switch request when first call is done with a buffer in state bufferLoaded and fragmentDuration is NaN', function () {
        const dashMetricsMock = new DashMetricsMock();
        let bufferState = {
            state: 'bufferLoaded'
        };
        const rulesContextMock = {
            getMediaInfo: function () {},
            getMediaType: function () { return 'video'; },
            getAbrController: function () {},
            getRepresentationInfo: function () { return { fragmentDuration: NaN };}
        };
        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock
        });
        dashMetricsMock.addBufferState('video', bufferState);
        const maxIndexRequest = rule.getMaxIndex(rulesContextMock);
        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return index 0 when first call is done with a buffer in state bufferLoaded and fragmentDuration is NaN and then bufferStalled with fragmentDuration > 0', function () {
        let bufferState = {
            state: 'bufferLoaded'
        };
        let representationInfo = { fragmentDuration: NaN };
        const dashMetricsMock = new DashMetricsMock();
        const rulesContextMock = {
            getMediaInfo: function () {},
            getMediaType: function () { return 'video'; },
            getAbrController: function () {},
            getRepresentationInfo: function () { return representationInfo;}
        };

        dashMetricsMock.addBufferState('video', bufferState);

        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock
        });

        rule.getMaxIndex(rulesContextMock);

        bufferState.state = 'bufferStalled';
        dashMetricsMock.addBufferState('video', bufferState);
        representationInfo.fragmentDuration = 4;
        const maxIndexRequest = rule.getMaxIndex(rulesContextMock);
        expect(maxIndexRequest.quality).to.be.equal(0);
    });
});