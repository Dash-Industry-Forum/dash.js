import BufferLevelRule from '../../src/streaming/rules/scheduling/BufferLevelRule';

const expect = require('chai').expect;

const context = {};
const bufferLevelRule = BufferLevelRule(context).create();

describe('BufferLevelRule', function () {
    it('should return NaN if streamProcessor is undefined', function () {
        const result = bufferLevelRule.getBufferTarget();

        expect(result).to.be.NaN;  // jshint ignore:line
    });
});