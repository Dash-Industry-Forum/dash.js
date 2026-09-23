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
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import FactoryMaker from '../../core/FactoryMaker.js';
import { ELEMENT_NOT_ATTACHED_ERROR, PLAYBACK_NOT_INITIALIZED_ERROR } from './MediaPlayerApiErrors.js';

function TextApi() {
    let instance,
        state;

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.state) {
            state = config.state;
        }
    }

    /**
     * Enable/disable text
     * When enabling text, dash will choose the previous selected text track
     *
     * @param {boolean} enable - true to enable text, false otherwise (same as setTextTrack(-1))
     * @memberof module:MediaPlayer
     * @instance
     */
    function enableText(enable) {
        const activeStreamInfo = _getActiveStreamInfo();

        if (!activeStreamInfo) {
            return false;
        }

        return state.textController.enableText(activeStreamInfo.id, enable);
    }

    /**
     * Enable/disable text
     * When enabling dash will keep downloading and process fragmented text tracks even if all tracks are in mode "hidden"
     *
     * @param {boolean} enable - true to enable text streaming even if all text tracks are hidden.
     * @memberof module:MediaPlayer
     * @instance
     */
    function enableForcedTextStreaming(enable) {
        const activeStreamInfo = _getActiveStreamInfo();

        if (!activeStreamInfo) {
            return false;
        }

        return state.textController.enableForcedTextStreaming(enable);
    }

    /**
     * Return if text is enabled
     *
     * @return {boolean} return true if text is enabled, false otherwise
     * @memberof module:MediaPlayer
     * @instance
     */
    function isTextEnabled() {
        const activeStreamInfo = _getActiveStreamInfo();

        if (!activeStreamInfo) {
            return false;
        }

        return state.textController.isTextEnabled(activeStreamInfo);
    }

    /**
     * Use this method to change the current text track for both external time text files and fragmented text tracks. There is no need to
     * set the track mode on the video object to switch a track when using this method.
     * @param {number} idx - Index of track based on the order of the order the tracks are added Use -1 to disable all tracks. (turn captions off).  Use module:MediaPlayer#dashjs.MediaPlayer.events.TEXT_TRACK_ADDED.
     * @see {@link MediaPlayerEvents#event:TEXT_TRACK_ADDED dashjs.MediaPlayer.events.TEXT_TRACK_ADDED}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function setTextTrack(idx) {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        const activeStreamInfo = _getActiveStreamInfo();

        if (!activeStreamInfo) {
            return;
        }

        state.textController.setTextTrack(activeStreamInfo.id, idx);
    }

    function getCurrentTextTrackIndex() {
        const activeStreamInfo = _getActiveStreamInfo();

        if (!activeStreamInfo) {
            return;
        }

        return state.textController.getCurrentTrackIdx(activeStreamInfo.id);
    }

    /**
     * Returns instance of Div that was attached by calling attachTTMLRenderingDiv()
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getTTMLRenderingDiv() {
        return state.videoModel ? state.videoModel.getTTMLRenderingDiv() : null;
    }

    /**
     * Use this method to attach an HTML5 div for dash.js to render rich TTML subtitles.
     *
     * @param {HTMLDivElement} div - An unstyled div placed after the video element. It will be styled to match the video size and overlay z-order.
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~ELEMENT_NOT_ATTACHED_ERROR ELEMENT_NOT_ATTACHED_ERROR} if called before attachView function
     * @instance
     */
    function attachTTMLRenderingDiv(div) {
        if (!state.videoModel.getElement()) {
            throw ELEMENT_NOT_ATTACHED_ERROR;
        }
        state.videoModel.setTTMLRenderingDiv(div);
    }

    function attachVttRenderingDiv(div) {
        if (!state.videoModel.getElement()) {
            throw ELEMENT_NOT_ATTACHED_ERROR;
        }
        state.videoModel.setVttRenderingDiv(div);
    }

    /**
     * @return {object|null} active stream info, or null when there is no active stream or no text controller
     * @private
     */
    function _getActiveStreamInfo() {
        const activeStreamInfo = state.streamController.getActiveStreamInfo();
        return activeStreamInfo && state.textController ? activeStreamInfo : null;
    }

    instance = {
        attachTTMLRenderingDiv,
        attachVttRenderingDiv,
        enableForcedTextStreaming,
        enableText,
        getCurrentTextTrackIndex,
        getTTMLRenderingDiv,
        isTextEnabled,
        setConfig,
        setTextTrack,
    };

    return instance;
}

TextApi.__dashjs_factory_name = 'TextApi';
export default FactoryMaker.getClassFactory(TextApi);
