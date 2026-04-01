/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  * list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  * this list of conditions and the following disclaimer in the documentation and/or
 *  * other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  * contributors may be used to endorse or promote products derived from this software
 *  * without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

const AUTO_RENDER_MODE = {
    ENABLED: 1
};

export class LcevcController {
    constructor(playerController) {
        this.playerController = playerController;
        this.player = playerController.player;
        this.videoElement = null;
        this.canvasElement = null;
        this.toggleElement = null;
        this.selectedItem = null;
        this.decoder = null;
        this.abrIndex = -1;
        this._boundHandlers = null;
    }

    init({ videoElement, canvasElement, toggleElement }) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.toggleElement = toggleElement || null;

        if (this.canvasElement) {
            this.canvasElement.classList.add('d-none');
        }

        if (this.toggleElement) {
            this.toggleElement.addEventListener('change', () => this.syncVisibility());
        }
    }

    setSelectedItem(item) {
        this.selectedItem = item || null;
        this.syncVisibility();
    }

    async prepareForPlayback() {
        this.stop();

        const shouldEnable = this.shouldEnable();
        if (!shouldEnable) {
            this.syncVisibility(false);
            return false;
        }

        this._forceToggleEnabled();
        this.syncVisibility(true);

        const lcevcNamespace = await this._getLcevcNamespace();
        if (!lcevcNamespace) {
            this.syncVisibility(false);
            return false;
        }

        this._attachDecoder(lcevcNamespace);
        return true;
    }

    stop() {
        this._detachPlayerHooks();

        if (this.decoder && typeof this.decoder.close === 'function') {
            this.decoder.close();
        }

        this.decoder = null;
        this.abrIndex = -1;

        if (this.player) {
            this.player.LCEVCdec = null;
        }

        this.syncVisibility(false);
    }

    shouldEnable() {
        return this._isToggleEnabled() || this._isKnownLcevcStream();
    }

    syncVisibility(forceEnabled) {
        const enabled = forceEnabled !== undefined ? forceEnabled : (this.shouldEnable() && !!this.decoder);

        if (this.canvasElement) {
            this.canvasElement.classList.toggle('d-none', !enabled);
        }

        if (this.videoElement) {
            this.videoElement.classList.toggle('lcevc-hidden-video', enabled);
        }
    }

    _forceToggleEnabled() {
        if (this.toggleElement && !this.toggleElement.checked) {
            this.toggleElement.checked = true;
        }
    }

    _isToggleEnabled() {
        return !!(this.toggleElement && this.toggleElement.checked);
    }

    _isKnownLcevcStream() {
        return this.selectedItem?.provider === 'v-nova' || this.selectedItem?.tags?.includes('lcevc');
    }

    async _getLcevcNamespace() {
        const lcevcNamespace = globalThis.LCEVCdec;
        if (!lcevcNamespace) {
            console.warn('LCEVC decoder library is not available. LCEVC playback will remain disabled.');
            return null;
        }

        if (lcevcNamespace.ready && typeof lcevcNamespace.ready.then === 'function') {
            try {
                await lcevcNamespace.ready;
            } catch (e) {
                console.warn('LCEVC decoder library failed to initialize.', e);
                return null;
            }
        }

        return lcevcNamespace;
    }

    _attachDecoder(lcevcNamespace) {
        if (!this.player || !this.videoElement || !this.canvasElement) {
            return;
        }

        this.decoder = new lcevcNamespace.LCEVCdec(
            this.videoElement,
            this.canvasElement,
            {
                dynamicPerformanceScaling: false
            }
        );
        this.player.LCEVCdec = this.decoder;

        this._boundHandlers = {
            qualityChangeRequested: (event) => {
                if (!this.decoder || !event?.newRepresentation) {
                    return;
                }
                if (event.mediaType === 'video' || event.mediaType === 'enhancement') {
                    this.decoder.setLevelSwitching(event.newRepresentation.absoluteIndex, AUTO_RENDER_MODE.ENABLED);
                }
            },
            fragmentLoadingCompleted: (event) => {
                if (event?.mediaType === 'enhancement' && event.request?.representation) {
                    this.abrIndex = event.request.representation.absoluteIndex;
                }
            },
            representationSwitch: (event) => {
                if (!this.decoder || (event?.mediaType !== 'video' && event?.mediaType !== 'enhancement')) {
                    return;
                }

                const representation = event.currentRepresentation;
                if (representation?.dependentRepresentation) {
                    this.decoder.setLevelSwitching(representation.absoluteIndex, AUTO_RENDER_MODE.ENABLED);
                }
            },
            externalSourceBufferUpdateStart: (event) => {
                if (!this.decoder || !event) {
                    return;
                }

                if (event.request === 'appendBuffer') {
                    this.decoder.appendBuffer(event.data, 'video', this.abrIndex, 0, false);
                } else if (event.request === 'remove') {
                    this.decoder.flushBuffer(event.start, event.end);
                }
            }
        };

        this.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, this._boundHandlers.qualityChangeRequested);
        this.player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, this._boundHandlers.fragmentLoadingCompleted);
        this.player.on(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, this._boundHandlers.representationSwitch);
        this.player.on('externalSourceBufferUpdateStart', this._boundHandlers.externalSourceBufferUpdateStart);
    }

    _detachPlayerHooks() {
        if (!this.player || !this._boundHandlers || typeof this.player.off !== 'function') {
            this._boundHandlers = null;
            return;
        }

        this.player.off(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, this._boundHandlers.qualityChangeRequested);
        this.player.off(dashjs.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, this._boundHandlers.fragmentLoadingCompleted);
        this.player.off(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, this._boundHandlers.representationSwitch);
        this.player.off('externalSourceBufferUpdateStart', this._boundHandlers.externalSourceBufferUpdateStart);
        this._boundHandlers = null;
    }
}
