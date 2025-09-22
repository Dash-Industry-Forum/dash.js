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

    describe('set the alternative video element', function () {
        it('should not throw error when setting alternative video element', function () {
            const mockVideoElement = videoModelMock.getElement();

            expect(() => {
                mediaManager.setAlternativeVideoElement(mockVideoElement);
            }).to.not.throw();
        });
    });

    describe('prebuffer the alternative content', function () {
        it('should start prebuffering alternative content and log the action', function () {
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';

            mediaManager.prebufferAlternativeContent(testPlayerId, testUrl);

            expect(debugMock.log.info).to.equal(`Starting prebuffering for player ${testPlayerId}`);
        });
    });

    describe('switch to the alternative content', function () {
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

    describe('get alternative player', function () {
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

    describe('switch back to the main content', function () {
        beforeEach(function () {
            const mockVideoElement = videoModelMock.getElement();
            mediaManager.setAlternativeVideoElement(mockVideoElement);
        });

        it('should warn when no alternative player is set', function () {
            mediaManager.switchBackToMainContent(10);

            expect(debugMock.log.warn).to.equal('No alternative player to switch back from');
        });

        it('should switch back to main content', function () {
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';
            const seekTime = 20;

            mediaManager.switchToAlternativeContent(testPlayerId, testUrl, 0);
            mediaManager.switchBackToMainContent(seekTime);

            expect(debugMock.log.info).to.equal('Main content playback resumed');
            expect(mediaManager.getAlternativePlayer()).to.be.null;
        });
    });
});