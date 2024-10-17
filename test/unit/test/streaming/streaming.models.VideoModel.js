import VideoModel from '../../../../src/streaming/models/VideoModel.js';
import VideoElementMock from '../../mocks/VideoElementMock.js';
import Settings from '../../../../src/core/Settings.js';
import Constants from '../../../../src/streaming/constants/Constants.js';

import {expect} from 'chai';

describe('VideoModel', () => {
    const context = {};
    const videoModel = VideoModel(context).getInstance();
    const videoElementMock = new VideoElementMock();
    const settings = Settings(context).getInstance();

    beforeEach(() => {
        videoModel.setElement(videoElementMock);
    });

    afterEach(() => {
        videoModel.reset();
        videoElementMock.reset();
        settings.reset();
    });

    describe('setPlaybackRate()', () => {
        it('Should always set playback rate even when not in ready state if ignoring ready state', () => {
            videoElementMock.playbackRate = 1;
            videoElementMock.readyState = Constants.VIDEO_ELEMENT_READY_STATES.HAVE_NOTHING;

            videoModel.setPlaybackRate(0, true);
            expect(videoElementMock.playbackRate).to.equal(0);
        });

        it('Should set playback rate if the video element is in ready state', () => {
            videoElementMock.playbackRate = 1;
            videoElementMock.readyState = Constants.VIDEO_ELEMENT_READY_STATES.HAVE_FUTURE_DATA;
            
            videoModel.setPlaybackRate(0.5, false);
            expect(videoElementMock.playbackRate).to.equal(0.5);
        });
    });

    describe('setStallState()', () => {        
        describe('syntheticStallEvents enabled', () => {
            beforeEach(() => {
                settings.update({ streaming: { buffer: { syntheticStallEvents: { enabled: true, ignoreReadyState: false } }}});
                videoModel.setConfig({ settings });
            })

            it('Should set playback rate to 0 on stall if video element is in ready state', () => {
                videoElementMock.playbackRate = 1;
                videoElementMock.readyState = Constants.VIDEO_ELEMENT_READY_STATES.HAVE_FUTURE_DATA;

                videoModel.setStallState('video', true);

                expect(videoElementMock.playbackRate).to.equal(0);
            });

            it('Should emit a waiting event on stall if video element is in ready state', (done) => {
                videoElementMock.readyState = Constants.VIDEO_ELEMENT_READY_STATES.HAVE_FUTURE_DATA;

                const onWaiting = () => {
                    videoElementMock.removeEventListener('waiting', onWaiting);
                    done();
                };
                videoElementMock.addEventListener('waiting', onWaiting);

                videoModel.setStallState('video', true);
            });
        });
    });
});