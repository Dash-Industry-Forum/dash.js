import ThroughputRule from '../../src/streaming/rules/abr/ThroughputRule';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';
import Constants from '../../src/streaming/constants/Constants';

import RulesContextMock from './mocks/RulesContextMock';

const expect = require('chai').expect;

const context = {};
const throughputRule = ThroughputRule(context).create({});
const rulesContextMock = new RulesContextMock();

describe('ThroughputRule', function () {
    it('should return an empty switchRequest when getMaxIndex function is called with an empty parameter', function () {
        const maxIndexRequest = throughputRule.getMaxIndex();

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an malformed parameter', function () {
        const maxIndexRequest = throughputRule.getMaxIndex({});

        expect(maxIndexRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should throw an exception when attempting to call getMaxIndex While the config attribute has not been set properly', function () {
        expect(throughputRule.getMaxIndex.bind(throughputRule, rulesContextMock)).to.throw(Constants.MISSING_CONFIG_ERROR);
    });
});
