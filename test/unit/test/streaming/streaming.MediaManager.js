import MediaManager from '../../../../src/streaming/MediaManager.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import DebugMock from '../../mocks/DebugMock.js';
import { expect } from 'chai';

describe('MediaManager', function () {
    const mediaManager = MediaManager().getInstance();
    let videoModelMock;
    let playbackControllerMock;
    let debugMock;

    beforeEach(function () {
        videoModelMock = new VideoModelMock();
        playbackControllerMock = new PlaybackControllerMock();
        debugMock = new DebugMock();

        mediaManager.setConfig({
            videoModel: videoModelMock,
            playbackController: playbackControllerMock,
            debug: debugMock,
            hideAlternativePlayerControls: false,
            alternativeContext: {}
        });

        mediaManager.initialize();
    });

    afterEach(function () {
        if (mediaManager) {
            mediaManager.reset();
        }
    });

    describe('setAlternativeVideoElement', function () {
        it('should not throw error when setting alternative video element', function () {
            const mockVideoElement = videoModelMock.getElement();

            expect(() => {
                mediaManager.setAlternativeVideoElement(mockVideoElement);
            }).to.not.throw();
        });
    });

    describe('prebufferAlternativeContent', function () {
        it('should start prebuffering alternative content and log the action', function () {
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';

            mediaManager.prebufferAlternativeContent(testPlayerId, testUrl);

            expect(debugMock.log.info).to.equal(`Starting prebuffering for player ${testPlayerId}`);
        });
    });

    describe('switchToAlternativeContent', function () {
        beforeEach(function () {
            const mockVideoElement = videoModelMock.getElement();
            mediaManager.setAlternativeVideoElement(mockVideoElement);
        });

        it('should switch to alternative content without prebuffered content', function () {
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';

            mediaManager.switchToAlternativeContent(testPlayerId, testUrl);

            expect(debugMock.log.info).to.equal(`Alternative content playback started for player ${testPlayerId}`);
        });

        it('should switch to alternative content with prebuffered content', function () {
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';

            mediaManager.prebufferAlternativeContent(testPlayerId, testUrl);
            expect(debugMock.log.info).to.equal(`Starting prebuffering for player ${testPlayerId}`);

            mediaManager.switchToAlternativeContent(testPlayerId, testUrl);
            expect(debugMock.log.info).to.equal(`Alternative content playback started for player ${testPlayerId}`);
        });

        it('should switch to alternative content and seek to a given time', function () {
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';
            const testTime = 15;

            mediaManager.switchToAlternativeContent(testPlayerId, testUrl, testTime);

            expect(debugMock.log.debug).to.equal(`Seeking alternative content to time: ${testTime}`);
            expect(debugMock.log.info).to.equal(`Alternative content playback started for player ${testPlayerId}`);
        });
    });

    describe('getAlternativePlayer', function () {
        beforeEach(function () {
            const mockVideoElement = videoModelMock.getElement();
            mediaManager.setAlternativeVideoElement(mockVideoElement);
        });

        it('should return null when no alternative player is set', function () {
            const result = mediaManager.getAlternativePlayer();
            expect(result).to.be.null;
        });

        it('should return the alternative player when it is set', function () {
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';

            mediaManager.switchToAlternativeContent(testPlayerId, testUrl, 0);

            const result = mediaManager.getAlternativePlayer();
            expect(result).to.not.be.undefined;
            expect(result).to.be.an('object');
        });
    });
});