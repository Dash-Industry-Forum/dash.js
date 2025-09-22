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
        // Setup mocks
        videoModelMock = new VideoModelMock();
        playbackControllerMock = new PlaybackControllerMock();
        debugMock = new DebugMock();

        // Configure MediaManager
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

    describe('getAlternativePlayer', function () {
        beforeEach(function () {
            const mockVideoElement = videoModelMock.getElement();
            mediaManager.setAlternativeVideoElement(mockVideoElement);
        });

        it('should return undefined when no alternative player is set', function () {
            const result = mediaManager.getAlternativePlayer();
            expect(result).to.be.undefined;
        });

        it('should return the alternative player when it is set', function () {
            // Initialize an alternative player by calling initializeAlternativePlayer
            // We need to access the private method through switchToAlternativeContent
            const testUrl = 'http://test.mpd';
            const testPlayerId = 'testPlayer';

            // Trigger initialization of alternative player
            mediaManager.switchToAlternativeContent(testPlayerId, testUrl, 0);

            const result = mediaManager.getAlternativePlayer();
            expect(result).to.not.be.undefined;
            expect(result).to.be.an('object');
        });
    });
});