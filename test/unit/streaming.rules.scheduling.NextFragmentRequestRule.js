import NextFragmentRequestRule from '../../src/streaming/rules/scheduling/NextFragmentRequestRule';

import TextControllerMock from './mocks/TextControllerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';

const expect = require('chai').expect;

const context = {};
const nextFragmentRequestRule = NextFragmentRequestRule(context).create({textController: new TextControllerMock(),
                                                                         playbackController: new PlaybackControllerMock()});

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
        const result = nextFragmentRequestRule.execute(new StreamProcessorMock(testType, streamInfo), 1);

        expect(result).to.be.null;  // jshint ignore:line
    });

    it('should return a mock request (duration of 2 seconds, and startTime of 0) if streamProcessor is defined and current representation is audio, with requestToReplace defined', function () {
        const testType = 'audio';
        const streamInfo = {
            id: 'id'
        };
        const request = nextFragmentRequestRule.execute(new StreamProcessorMock(testType, streamInfo), 1,{startTime: 0, duration: 1});

        expect(request.startTime).to.be.equal(0);  // jshint ignore:line
        expect(request.duration).to.be.equal(2);  // jshint ignore:line
    });

    it('should return a mock request (duration of 2 seconds, and startTime of 0) if streamProcessor is defined and current representation is audio, with requestToReplace is undefined', function () {
        const testType = 'audio';
        const streamInfo = {
            id: 'id'
        };
        const request = nextFragmentRequestRule.execute(new StreamProcessorMock(testType, streamInfo), 1);

        expect(request.startTime).to.be.equal(0);  // jshint ignore:line
        expect(request.duration).to.be.equal(2);  // jshint ignore:line
    });
});