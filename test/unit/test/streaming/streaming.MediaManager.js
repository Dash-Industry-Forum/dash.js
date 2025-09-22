import MediaManager from '../../../../src/streaming/MediaManager.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import DebugMock from '../../mocks/DebugMock.js';
import { expect } from 'chai';

describe('MediaManager', function () {
    let mediaManager;
    let videoModelMock;
    let playbackControllerMock;
    let originalDocument;
    let debugMock;

    beforeEach(function () {
        // Setup mocks
        videoModelMock = new VideoModelMock();
        playbackControllerMock = new PlaybackControllerMock();
        debugMock = new DebugMock();

        // Create MediaManager instance
        mediaManager = MediaManager();

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
        global.document = originalDocument;
    });

    describe('setAlternativeVideoElement', function () {
        it('should not throw error when setting alternative video element', function () {
            const mockVideoElement = videoModelMock.getElement();

            expect(() => {
                mediaManager.setAlternativeVideoElement(mockVideoElement);
            }).to.not.throw();
        });
    });
});