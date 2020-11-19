import BufferLevelRule from '../../src/streaming/rules/scheduling/BufferLevelRule';

import TextControllerMock from './mocks/TextControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;

const context = {};
const textControllerMock = new TextControllerMock();
const settings = Settings(context).getInstance();
const bufferLevelRule = BufferLevelRule(context).create({
    textController: textControllerMock,
    dashMetrics: new DashMetricsMock(),
    abrController: new AbrControllerMock(),
    mediaPlayerModel: new MediaPlayerModelMock(),
    hasVideoTrack: true,
    settings: settings
});

describe('BufferLevelRule', function () {
    const testAudioType = 'audio';
    const testFragmentedTextType = 'fragmentedText';
    const streamInfo = {
        id: 'id'
    };
    const representationInfo = {
        mediaInfo: {
            type: testAudioType,
            streamInfo: streamInfo
        },
        fragmentDuration: 6
    };

    afterEach(function () {
        settings.reset();
    });

    it('should return NaN if type is undefined', function () {
        const result = bufferLevelRule.getBufferTarget();
        expect(result).to.be.NaN;  // jshint ignore:line
    });

    it('should return NaN if representationInfo is undefined', function () {
        const result = bufferLevelRule.getBufferTarget(testAudioType);
        expect(result).to.be.NaN;  // jshint ignore:line
    });

    it('should return 0 if streamProcessor is defined and current representation is fragmentedText, and subtitles are disabled', function () {
        const result = bufferLevelRule.getBufferTarget(testFragmentedTextType, representationInfo);
        expect(result).to.be.equal(0);  // jshint ignore:line
    });

    it('should return 6 (value returns by currentRepresentationInfo.fragmentDuration) if streamProcessor is defined and current representation is fragmentedText, and subtitles are enabled', function () {
        textControllerMock.enableText(true);
        const result = bufferLevelRule.getBufferTarget(testFragmentedTextType, representationInfo);
        expect(result).to.be.equal(6);  // jshint ignore:line
    });

    it('should return 15 (value returns by getCurrentBufferLevel of DashMetricsMock) if streamProcessor is defined and current representation is audio and videoTrackPresent is true', function () {
        const result = bufferLevelRule.getBufferTarget(testAudioType, representationInfo, true);
        expect(result).to.be.equal(15); // jshint ignore:line
    });

    it('should return 12 (DEFAULT_MIN_BUFFER_TIME of MediaPlayerModelMock) if streamProcessor is defined and current representation is audio and videoTrackPresent is false', function () {
        const result = bufferLevelRule.getBufferTarget(testAudioType, representationInfo, false);
        expect(result).to.be.equal(12); // jshint ignore:line
    });

    it('should return true if representationInfo is undefined', function () {
        const result = bufferLevelRule.execute();
        expect(result).to.be.true;  // jshint ignore:line
    });

    it('should return false if representationInfo is defined', function () {
        const result = bufferLevelRule.execute(testAudioType, representationInfo);
        expect(result).to.be.false;  // jshint ignore:line
    });
});
