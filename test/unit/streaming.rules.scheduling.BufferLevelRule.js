import BufferLevelRule from '../../src/streaming/rules/scheduling/BufferLevelRule';

import StreamProcessorMock from './mocks/StreamProcessorMock';
import TextControllerMock from './mocks/TextControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import MetricsModelMock from './mocks/MetricsModelMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';

const expect = require('chai').expect;

const context = {};
const bufferLevelRule = BufferLevelRule(context).create({textController: new TextControllerMock(),
                                                         dashMetrics: new DashMetricsMock(),
                                                         metricsModel: new MetricsModelMock(),
                                                         abrController: new AbrControllerMock(),
                                                         mediaPlayerModel: new MediaPlayerModelMock()});

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

    it('should return 15 (value returns by getCurrentBufferLevel of DashMetricsMock) if streamProcessor is defined and current representation is audio and videoTrackPresent is true', function () {
        const testType = 'audio';
        const streamInfo = {
            id: 'id'
        };
        const result = bufferLevelRule.getBufferTarget(new StreamProcessorMock(testType, streamInfo), true);

        expect(result).to.be.equal(15); // jshint ignore:line
    });

    it('should return 12 (DEFAULT_MIN_BUFFER_TIME of MediaPlayerModelMock) if streamProcessor is defined and current representation is audio and videoTrackPresent is false', function () {
        const testType = 'audio';
        const streamInfo = {
            id: 'id'
        };
        const result = bufferLevelRule.getBufferTarget(new StreamProcessorMock(testType, streamInfo), false);

        expect(result).to.be.equal(12); // jshint ignore:line
    });
});