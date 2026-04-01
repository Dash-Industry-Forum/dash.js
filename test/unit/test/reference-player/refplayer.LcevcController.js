/**
 * Tests for the Reference Player LcevcController.
 */

import {expect} from 'chai';

import {LcevcController} from '../../../../samples/dash-if-reference-player/app/js/LcevcController.js';

describe('Reference Player - LcevcController', function () {
    let originalDashjs;
    let originalLcevcDec;
    let mockPlayer;
    let playerController;
    let videoElement;
    let canvasElement;
    let toggleElement;
    let closeCalls;
    let registeredEvents;

    function createMockPlayer() {
        return {
            LCEVCdec: null,
            on: (eventName, handler) => {
                registeredEvents.push({ eventName, handler });
            },
            off: (eventName, handler) => {
                registeredEvents = registeredEvents.filter((entry) => {
                    return !(entry.eventName === eventName && entry.handler === handler);
                });
            }
        };
    }

    beforeEach(function () {
        originalDashjs = globalThis.dashjs;
        originalLcevcDec = globalThis.LCEVCdec;

        closeCalls = 0;
        registeredEvents = [];

        globalThis.dashjs = {
            MediaPlayer: {
                events: {
                    QUALITY_CHANGE_REQUESTED: 'qualityChangeRequested',
                    FRAGMENT_LOADING_COMPLETED: 'fragmentLoadingCompleted',
                    REPRESENTATION_SWITCH: 'representationSwitch'
                }
            }
        };

        globalThis.LCEVCdec = {
            ready: Promise.resolve(),
            LCEVCdec: class MockDecoder {
                close() {
                    closeCalls++;
                }

                setLevelSwitching() {}

                appendBuffer() {}

                flushBuffer() {}
            }
        };

        mockPlayer = createMockPlayer();
        playerController = { player: mockPlayer };

        videoElement = document.createElement('video');
        canvasElement = document.createElement('canvas');
        toggleElement = document.createElement('input');
        toggleElement.type = 'checkbox';

        document.body.appendChild(videoElement);
        document.body.appendChild(canvasElement);
        document.body.appendChild(toggleElement);
    });

    afterEach(function () {
        videoElement.remove();
        canvasElement.remove();
        toggleElement.remove();

        globalThis.dashjs = originalDashjs;
        globalThis.LCEVCdec = originalLcevcDec;
    });

    it('should auto-enable and attach the decoder for known LCEVC streams', async function () {
        const controller = new LcevcController(playerController);
        controller.init({
            videoElement,
            canvasElement,
            toggleElement
        });
        controller.setSelectedItem({
            provider: 'v-nova',
            tags: ['lcevc']
        });

        const enabled = await controller.prepareForPlayback();

        expect(enabled).to.be.true;
        expect(toggleElement.checked).to.be.true;
        expect(mockPlayer.LCEVCdec).to.exist;
        expect(videoElement.classList.contains('lcevc-hidden-video')).to.be.true;
        expect(canvasElement.classList.contains('d-none')).to.be.false;
        expect(registeredEvents.map((entry) => entry.eventName)).to.deep.equal([
            'qualityChangeRequested',
            'fragmentLoadingCompleted',
            'representationSwitch',
            'externalSourceBufferUpdateStart'
        ]);
    });

    it('should close the decoder and restore the base video on stop', async function () {
        const controller = new LcevcController(playerController);
        controller.init({
            videoElement,
            canvasElement,
            toggleElement
        });
        toggleElement.checked = true;

        await controller.prepareForPlayback();
        controller.stop();

        expect(closeCalls).to.equal(1);
        expect(mockPlayer.LCEVCdec).to.equal(null);
        expect(videoElement.classList.contains('lcevc-hidden-video')).to.be.false;
        expect(canvasElement.classList.contains('d-none')).to.be.true;
        expect(registeredEvents).to.have.lengthOf(0);
    });
});
