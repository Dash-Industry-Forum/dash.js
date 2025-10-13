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
import Constants from '../constants/Constants.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import TextSourceBuffer from './TextSourceBuffer.js';
import TextTracks from './TextTracks.js';
import VTTParser from '../utils/VTTParser.js';
import VttCustomRenderingParser from '../utils/VttCustomRenderingParser.js';
import TTMLParser from '../utils/TTMLParser.js';
import EventBus from '../../core/EventBus.js';
import Debug from '../../core/Debug.js';
import Events from '../../core/events/Events.js';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents.js';
import {checkParameterType} from '../utils/SupervisorTools.js';
import DVBFonts from './DVBFonts.js';
import DashConstants from '../../dash/constants/DashConstants.js';

function TextController(config) {

    let context = this.context;

    const adapter = config.adapter;
    const errHandler = config.errHandler;
    const manifestModel = config.manifestModel;
    const mediaController = config.mediaController;
    const baseURLController = config.baseURLController;
    const videoModel = config.videoModel;
    const settings = config.settings;

    let instance,
        streamData,
        textSourceBuffers,
        textTracks,
        vttParser,
        vttCustomRenderingParser,
        ttmlParser,
        eventBus,
        allTracksAreDisabled,
        forceTextStreaming,
        textTracksAdded,
        disableTextBeforeTextTracksAdded,
        dvbFonts,
        logger;

    function setup() {
        forceTextStreaming = false;
        textTracksAdded = false;
        disableTextBeforeTextTracksAdded = false;

        vttParser = VTTParser(context).getInstance();
        vttCustomRenderingParser = VttCustomRenderingParser(context).getInstance();
        ttmlParser = TTMLParser(context).getInstance();
        eventBus = EventBus(context).getInstance();
        logger = Debug(context).getInstance().getLogger(instance);

        resetInitialSettings();
    }

    function initialize() {
        dvbFonts = DVBFonts(context).create({
            adapter,
            baseURLController,
        });
        eventBus.on(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);
        eventBus.on(Events.DVB_FONT_DOWNLOAD_FAILED, _onFontDownloadFailure, instance);
        eventBus.on(Events.DVB_FONT_DOWNLOAD_COMPLETE, _onFontDownloadSuccess, instance);
        eventBus.on(Events.MEDIAINFO_UPDATED, _onMediaInfoUpdated, instance);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
        if (settings.get().streaming.text.webvtt.customRenderingEnabled) {
            eventBus.on(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        }
        eventBus.on(Events.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
    }

    function initializeForStream(streamInfo) {
        const streamId = streamInfo.id;
        const tracks = TextTracks(context).create({
            videoModel,
            settings,
            streamInfo
        });
        tracks.initialize();
        textTracks[streamId] = tracks;

        const textSourceBuffer = TextSourceBuffer(context).create({
            errHandler,
            adapter,
            dvbFonts,
            manifestModel,
            mediaController,
            videoModel,
            textTracks: tracks,
            vttParser,
            vttCustomRenderingParser,
            ttmlParser,
            streamInfo,
            settings
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

    /**
     * Event that is triggered if a font download of a font described in an essential property descriptor
     * tag fails.
     * @param {FontInfo} font - font information
     * @private
     */
    function _onFontDownloadFailure(font) {
        logger.error(`Could not download ${font.isEssential ? 'an essential' : 'a'} font - fontFamily: ${font.fontFamily}, url: ${font.url}`);
        if (font.isEssential) {
            let idx = textTracks[font.streamId].getTrackIdxForId(font.trackId);
            textTracks[font.streamId].setModeForTrackIdx(idx, Constants.TEXT_DISABLED);
        }
    };

    /**
     * Set a font with an essential property
     * @private
     */
    function _onFontDownloadSuccess(font) {
        logger.debug(`Successfully downloaded ${font.isEssential ? 'an essential' : 'a'} font - fontFamily: ${font.fontFamily}, url: ${font.url}`);
        if (font.isEssential) {
            let idx = textTracks[font.streamId].getTrackIdxForId(font.trackId);
            if (idx === textTracks[font.streamId].getCurrentTrackIdx()) {
                textTracks[font.streamId].setModeForTrackIdx(idx, Constants.TEXT_SHOWING);
            } else {
                textTracks[font.streamId].setModeForTrackIdx(idx, Constants.TEXT_HIDDEN);
            }
        }
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
            const currentTrack = mediaController.getCurrentTrackFor(Constants.TEXT, streamId);
            if (currentTrack) {
                const defaultSettings = {
                    lang: currentTrack.lang,
                    role: currentTrack.roles[0],
                    index: currentTrack.index,
                    codec: currentTrack.codec,
                    accessibility: currentTrack.accessibility[0]
                };
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

        dvbFonts.addFontsFromTracks(tracks, streamId);

        // Initially disable any tracks with essential property font downloads
        dvbFonts.getFonts().forEach(font => {
            if (font.isEssential) {
                let idx = textTracks[font.streamId].getTrackIdxForId(font.trackId);
                textTracks[font.streamId].setModeForTrackIdx(idx, Constants.TEXT_DISABLED);
            }
        });

        dvbFonts.downloadFonts();
    }

    function _onPlaybackTimeUpdated(e) {
        try {
            const streamId = e.streamId;
            const tracks = textTracks[streamId];

            if (!tracks || isNaN(e.time)) {
                return;
            }

            tracks.updateTextTrackWindow(e.time);

            if (settings.get().streaming.text.webvtt.customRenderingEnabled) {
                tracks.manualCueProcessing(e.time);
            }
        } catch (err) {
        }
    }

    function _onPlaybackSeeking(e) {
        try {
            const streamId = e.streamId;

            if (!textTracks[streamId]) {
                return;
            }
            textTracks[streamId].disableManualTracks();
        } catch (e) {

        }
    }

    function _onPlaybackSeeked(e) {
        try {
            const tracks = textTracks[e.streamId];

            if (!tracks) {
                return;
            }

            const currentTime = videoModel.getTime() || 0;

            tracks.updateTextTrackWindow(currentTime, true);
        } catch (e) {
            logger.error(e);
        }
    }

    function _onMediaInfoUpdated(e) {
        try {
            if (!e || !e.mediaType || e.mediaType !== Constants.AUDIO || !e.currentMediaInfo) {
                return
            }

            const currentTextTrackInfo = textTracks[e.streamId].getCurrentTextTrackInfo();
            let suitableForcedSubtitleIndex = NaN;
            if (allTracksAreDisabled) {
                suitableForcedSubtitleIndex = _getSuitableForceSubtitleTrackIndex(e.streamId);
            } else if (_isForcedSubtitleTrack(currentTextTrackInfo) && e.currentMediaInfo.lang && e.currentMediaInfo.lang !== currentTextTrackInfo.lang) {
                suitableForcedSubtitleIndex = _getSuitableForceSubtitleTrackIndex(e.streamId);
                if (isNaN(suitableForcedSubtitleIndex)) {
                    suitableForcedSubtitleIndex = -1;
                }
            }

            if (!isNaN(suitableForcedSubtitleIndex)) {
                setTextTrack(e.streamId, suitableForcedSubtitleIndex);
            }

        } catch (e) {
            logger.error(e);
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

        return true
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
        return true
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

        textTracks[streamId].disableManualTracks();

        textTracks[streamId].invalidateCueWindow();

        let currentTrackInfo = textTracks[streamId].getCurrentTextTrackInfo();
        let currentNativeTrackInfo = (currentTrackInfo) ? videoModel.getTextTrack(currentTrackInfo.kind, currentTrackInfo.id, currentTrackInfo.lang, currentTrackInfo.isTTML, currentTrackInfo.isEmbedded) : null;

        // Don't change disabled tracks - dvb font download for essential property failed or not complete
        if (currentNativeTrackInfo && (currentNativeTrackInfo.mode !== Constants.TEXT_DISABLED)) {
            textTracks[streamId].setModeForTrackIdx(oldTrackIdx, Constants.TEXT_HIDDEN);
        }

        textTracks[streamId].setCurrentTrackIdx(idx);

        currentTrackInfo = textTracks[streamId].getCurrentTextTrackInfo();

        const dispatchForManualRendering = settings.get().streaming.text.dispatchForManualRendering;

        if (currentTrackInfo && !dispatchForManualRendering && (currentTrackInfo.mode !== Constants.TEXT_DISABLED)) {
            textTracks[streamId].setModeForTrackIdx(idx, Constants.TEXT_SHOWING);
        }

        if (currentTrackInfo && currentTrackInfo.isFragmented && !currentTrackInfo.isEmbedded) {
            _setFragmentedTextTrack(streamId, currentTrackInfo, oldTrackIdx);
        } else if (currentTrackInfo && !currentTrackInfo.isFragmented) {
            _setNonFragmentedTextTrack(streamId, currentTrackInfo);
        } else if (!currentTrackInfo && allTracksAreDisabled) {
            const forcedSubtitleTrackIndex = _getSuitableForceSubtitleTrackIndex(streamId)
            if (!isNaN(forcedSubtitleTrackIndex)) {
                setTextTrack(streamId, forcedSubtitleTrackIndex);
            }
            return
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
                if (mediaInfo.id ? currentFragTrack.id !== mediaInfo.id : currentFragTrack.index !== mediaInfo.index) {
                    textTracks[streamId].deleteCuesFromTrackIdx(oldTrackIdx);
                    textSourceBuffers[streamId].setCurrentFragmentedTrackIdx(i);
                } else if (oldTrackIdx === -1) {
                    // in fragmented use case, if the user selects the older track (the one selected before disabled text track)
                    // no CURRENT_TRACK_CHANGED event will be triggered because the mediaInfo in the StreamProcessor is equal to the one we are selecting
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

    function _getSuitableForceSubtitleTrackIndex(streamId) {
        const forcedSubtitleTracks = _getForcedSubtitleTracks(streamId);

        if (!forcedSubtitleTracks || forcedSubtitleTracks.length <= 0) {
            return NaN
        }

        const currentAudioTrack = mediaController.getCurrentTrackFor(Constants.AUDIO, streamId);
        if (!currentAudioTrack) {
            return NaN
        }

        const suitableTrack = forcedSubtitleTracks.find((track) => {
            return currentAudioTrack.lang === track.lang
        })

        if (suitableTrack) {
            return suitableTrack._indexToSelect
        }

        return NaN
    }

    function _getForcedSubtitleTracks(streamId) {
        const textTrackInfos = textTracks[streamId].getTextTrackInfos();
        return textTrackInfos.filter((textTrackInfo, index) => {
            textTrackInfo._indexToSelect = index;
            if (textTrackInfo && textTrackInfo.roles && textTrackInfo.roles.length > 0) {
                return _isForcedSubtitleTrack(textTrackInfo);
            }
            return false
        });
    }

    function _isForcedSubtitleTrack(textTrackInfo) {
        if (!textTrackInfo || !textTrackInfo.roles || textTrackInfo.roles.length === 0) {
            return false
        }
        return textTrackInfo.roles.some((role) => {
            return role.schemeIdUri === Constants.DASH_ROLE_SCHEME_ID && role.value === DashConstants.FORCED_SUBTITLE
        })
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

    function clearDataForStream(streamId) {
        if (textSourceBuffers[streamId]) {
            textSourceBuffers[streamId].resetEmbedded();
            textSourceBuffers[streamId].reset();
            delete textSourceBuffers[streamId];
        }

        if (textTracks[streamId]) {
            textTracks[streamId].deleteAllTextTracks();
            delete textTracks[streamId];
        }

        if (streamData[streamId]) {
            delete streamData[streamId];
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
        Object.keys(textSourceBuffers).forEach((key) => {
            textSourceBuffers[key].resetEmbedded();
            textSourceBuffers[key].reset();
        });

        dvbFonts.reset();
        resetInitialSettings();
        eventBus.off(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);
        eventBus.off(Events.DVB_FONT_DOWNLOAD_FAILED, _onFontDownloadFailure, instance);
        eventBus.off(Events.DVB_FONT_DOWNLOAD_COMPLETE, _onFontDownloadSuccess, instance);
        eventBus.off(Events.MEDIAINFO_UPDATED, _onMediaInfoUpdated, instance);
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
        if (settings.get().streaming.text.webvtt.customRenderingEnabled) {
            eventBus.off(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        }
        eventBus.off(Events.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
    }

    instance = {
        addEmbeddedTrack,
        addMediaInfosToBuffer,
        createTracks,
        deactivateStream,
        enableForcedTextStreaming,
        enableText,
        getAllTracksAreDisabled,
        getCurrentTrackIdx,
        getTextSourceBuffer,
        initialize,
        initializeForStream,
        isTextEnabled,
        reset,
        setTextTrack,
        clearDataForStream,
    };
    setup();
    return instance;
}

TextController.__dashjs_factory_name = 'TextController';
export default FactoryMaker.getClassFactory(TextController);
