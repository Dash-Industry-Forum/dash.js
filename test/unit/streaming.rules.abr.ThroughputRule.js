import ThroughputRule from '../../src/streaming/rules/abr/ThroughputRule';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';

const expect = require('chai').expect;

const context = {};
const throughputRule = ThroughputRule(context).create({});

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
        expect(throughputRule.getMaxIndex.bind(throughputRule, {getMediaType: {}, getMediaInfo: {}, useBufferOccupancyABR: {}, getAbrController: {}, getStreamProcessor: {}})).to.throw('Missing config parameter(s)');
    });
});
