import ThroughputRule from '../../../../src/streaming/rules/abr/ThroughputRule.js';
import SwitchRequest from '../../../../src/streaming/rules/SwitchRequest.js';
import {expect} from 'chai';

const context = {};
const throughputRule = ThroughputRule(context).create({});

describe('ThroughputRule', function () {
    it('should return an empty switchRequest when getSwitchRequest function is called with an empty parameter', function () {
        const maxIndexRequest = throughputRule.getSwitchRequest();

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when getSwitchRequest function is called with an malformed parameter', function () {
        const maxIndexRequest = throughputRule.getSwitchRequest({});

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

});
