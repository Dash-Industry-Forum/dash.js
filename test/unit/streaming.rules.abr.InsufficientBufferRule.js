import InsufficientBufferRule from '../../src/streaming/rules/abr/InsufficientBufferRule';

const expect = require('chai').expect;

const context = {};
const insufficientBufferRule = InsufficientBufferRule(context).create({});

describe('InsufficientBufferRule', function () {
    it('should return an empty switchRequest when getMaxIndex function is called with an empty parameter', function () {
        const maxIndexRequest = insufficientBufferRule.getMaxIndex();

        expect(maxIndexRequest.quality).to.be.equal(-1);  // jshint ignore:line
    });

    it('should return an empty switchRequest when getMaxIndex function is called with an malformed parameter', function () {
        const maxIndexRequest = insufficientBufferRule.getMaxIndex({});

        expect(maxIndexRequest.quality).to.be.equal(-1);  // jshint ignore:line
    });

    it('should throw an exception when attempting to call getMaxIndex While the config attribute has not been set properly', function () {
        expect(insufficientBufferRule.getMaxIndex.bind(insufficientBufferRule, {getMediaType: {}})).to.throw('Missing config parameter(s)');
    });
});