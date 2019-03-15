import DroppedFramesRule from '../../src/streaming/rules/abr/DroppedFramesRule';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';

import RulesContextMock from './mocks/RulesContextMock';

const expect = require('chai').expect;

const context = {};
const droppedFramesRule = DroppedFramesRule(context).create({});
const rulesContextMock = new RulesContextMock();

describe('DroppedFramesRule', function () {
    it('should return an empty switchRequest when getMaxIndex function is called with an empty parameter', function () {
        const maxIndexRequest = droppedFramesRule.getMaxIndex();

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an malformed parameter', function () {
        const maxIndexRequest = droppedFramesRule.getMaxIndex({});

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an well formed parameter', function () {
        const maxIndexRequest = droppedFramesRule.getMaxIndex(rulesContextMock);

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });
});
