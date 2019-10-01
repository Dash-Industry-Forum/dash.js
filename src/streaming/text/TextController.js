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
import { checkParameterType } from '../utils/SupervisorTools';

function TextController() {

    let context = this.context;

    let instance,
        textSourceBuffer,
        errHandler,
        adapter,
        manifestModel,
        mediaController,
        videoModel,
        streamController,
        textTracks,
        vttParser,
        ttmlParser,
        eventBus,
        defaultLanguage,
        lastEnabledIndex,
        textDefaultEnabled, // this is used for default settings (each time a file is loaded, we check value of this settings )
        allTracksAreDisabled, // this is used for one session (when a file has been loaded, we use this settings to enable/disable text)
        forceTextStreaming,
        previousPeriodSelectedTrack;

    function setup() {

        defaultLanguage = '';
        lastEnabledIndex = -1;
        textDefaultEnabled = true;
        forceTextStreaming = false;
        textTracks = TextTracks(context).getInstance();
        vttParser = VTTParser(context).getInstance();
        ttmlParser = TTMLParser(context).getInstance();
        textSourceBuffer = TextSourceBuffer(context).getInstance();
        eventBus = EventBus(context).getInstance();

        textTracks.initialize();
        eventBus.on(Events.TEXT_TRACKS_QUEUE_INITIALIZED, onTextTracksAdded, instance);

        /*
        * register those event callbacks in order to detect switch of periods and set
        * correctly the selected track index in the new period.
        * there is different cases :
        *   - switch occurs after a seek command from the user
        *   - switch occurs but codecs in streams are different
        *   - switch occurs and codecs in streams are not different
        */
        eventBus.on(Events.PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, instance);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, instance);
        eventBus.on(Events.PERIOD_SWITCH_COMPLETED, onPeriodSwitchCompleted, instance);

        resetInitialSettings();
    }

    function onPeriodSwitchStarted(e) {
        if (previousPeriodSelectedTrack === undefined && e.fromStreamInfo !== null /* test if this is the first period */) {
            previousPeriodSelectedTrack = this.getCurrentTrackIdx();
        }
    }

    function onStreamCompleted() {
        if (previousPeriodSelectedTrack === undefined) {
            previousPeriodSelectedTrack = this.getCurrentTrackIdx();
        }
    }

    function onPeriodSwitchCompleted() {
        if (previousPeriodSelectedTrack !== undefined) {
            this.setTextTrack(previousPeriodSelectedTrack);
            previousPeriodSelectedTrack = undefined;
        }
    }

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.textTracks) {
            textTracks = config.textTracks;
        }
        if (config.vttParser) {
            vttParser = config.vttParser;
        }
        if (config.ttmlParser) {
            ttmlParser = config.ttmlParser;
        }

        // create config for source buffer
        textSourceBuffer.setConfig({
            errHandler: errHandler,
            adapter: adapter,
            manifestModel: manifestModel,
            mediaController: mediaController,
            videoModel: videoModel,
            streamController: streamController,
            textTracks: textTracks,
            vttParser: vttParser,
            ttmlParser: ttmlParser
        });
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

    function setTextDefaultLanguage(lang) {
        checkParameterType(lang, 'string');
        defaultLanguage = lang;
    }

    function getTextDefaultLanguage() {
        return defaultLanguage;
    }

    function onTextTracksAdded(e) {
        let tracks = e.tracks;
        let index = e.index;

        tracks.some((item, idx) => {
            if (item.lang === defaultLanguage) {
                this.setTextTrack(idx);
                index = idx;
                return true;
            }
        });

        if (!textDefaultEnabled) {
            // disable text at startup
            this.setTextTrack(-1);
        }

        lastEnabledIndex = index;
        eventBus.trigger(Events.TEXT_TRACKS_ADDED, {
            enabled: isTextEnabled(),
            index: index,
            tracks: tracks
        });
    }

    function setTextDefaultEnabled(enable) {
        checkParameterType(enable,'boolean');
        textDefaultEnabled = enable;

        if (!textDefaultEnabled) {
            // disable text at startup
            this.setTextTrack(-1);
        }
    }

    function getTextDefaultEnabled() {
        return textDefaultEnabled;
    }

    function enableText(enable) {
        checkParameterType(enable,'boolean');

        if (isTextEnabled() !== enable) {
            // change track selection
            if (enable) {
                // apply last enabled tractk
                this.setTextTrack(lastEnabledIndex);
            }

            if (!enable) {
                // keep last index and disable text track
                lastEnabledIndex = this.getCurrentTrackIdx();
                this.setTextTrack(-1);
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

    // when set to true NextFragmentRequestRule will allow schedule of chunks even if tracks are all disabled. Allowing streaming to hidden track for external players to work with.
    function enableForcedTextStreaming(enable) {
        checkParameterType(enable,'boolean');
        forceTextStreaming = enable;
    }

    function setTextTrack(idx) {
        //For external time text file,  the only action needed to change a track is marking the track mode to showing.
        // Fragmented text tracks need the additional step of calling TextController.setTextTrack();
        let config = textSourceBuffer.getConfig();
        let fragmentModel = config.fragmentModel;
        let fragmentedTracks = config.fragmentedTracks;
        let videoModel = config.videoModel;
        let mediaInfosArr,
            streamProcessor;

        allTracksAreDisabled = idx === -1 ? true : false;

        let oldTrackIdx = textTracks.getCurrentTrackIdx();
        if (oldTrackIdx !== idx) {
            textTracks.setModeForTrackIdx(oldTrackIdx, Constants.TEXT_HIDDEN);
            textTracks.setCurrentTrackIdx(idx);
            textTracks.setModeForTrackIdx(idx, Constants.TEXT_SHOWING);

            let currentTrackInfo = textTracks.getCurrentTrackInfo();

            if (currentTrackInfo && currentTrackInfo.isFragmented && !currentTrackInfo.isEmbedded) {
                for (let i = 0; i < fragmentedTracks.length; i++) {
                    let mediaInfo = fragmentedTracks[i];
                    if (currentTrackInfo.lang === mediaInfo.lang && currentTrackInfo.index === mediaInfo.index &&
                        (mediaInfo.id ? currentTrackInfo.id === mediaInfo.id : currentTrackInfo.id === mediaInfo.index)) {
                        let currentFragTrack = mediaController.getCurrentTrackFor(Constants.FRAGMENTED_TEXT, streamController.getActiveStreamInfo());
                        if (mediaInfo !== currentFragTrack) {
                            fragmentModel.abortRequests();
                            fragmentModel.removeExecutedRequestsBeforeTime();
                            textSourceBuffer.remove();
                            textTracks.deleteCuesFromTrackIdx(oldTrackIdx);
                            mediaController.setTrack(mediaInfo);
                            textSourceBuffer.setCurrentFragmentedTrackIdx(i);
                        } else if (oldTrackIdx === -1) {
                            //in fragmented use case, if the user selects the older track (the one selected before disabled text track)
                            //no CURRENT_TRACK_CHANGED event will be trigger, so dashHandler current time has to be updated and the scheduleController
                            //has to be restarted.
                            const streamProcessors = streamController.getActiveStreamProcessors();
                            for (let i = 0; i < streamProcessors.length; i++) {
                                if (streamProcessors[i].getType() === Constants.FRAGMENTED_TEXT) {
                                    streamProcessor = streamProcessors[i];
                                    break;
                                }
                            }
                            streamProcessor.setIndexHandlerTime(videoModel.getTime());
                            streamProcessor.getScheduleController().start();
                        }
                    }
                }
            } else if (currentTrackInfo && !currentTrackInfo.isFragmented) {
                const streamProcessors = streamController.getActiveStreamProcessors();
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
                            break;
                        }
                    }
                }
            }
        }
    }

    function getCurrentTrackIdx() {
        return textTracks.getCurrentTrackIdx();
    }

    function resetInitialSettings() {
        allTracksAreDisabled = false;
    }

    function reset() {
        resetInitialSettings();
        textSourceBuffer.resetEmbedded();
        textSourceBuffer.reset();
    }

    instance = {
        setConfig: setConfig,
        getTextSourceBuffer: getTextSourceBuffer,
        getAllTracksAreDisabled: getAllTracksAreDisabled,
        addEmbeddedTrack: addEmbeddedTrack,
        getTextDefaultLanguage: getTextDefaultLanguage,
        setTextDefaultLanguage: setTextDefaultLanguage,
        setTextDefaultEnabled: setTextDefaultEnabled,
        getTextDefaultEnabled: getTextDefaultEnabled,
        enableText: enableText,
        isTextEnabled: isTextEnabled,
        setTextTrack: setTextTrack,
        getCurrentTrackIdx: getCurrentTrackIdx,
        enableForcedTextStreaming: enableForcedTextStreaming,
        reset: reset
    };
    setup();
    return instance;
}

TextController.__dashjs_factory_name = 'TextController';
export default FactoryMaker.getSingletonFactory(TextController);
