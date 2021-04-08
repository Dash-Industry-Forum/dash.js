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

    const streamInfo = config.streamInfo;
    const adapter = config.adapter;
    const errHandler = config.errHandler;
    const manifestModel = config.manifestModel;
    const mediaController = config.mediaController;
    const videoModel = config.videoModel;
    const stream = config.stream;
    const settings = config.settings;

    let instance,
        textSourceBuffer,
        textTracks,
        vttParser,
        ttmlParser,
        eventBus,
        defaultSettings,
        initialSettingsSet,
        lastEnabledIndex,
        allTracksAreDisabled, // this is used for one session (when a file has been loaded, we use this settings to enable/disable text)
        forceTextStreaming,
        textTracksAdded,
        disableTextBeforeTextTracksAdded;

    function setup() {
        defaultSettings = null;
        lastEnabledIndex = -1;
        forceTextStreaming = false;
        textTracksAdded = false;
        initialSettingsSet = false;
        disableTextBeforeTextTracksAdded = false;

        textTracks = TextTracks(context).create({
            videoModel,
            streamInfo
        });
        textTracks.initialize();

        vttParser = VTTParser(context).getInstance();
        ttmlParser = TTMLParser(context).getInstance();
        textSourceBuffer = TextSourceBuffer(context).create({
            errHandler,
            adapter,
            manifestModel,
            mediaController,
            videoModel,
            textTracks,
            vttParser,
            ttmlParser,
            streamInfo
        });

        textSourceBuffer.initialize();

        eventBus = EventBus(context).getInstance();
        eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
        eventBus.on(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);

        resetInitialSettings();
    }

    function getStreamId() {
        return streamInfo.id;
    }

    /**
     * All media infos have been added. Start creating the track objects
     */
    function createTracks() {
        textTracks.createTracks();
    }

    /**
     * Adds the new mediaInfo objects to the textSourceBuffer.
     * @param {array} mInfos
     * @param {string} mimeType
     * @param {object} fragmentModel
     */
    function addMediaInfosToBuffer(mInfos, mimeType, fragmentModel) {
        textSourceBuffer.addMediaInfos(mInfos, mimeType, fragmentModel);
    }

    function getTextSourceBuffer() {
        return textSourceBuffer;
    }

    function getAllTracksAreDisabled() {
        return allTracksAreDisabled;
    }

    function addEmbeddedTrack(mediaInfo) {
        textSourceBuffer.addEmbeddedTrack(mediaInfo);
    }

    function setInitialSettings(settings) {
        defaultSettings = settings;
        initialSettingsSet = true;
    }

    function _onTextTracksAdded(e) {
        let tracks = e.tracks;
        let index = e.index;


        const textDefaultEnabled = settings.get().streaming.text.defaultEnabled;

        if (textDefaultEnabled === false || disableTextBeforeTextTracksAdded) {
            // disable text at startup if explicitly configured with setTextDefaultEnabled(false) or if there is no defaultSettings (configuration or from domStorage)
            setTextTrack(-1);
        } else {
            if (defaultSettings) {
                tracks.some((item, idx) => {
                    // matchSettings is compatible with setTextDefaultLanguage and setInitialSettings
                    if (mediaController.matchSettings(defaultSettings, item)) {
                        setTextTrack(idx);
                        index = idx;
                        return true;
                    }
                });
            }
            allTracksAreDisabled = false;
        }

        lastEnabledIndex = index;

        eventBus.trigger(MediaPlayerEvents.TEXT_TRACKS_ADDED, {
            enabled: isTextEnabled(),
            index: index,
            tracks: tracks,
            streamInfo
        });

        textTracksAdded = true;
    }

    function onCurrentTrackChanged(event) {
        if (!initialSettingsSet && event && event.newMediaInfo) {
            let mediaInfo = event.newMediaInfo;
            if (mediaInfo.type === Constants.FRAGMENTED_TEXT) {
                defaultSettings = {
                    lang: mediaInfo.lang,
                    role: mediaInfo.roles[0],
                    accessibility: mediaInfo.accessibility[0]
                };
            }
        }
    }

    function enableText(enable) {
        checkParameterType(enable, 'boolean');
        settings.update({ streaming: { text: { defaultEnabled: enable } } });
        if (isTextEnabled() !== enable) {
            // change track selection
            if (enable) {
                // apply last enabled track
                setTextTrack(lastEnabledIndex);
            }

            if (!enable) {
                // keep last index and disable text track
                lastEnabledIndex = getCurrentTrackIdx();
                if (!textTracksAdded) {
                    disableTextBeforeTextTracksAdded = true;
                } else {
                    setTextTrack(-1);
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

    function setTextTrack(idx) {
        //For external time text file, the only action needed to change a track is marking the track mode to showing.
        // Fragmented text tracks need the additional step of calling TextController.setTextTrack();
        allTracksAreDisabled = idx === -1;

        settings.update({ streaming: { text: { defaultEnabled: allTracksAreDisabled } } });

        if (allTracksAreDisabled && mediaController) {
            mediaController.saveTextSettingsDisabled();
        }

        let oldTrackIdx = textTracks.getCurrentTrackIdx();

        // No change, no action required
        if (oldTrackIdx === idx) {
            return;
        }

        textTracks.setModeForTrackIdx(oldTrackIdx, Constants.TEXT_HIDDEN);
        textTracks.setCurrentTrackIdx(idx);
        textTracks.setModeForTrackIdx(idx, Constants.TEXT_SHOWING);

        let currentTrackInfo = textTracks.getCurrentTrackInfo();

        if (currentTrackInfo && currentTrackInfo.isFragmented && !currentTrackInfo.isEmbedded) {
            _setFragmentedTextTrack(currentTrackInfo, oldTrackIdx);
        } else if (currentTrackInfo && !currentTrackInfo.isFragmented) {
            _setNonFragmentedTextTrack(currentTrackInfo);
        }
    }

    function _setFragmentedTextTrack(currentTrackInfo, oldTrackIdx) {
        let config = textSourceBuffer.getConfig();
        let fragmentedTracks = config.fragmentedTracks;

        for (let i = 0; i < fragmentedTracks.length; i++) {
            let mediaInfo = fragmentedTracks[i];
            if (currentTrackInfo.lang === mediaInfo.lang && currentTrackInfo.index === mediaInfo.index &&
                (mediaInfo.id ? currentTrackInfo.id === mediaInfo.id : currentTrackInfo.id === mediaInfo.index)) {
                let currentFragTrack = mediaController.getCurrentTrackFor(Constants.FRAGMENTED_TEXT, streamInfo);
                if (mediaInfo !== currentFragTrack) {
                    textTracks.deleteCuesFromTrackIdx(oldTrackIdx);
                    mediaController.setTrack(mediaInfo);
                    textSourceBuffer.setCurrentFragmentedTrackIdx(i);
                }
            } else if (oldTrackIdx === -1) {
                //in fragmented use case, if the user selects the older track (the one selected before disabled text track)
                //no CURRENT_TRACK_CHANGED event will be triggered because the mediaInfo in the StreamProcessor is equal to the one we are selecting
                // For that reason we reactivate the StreamProcessor and the ScheduleController
                const streamProcessors = stream.getProcessors();
                let streamProcessor;

                for (let i = 0; i < streamProcessors.length; i++) {
                    if (streamProcessors[i].getType() === Constants.FRAGMENTED_TEXT) {
                        streamProcessor = streamProcessors[i];
                        break;
                    }
                }

                streamProcessor.setExplicitBufferingTime(videoModel.getTime());
                streamProcessor.getScheduleController().startScheduleTimer();
            }
        }
    }

    function _setNonFragmentedTextTrack(currentTrackInfo) {
        let mediaInfosArr,
            streamProcessor;

        const streamProcessors = stream.getProcessors();

        for (let i = 0; i < streamProcessors.length; i++) {
            if (streamProcessors[i].getType() === Constants.TEXT) {
                streamProcessor = streamProcessors[i];
                mediaInfosArr = streamProcessor.getMediaInfoArr();
                break;
            }
        }

        if (streamProcessor && mediaInfosArr) {
            for (let i = 0; i < mediaInfosArr.length; i++) {
                if (mediaInfosArr[i].index === currentTrackInfo.index && mediaInfosArr[i].lang === currentTrackInfo.lang) {
                    streamProcessor.selectMediaInfo(mediaInfosArr[i]);
                    _prepareStreamProcessorForTrackSwitch(streamProcessor);
                    break;
                }
            }
        }
    }

    function _prepareStreamProcessorForTrackSwitch(streamProcessor) {
        if (streamProcessor) {
            streamProcessor.getBufferController().setIsBufferingCompleted(false);
            streamProcessor.setExplicitBufferingTime(videoModel.getTime());
            streamProcessor.getScheduleController().setInitSegmentRequired(true);
            streamProcessor.getScheduleController().startScheduleTimer();
        }
    }

    function getCurrentTrackIdx() {
        return textTracks.getCurrentTrackIdx();
    }

    function deactivate() {
        textSourceBuffer.resetMediaInfos();
        textTracks.deleteAllTextTracks();
    }

    function resetInitialSettings() {
        allTracksAreDisabled = true;
        textTracksAdded = false;
        disableTextBeforeTextTracksAdded = false;
    }

    function reset() {
        resetInitialSettings();
        eventBus.off(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
        eventBus.off(Events.TEXT_TRACKS_QUEUE_INITIALIZED, _onTextTracksAdded, instance);
        textSourceBuffer.resetEmbedded();
        textSourceBuffer.reset();
    }

    instance = {
        deactivate,
        getStreamId,
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
