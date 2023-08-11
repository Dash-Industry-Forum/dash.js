import DroppedFramesRule from '../../src/streaming/rules/abr/DroppedFramesRule.js';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest.js';
import RulesContextMock from './mocks/RulesContextMock.js';
import {expect} from 'chai';

const context = {};
const droppedFramesRule = DroppedFramesRule(context).create({});
const rulesContextMock = new RulesContextMock();

describe('DroppedFramesRule', function () {
    it('should return an empty switchRequest when getMaxIndex function is called with an empty parameter', function () {
        const maxIndexRequest = droppedFramesRule.getMaxIndex();

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an malformed parameter', function () {
        const maxIndexRequest = droppedFramesRule.getMaxIndex({});

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an well formed parameter', function () {
        const maxIndexRequest = droppedFramesRule.getMaxIndex(rulesContextMock);

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);
    });
});
