import NextFragmentRequestRule from '../../src/streaming/rules/scheduling/NextFragmentRequestRule';

import TextControllerMock from './mocks/TextControllerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import AdapterMock from './mocks/AdapterMock';

const expect = require('chai').expect;

const context = {};
const nextFragmentRequestRule = NextFragmentRequestRule(context).create({adapter: new AdapterMock(), textController: new TextControllerMock()});

describe('NextFragmentRequestRule', function () {
    it('should return null if streamProcessor is undefined', function () {
        const result = nextFragmentRequestRule.execute();

        expect(result).to.be.null;  // jshint ignore:line
    });

    it('should return null if streamProcessor is defined and current representation is fragmentedText, and subtitles are disabled', function () {
        const testType = 'fragmentedText';
        const streamInfo = {
            id: 'id'
        };
        const result = nextFragmentRequestRule.execute(new StreamProcessorMock(testType, streamInfo));

        expect(result).to.be.null;  // jshint ignore:line
    });
});