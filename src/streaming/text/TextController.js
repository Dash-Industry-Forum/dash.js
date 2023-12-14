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
import VttCustomRenderingParser from '../utils/VttCustomRenderingParser';
import URLUtils from '../utils/URLUtils';
import TTMLParser from '../utils/TTMLParser';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import {checkParameterType} from '../utils/SupervisorTools';

function TextController(config) {

    let context = this.context;
    const urlUtils = URLUtils(context).getInstance();

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
        fontDownloadList;

    function setup() {
        forceTextStreaming = false;
        textTracksAdded = false;
        disableTextBeforeTextTracksAdded = false;
        fontDownloadList = [];

        vttParser = VTTParser(context).getInstance();
        vttCustomRenderingParser = VttCustomRenderingParser(context).getInstance();
        ttmlParser = TTMLParser(context).getInstance();
        eventBus = EventBus(context).getInstance();

        resetInitialSettings();
    }

    function initialize() {
        eventBus.on(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);
        if (settings.get().streaming.text.webvtt.customRenderingEnabled) {
            eventBus.on(Events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
            eventBus.on(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        }
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
     * @typedef {Object} FontInfo
     * @property {String} fontFamily - Font family name prefixed with 'dashjs-'
     * @property {String} url - Resolved download URL of font
     * @property {String} mimeType - Mimetype of font to download
     * @property {Boolean} isEssential - True if font was described in EssentialProperty descriptor tag
     */

    /**
     * Check the attributes of a supplemental or essential property descriptor to establish if 
     * it has the mandatory values for a dvb font download
     * @param {Object} attrs 
     * @returns {Boolean} true if mandatory attributes present
     */
    function _hasMandatoryDvbFontAttributes(attrs) {
        // TODO: Can we check if a url is a valid url (even if its relative to a BASE URL) or does that come later?
        if (
            (attrs.value && attrs.value === '1') &&
            (attrs.dvb_url && attrs.dvb_url.length > 0) && 
            (attrs.dvb_fontFamily && attrs.dvb_fontFamily.length > 0) &&
            (attrs.dvb_mimeType && (attrs.dvb_mimeType === Constants.OFF_MIMETYPE || attrs.dvb_mimeType === Constants.WOFF_MIMETYPE))
        ) {
            return true;
        }
        return false;
    }

    /**
     * Prefix the fontFamily name of a dvb custom font download so the font does
     * not clash with any fonts of the same name in the browser/locally.
     * @param {String} fontFamily - font family name
     * @returns {String} - Prefixed font name
     */
    function _prefixDvbCustomFont(fontFamily) {
        // Trim any white space - imsc will do the same when processing TTML/parsing HTML
        let prefixedFontFamily = fontFamily.trim();
        // Handle names with white space within them, hence wrapped in quotes
        if (fontFamily.charAt(0) === `"` || fontFamily.charAt(0) === `'`) {
            prefixedFontFamily = `${prefixedFontFamily.slice(0,1)}dashjs-${prefixedFontFamily.slice(1)}`;
        } else {
            prefixedFontFamily = `dashjs-${prefixedFontFamily}`;
        }

        return prefixedFontFamily;
    };

    /**
     * Resolves a given font download URL.
     * TODO: Still need to check bits of URL resolution
     * @param {String} fontUrl 
     * @returns 
     */
    function _resolveFontUrl(fontUrl, track) {
        if (urlUtils.isPathAbsolute(fontUrl)) {
            return fontUrl;
        } else if (urlUtils.isRelative(fontUrl)) {
            const baseUrl = baseURLController.resolve();

            if (baseUrl) {
                const reps = adapter.getVoRepresentations(track);
                return urlUtils.resolve(fontUrl, baseURLController.resolve(reps[0].path).url);
            } else {
                // TODO: Should this be against MPD location or current page location?
                return urlUtils.resolve(fontUrl);
            }
        } else {
            return fontUrl; 
        }
    };

    /**
     * Event that is triggered if a font download of a font described in an essential property descriptor
     * tag fails. 
     * @param {Object} e - Event
     * @param {FontInfo} e.font - Font information
     * @param {Object} e.track - Track information
     * @param {Number} e.streamId - StreamId
     */
    function _onEssentialFontDownloadFailure(e) {
        // TODO: Isn't there an error logger?
        console.error(`Could not download essential font - fontFamily: ${e.font.fontFamily}, url: ${e.font.url}`);
        let idx = textTracks[e.streamId].getTrackIdxForId(e.track.id);
        textTracks[e.streamId].deleteTextTrack(idx);
    };

    /**
     * Initiate the download of a dvb custom font.
     * TODO: Does the mimetype need to be specified somewhere?
     * @param {FontInfo} font - Font properties - TODO: break these down
     * @param {Object} track - Track information
     * @param {Number} streamId - StreamId
     * @
     */
    function _downloadDvbCustomFont(font, track, streamId) {
        const customFont = new FontFace(
            font.fontFamily,
            `url(${font.url})`
        );

        // Set event to delete the track if download fails 
        if (font.isEssential) {
            eventBus.on(Events.DVB_FONT_DOWNLOAD_FAILED, _onEssentialFontDownloadFailure, instance);
        }

        // Only need to test the fontFamily name as we don't want clashing family names with different URLs
        let processedFont = fontDownloadList.some((downloadedFont) => downloadedFont.fontFamily === font.fontFamily);

        // If the font is essential then do the download even if it's a duplicate font.
        // This is to ensure the font download failed event is triggered and the track is deleted
        if (font.isEssential || (!font.isEssential && !processedFont)) {
            // TODO: Add status strings to some kind of object/enum
            eventBus.trigger(Events.DVB_FONT_DOWNLOAD_ADDED, {...font, status: 'added'});
            // Add to the list of processed fonts to stop repeat downloads
            fontDownloadList.push(font);
            // Handle font load success and failure
            customFont.load().then(
                () => {
                    // TODO: 'complete' property?
                    eventBus.trigger(Events.DVB_FONT_DOWNLOAD_COMPLETE, {...font, status: 'downloaded'});
                },
                (err) => {
                    // TODO: Font download failed event
                    // TODO: Setup listener on essential track initialisation if this failure event is triggered 
                    // then the track is removed from the track list.
                    eventBus.trigger(Events.DVB_FONT_DOWNLOAD_FAILED, { font: {...font, status: 'failed'}, track, streamId });
    
                    // TODO: Handle error better
                    console.error(err);
                }
            )
        }
    }

    /**
     * Handle subtitles tracks to check if 
     * @param {Object} track - Subtitles track information
     * @param {Object} track - Track information
     * @param {Number} streamId - StreamId
     */
    function _handleDvbCustomFonts(track, streamId) {
        let essentialProperty = false;
        let dvbFontProps;
        
        // TODO: Filter is better? Filter is definitely better.
        const essentialTags = track.essentialPropertiesAsArray.map(tag => {
            if (tag.schemeIdUri && tag.schemeIdUri === Constants.FONT_DOWNLOAD_DVB_SCHEME) {
                return tag;
            }
        });
        const supplementalTags = track.supplementalPropertiesAsArray.map(tag => {
            if (tag.schemeIdUri && tag.schemeIdUri === Constants.FONT_DOWNLOAD_DVB_SCHEME) {
                return tag;
            }
        });

        // When it comes to the property descriptors it's Essential OR Supplementary, with Essential taking preference
        if (essentialTags.length > 0) {
            essentialProperty = true;
            dvbFontProps = essentialTags;
        } else {
            dvbFontProps = supplementalTags;
        }

        dvbFontProps.forEach(attrs => {
            if (_hasMandatoryDvbFontAttributes(attrs)) {
                const resolvedFontUrl = _resolveFontUrl(attrs.dvb_url, track);
                if (resolvedFontUrl !== null) {

                    const font = {
                        fontFamily: _prefixDvbCustomFont(attrs.dvb_fontFamily),
                        url: resolvedFontUrl,
                        mimeType: attrs.dvb_mimeType,
                        isEssential: essentialProperty
                    }
                    _downloadDvbCustomFont(font, track, streamId);
                }
            }
        });

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

        // TODO: Neater
        for (let i = 0; i < tracks.length; i++) {
            let track = tracks[i];            
            _handleDvbCustomFonts(track, streamId);
        };
    }

    function _onPlaybackTimeUpdated(e) {
        try {
            const streamId = e.streamId;

            if (!textTracks[streamId] || isNaN(e.time)) {
                return;
            }
            textTracks[streamId].manualCueProcessing(e.time);
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
        fontDownloadList = [];
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);
        eventBus.off(Events.DVB_FONT_DOWNLOAD_FAILED, _onEssentialFontDownloadFailure, instance);
        if (settings.get().streaming.text.webvtt.customRenderingEnabled) {
            eventBus.off(Events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
            eventBus.off(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, instance)
        }

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
