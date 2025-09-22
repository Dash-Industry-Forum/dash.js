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

    });

    afterEach(function () {
        if (mediaManager) {
            mediaManager.reset();
        }
    });

    describe('setAlternativeVideoElement', function () {
        it.only('should not throw error when setting alternative video element', function () {
            const mockVideoElement = videoModelMock.getElement();

            expect(() => {
                mediaManager.setAlternativeVideoElement(mockVideoElement);
            }).to.not.throw();
        });
    });
});