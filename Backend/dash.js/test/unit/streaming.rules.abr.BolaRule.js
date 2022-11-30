import BolaRule from '../../src/streaming/rules/abr/BolaRule';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';

import RulesContextMock from './mocks/RulesContextMock';

const expect = require('chai').expect;

const context = {};
const bolaRule = BolaRule(context).create({});
const rulesContextMock = new RulesContextMock();

describe('BolaRule', function () {
    it('should return an empty switchRequest when getMaxIndex function is called with an empty parameter', function () {
        const maxIndexRequest = bolaRule.getMaxIndex();

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an malformed parameter', function () {
        const maxIndexRequest = bolaRule.getMaxIndex({});

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an well formed parameter', function () {
        const maxIndexRequest = bolaRule.getMaxIndex(rulesContextMock);

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });
});
