import BufferLevelRule from '../../src/streaming/rules/scheduling/BufferLevelRule';

import StreamProcessorMock from './mocks/StreamProcessorMock';
import TextControllerMock from './mocks/TextControllerMock';

const expect = require('chai').expect;

const context = {};
const bufferLevelRule = BufferLevelRule(context).create({textController: new TextControllerMock()});

describe('BufferLevelRule', function () {
    it('should return NaN if streamProcessor is undefined', function () {
        const result = bufferLevelRule.getBufferTarget();

        expect(result).to.be.NaN;  // jshint ignore:line
    });

    it('should return 0 if streamProcessor is defined and current representation is fragmentedText, and subtitles are disabled', function () {
        const testType = 'fragmentedText';
        const streamInfo = {
            id: 'id'
        };
        const result = bufferLevelRule.getBufferTarget(new StreamProcessorMock(testType, streamInfo));

        expect(result).to.be.equal(0);  // jshint ignore:line
    });
});