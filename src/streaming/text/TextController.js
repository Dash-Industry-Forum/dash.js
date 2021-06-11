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
import Constants from '../constants/Constants';
import FactoryMaker from '../../core/FactoryMaker';
import TextSourceBuffer from './TextSourceBuffer';
import TextTracks from './TextTracks';
import VTTParser from '../utils/VTTParser';
import TTMLParser from '../utils/TTMLParser';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import {checkParameterType} from '../utils/SupervisorTools';

function TextController(config) {

    let context = this.context;

    const adapter = config.adapter;
    const errHandler = config.errHandler;
    const manifestModel = config.manifestModel;
    const mediaController = config.mediaController;
    const videoModel = config.videoModel;
    const settings = config.settings;

    let instance,
        streamData,
        textSourceBuffers,
        textTracks,
        vttParser,
        ttmlParser,
        eventBus,
        defaultSettings,
        initialSettingsSet,
        allTracksAreDisabled,
        forceTextStreaming,
        textTracksAdded,
        disableTextBeforeTextTracksAdded;

    function setup() {
        defaultSettings = null;
        forceTextStreaming = false;
        textTracksAdded = false;
        initialSettingsSet = false;
        disableTextBeforeTextTracksAdded = false;

        vttParser = VTTParser(context).getInstance();
        ttmlParser = TTMLParser(context).getInstance();
        eventBus = EventBus(context).getInstance();

        resetInitialSettings();
    }

    function initialize() {
        eventBus.on(Events.CURRENT_TRACK_CHANGED, _onCurrentTrackChanged, instance);
        eventBus.on(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);
    }

    function initializeForStream(streamInfo) {
        const streamId = streamInfo.id;
        const tracks = TextTracks(context).create({
            videoModel,
            streamInfo
        });
        tracks.initialize();
        textTracks[streamId] = tracks;

        const textSourceBuffer = TextSourceBuffer(context).create({
            errHandler,
            adapter,
            manifestModel,
            mediaController,
            videoModel,
            textTracks: tracks,
            vttParser,
            ttmlParser,
            streamInfo
        });
        textSourceBuffer.initialize();
        textSourceBuffers[streamId] = textSourceBuffer;

        streamData[streamId] = {};
        streamData[streamId].lastEnabledIndex = -1;
    }

    /**
     * All media infos have been added. Start creating the track objects
     * @param {object} streamInfo
     */
    function createTracks(streamInfo) {
        const streamId = streamInfo.id;

        if (!textTracks[streamId]) {
            return;
        }
        textTracks[streamId].createTracks();
    }

    /**
     * Adds the new mediaInfo objects to the textSourceBuffer.
     * @param {object} streamInfo
     * @param {array} mInfos
     * @param {string|null} mimeType
     * @param {object} fragmentModel
     */
    function addMediaInfosToBuffer(streamInfo, type, mInfos, fragmentModel = null) {
        const streamId = streamInfo.id;

        if (!textSourceBuffers[streamId]) {
            return;
        }
        textSourceBuffers[streamId].addMediaInfos(type, mInfos, fragmentModel);
    }

    function getTextSourceBuffer(streamInfo) {
        const streamId = streamInfo.id;

        if (textSourceBuffers && textSourceBuffers[streamId]) {
            return textSourceBuffers[streamId];
        }
    }

    function getAllTracksAreDisabled() {
        return allTracksAreDisabled;
    }

    function addEmbeddedTrack(streamInfo, mediaInfo) {
        const streamId = streamInfo.id;

        if (!textSourceBuffers[streamId]) {
            return;
        }

        textSourceBuffers[streamId].addEmbeddedTrack(mediaInfo);
    }

    function setInitialSettings(settings) {
        defaultSettings = settings;
        initialSettingsSet = true;
    }

    function _onTextTracksAdded(e) {
        let tracks = e.tracks;
        let index = e.index;
        const streamId = e.streamId;

        const textDefaultEnabled = settings.get().streaming.text.defaultEnabled;

        if ((textDefaultEnabled === false && !isTextEnabled()) || disableTextBeforeTextTracksAdded) {
            // disable text at startup if explicitly configured with setTextDefaultEnabled(false) or if there is no defaultSettings (configuration or from domStorage)
            setTextTrack(streamId, -1);
        } else {
            if (defaultSettings) {
                tracks.some((item, idx) => {
                    // matchSettings is compatible with setTextDefaultLanguage and setInitialSettings
                    if (mediaController.matchSettings(defaultSettings, item)) {
                        setTextTrack(streamId, idx);
                        index = idx;
                        return true;
                    }
                });
            }
            allTracksAreDisabled = false;
        }

        streamData[streamId].lastEnabledIndex = index;

        eventBus.trigger(MediaPlayerEvents.TEXT_TRACKS_ADDED, {
            enabled: isTextEnabled(),
            index: index,
            tracks: tracks,
            streamId
        });

        textTracksAdded = true;
    }

    function _onCurrentTrackChanged(event) {
        if (!initialSettingsSet && event && event.newMediaInfo) {
            let mediaInfo = event.newMediaInfo;
            if (mediaInfo.type === Constants.TEXT) {
                defaultSettings = {
                    lang: mediaInfo.lang,
                    role: mediaInfo.roles[0],
                    index: mediaInfo.index,
                    codec: mediaInfo.codec,
                    accessibility: mediaInfo.accessibility[0]
                };
            }
        }
    }

    function enableText(streamId, enable) {
        checkParameterType(enable, 'boolean');
        if (isTextEnabled() !== enable) {
            // change track selection
            if (enable) {
                // apply last enabled track
                setTextTrack(streamId, streamData[streamId].lastEnabledIndex);
            }

            if (!enable) {
                // keep last index and disable text track
                streamData[streamId].lastEnabledIndex = getCurrentTrackIdx(streamId);
                if (!textTracksAdded) {
                    disableTextBeforeTextTracksAdded = true;
                } else {
                    setTextTrack(streamId, -1);
                }
            }
        }
    }

    function isTextEnabled() {
        let enabled = true;
        if (allTracksAreDisabled && !forceTextStreaming) {
            enabled = false;
        }
        return enabled;
    }

    // when set to true ScheduleController will allow schedule of chunks even if tracks are all disabled. Allowing streaming to hidden track for external players to work with.
    function enableForcedTextStreaming(enable) {
        checkParameterType(enable, 'boolean');
        forceTextStreaming = enable;
    }

    function setTextTrack(streamId, idx) {
        // For external time text file, the only action needed to change a track is marking the track mode to showing.
        // Fragmented text tracks need the additional step of calling TextController.setTextTrack();
        allTracksAreDisabled = idx === -1;

        if (allTracksAreDisabled && mediaController) {
            mediaController.saveTextSettingsDisabled();
        }

        let oldTrackIdx = getCurrentTrackIdx(streamId);

        // No change, no action required
        if (oldTrackIdx === idx || !textTracks[streamId]) {
            return;
        }

        textTracks[streamId].setModeForTrackIdx(oldTrackIdx, Constants.TEXT_HIDDEN);
        textTracks[streamId].setCurrentTrackIdx(idx);
        textTracks[streamId].setModeForTrackIdx(idx, Constants.TEXT_SHOWING);

        let currentTrackInfo = textTracks[streamId].getCurrentTrackInfo();

        if (currentTrackInfo && currentTrackInfo.isFragmented && !currentTrackInfo.isEmbedded) {
            _setFragmentedTextTrack(streamId, currentTrackInfo, oldTrackIdx);
        } else if (currentTrackInfo && !currentTrackInfo.isFragmented) {
            _setNonFragmentedTextTrack(streamId, currentTrackInfo);
        }

        mediaController.setTrack(currentTrackInfo);
    }

    function _setFragmentedTextTrack(streamId, currentTrackInfo, oldTrackIdx) {

        if (!textSourceBuffers[streamId]) {
            return;
        }

        let config = textSourceBuffers[streamId].getConfig();
        let fragmentedTracks = config.fragmentedTracks;

        for (let i = 0; i < fragmentedTracks.length; i++) {
            let mediaInfo = fragmentedTracks[i];
            if (currentTrackInfo.lang === mediaInfo.lang &&
                (mediaInfo.id ? currentTrackInfo.id === mediaInfo.id : currentTrackInfo.index === mediaInfo.index)) {
                let currentFragTrack = mediaController.getCurrentTrackFor(Constants.TEXT, streamId);
                if (mediaInfo !== currentFragTrack) {
                    textTracks[streamId].deleteCuesFromTrackIdx(oldTrackIdx);
                    textSourceBuffers[streamId].setCurrentFragmentedTrackIdx(i);
                }  else if (oldTrackIdx === -1) {
                    //in fragmented use case, if the user selects the older track (the one selected before disabled text track)
                    //no CURRENT_TRACK_CHANGED event will be triggered because the mediaInfo in the StreamProcessor is equal to the one we are selecting
                    // For that reason we reactivate the StreamProcessor and the ScheduleController
                    eventBus.trigger(Events.SET_FRAGMENTED_TEXT_AFTER_DISABLED, {}, {
                        streamId,
                        mediaType: Constants.TEXT
                    });
                }
            }
        }
    }

    function _setNonFragmentedTextTrack(streamId, currentTrackInfo) {
        eventBus.trigger(Events.SET_NON_FRAGMENTED_TEXT, {
            currentTrackInfo
        }, {
            streamId,
            mediaType: Constants.TEXT
        });
    }

    function getCurrentTrackIdx(streamId) {
        return textTracks[streamId].getCurrentTrackIdx();
    }

    function deactivateStream(streamInfo) {
        if (!streamInfo) {
            return;
        }
        const streamId = streamInfo.id;

        if (textSourceBuffers[streamId]) {
            textSourceBuffers[streamId].resetMediaInfos();
        }

        if (textTracks[streamId]) {
            textTracks[streamId].deleteAllTextTracks();
        }
    }

    function resetInitialSettings() {
        textSourceBuffers = {};
        textTracks = {};
        streamData = {};
        allTracksAreDisabled = true;
        textTracksAdded = false;
        disableTextBeforeTextTracksAdded = false;
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(Events.CURRENT_TRACK_CHANGED, _onCurrentTrackChanged, instance);
        eventBus.off(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);

        Object.keys(textSourceBuffers).forEach((key) => {
            textSourceBuffers[key].resetEmbedded();
            textSourceBuffers[key].reset();
        });
    }

    instance = {
        deactivateStream,
        initialize,
        initializeForStream,
        createTracks,
        getTextSourceBuffer,
        getAllTracksAreDisabled,
        addEmbeddedTrack,
        setInitialSettings,
        enableText,
        isTextEnabled,
        setTextTrack,
        getCurrentTrackIdx,
        enableForcedTextStreaming,
        addMediaInfosToBuffer,
        reset
    };
    setup();
    return instance;
}

TextController.__dashjs_factory_name = 'TextController';
export default FactoryMaker.getClassFactory(TextController);
