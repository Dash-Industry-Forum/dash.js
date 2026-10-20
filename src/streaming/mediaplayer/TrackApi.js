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
import DashConstants from '../../dash/constants/DashConstants.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import {
    ARRAY_NOT_SUPPORTED_ERROR,
    MEDIA_PLAYER_NOT_INITIALIZED_ERROR,
    STREAMING_NOT_INITIALIZED_ERROR
} from './MediaPlayerApiErrors.js';

function TrackApi() {
    let instance,
        state,
        mediaPlayer;

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.state) {
            state = config.state;
        }
        if (config.mediaPlayer) {
            mediaPlayer = config.mediaPlayer;
        }
    }

    /**
     * Returns the average latency computed in the ThroughputController in milliseconds
     *
     * @param {MediaType} type
     * @param {string} calculationMode
     * @param {number} sampleSize
     * @return {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getAverageLatency(type = Constants.VIDEO, calculationMode = null, sampleSize = NaN) {
        return state.throughputController ? state.throughputController.getAverageLatency(type, calculationMode, sampleSize) : 0;
    }

    /**
     * Returns the average throughput computed in the ThroughputController in kbit/s
     *
     * @param {MediaType} type
     * @param {string} calculationMode
     * @param {number} sampleSize
     * @return {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getAverageThroughput(type = Constants.VIDEO, calculationMode = null, sampleSize = NaN) {
        return state.throughputController ? state.throughputController.getAverageThroughput(type, calculationMode, sampleSize) : 0;
    }

    /**
     * Returns the safe average throughput computed in the ThroughputController in kbit/s. The safe average throughput is the average throughput multiplied by bandwidthSafetyFactor
     *
     * @param {MediaType} type
     * @param {string} calculationMode
     * @param {number} sampleSize
     * @return {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getSafeAverageThroughput(type = Constants.VIDEO, calculationMode = null, sampleSize = NaN) {
        return state.throughputController ? state.throughputController.getSafeAverageThroughput(type, calculationMode, sampleSize) : 0;
    }

    /**
     *  Returns the raw throughput data without calculating the average. This can be used to calculate the current throughput yourself.
     *
     * @param {MediaType} type
     * @return {Array} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function getRawThroughputData(type = Constants.VIDEO) {
        return state.throughputController ? state.throughputController.getRawThroughputData(type) : [];
    }

    /**
     * Gets the current download quality for media type video, audio or images. For video and audio types the ABR
     * rules update this value before every new download unless autoSwitchBitrate is set to false. For 'image'
     * type, thumbnails, there is no ABR algorithm and quality is set manually.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image' (thumbnails)
     * @returns {Representation | null} the quality index, 0 corresponding to the lowest bitrate
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#getCurrentRepresentationForType getCurrentRepresentationForType()}
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getCurrentRepresentationForType(type) {
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }

        if (type !== Constants.IMAGE && type !== Constants.VIDEO && type !== Constants.AUDIO) {
            return null;
        }

        const activeStream = mediaPlayer.getActiveStream();
        if (!activeStream) {
            return null;
        }

        if (type === Constants.IMAGE) {
            const thumbnailController = activeStream.getThumbnailController();
            return !thumbnailController ? -1 : thumbnailController.getCurrentTrack();
        }

        return activeStream.getCurrentRepresentationForType(type);
    }

    /**
     * Sets the current quality for media type instead of letting the ABR Heuristics automatically select it.
     * This value will be overwritten by the ABR rules unless autoSwitchBitrate is set to false.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image'
     * @param {number} id , The ID of the Representation
     * @param {boolean} forceReplace - true if segments have to be replaced by segments of the new quality
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setRepresentationForTypeById(type, id, forceReplace = false) {
        if (type !== Constants.IMAGE && type !== Constants.VIDEO && type !== Constants.AUDIO) {
            return;
        }
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        const activeStream = mediaPlayer.getActiveStream();
        if (!activeStream) {
            return;
        }
        if (type === Constants.IMAGE) {
            const thumbnailController = activeStream.getThumbnailController();
            if (thumbnailController) {
                thumbnailController.setTrackById(id);
            }
        } else {
            const representation = activeStream.getRepresentationForTypeById(type, id);
            if (representation) {
                state.abrController.manuallySetPlaybackQuality(type, state.streamController.getActiveStreamInfo(), representation, { forceReplace });
            }
        }
    }

    /**
     * Sets the current quality for media type instead of letting the ABR Heuristics automatically select it.
     * This value will be overwritten by the ABR rules unless autoSwitchBitrate is set to false.
     * Note that you need to specify a relative index based on the position of the target entry in the return value of getRepresentationsByType().
     * Do NOT use representation.absoluteIndex here as this index was assigned prior to applying any filter function. If you want to select a specific representation then use setRepresentationForTypeById() instead.
     *
     * @param {MediaType} type - 'video', 'audio' or 'image'
     * @param {number} index - the quality index, 0 corresponding to the lowest possible index
     * @param {boolean} forceReplace - true if segments have to be replaced by segments of the new quality
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setRepresentationForTypeByIndex(type, index, forceReplace = false) {
        if (type !== Constants.IMAGE && type !== Constants.VIDEO && type !== Constants.AUDIO) {
            return;
        }
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        const activeStream = mediaPlayer.getActiveStream();
        if (!activeStream) {
            return;
        }
        if (type === Constants.IMAGE) {
            const thumbnailController = activeStream.getThumbnailController();
            if (thumbnailController) {
                thumbnailController.setTrackByIndex(index);
            }
        } else {
            const representation = activeStream.getRepresentationForTypeByIndex(type, index);
            if (representation) {
                state.abrController.manuallySetPlaybackQuality(type, state.streamController.getActiveStreamInfo(), representation, { forceReplace });
            }
        }
    }

    /**
     * This method returns the list of all available representations for a given media type. The returned list is filtered according to the current ABR rules (e.g. max/min bitrate and limitBitrateByPortal).
     * If you want to get the unfiltered list of representations then use getRepresentationsByTypeUnfiltered() instead.
     * @param {MediaType} type
     * @param {string} streamId
     * @returns {Array}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getRepresentationsByType(type, streamId = null) {
        return _getRepresentations(type, streamId, true);
    }

    /**
     * This method returns the list of all available representations for a given media type. The returned list is unfiltered and settings like max/min bitrate and limitBitrateByPortal are not taken into account.
     * If you want to get the filtered list of representations then use getRepresentationsByType() instead.
     * @param {MediaType} type
     * @param {string} streamId
     * @returns {Array}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getRepresentationsByTypeUnfiltered(type, streamId = null) {
        return _getRepresentations(type, streamId, false);
    }

    function _getRepresentations(type, streamId, filterBySettings = true) {
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let stream = streamId ? state.streamController.getStreamById(streamId) : mediaPlayer.getActiveStream();
        return stream ? stream.getRepresentationsByType(type, filterBySettings) : [];
    }

    /**
     * This method returns the list of all available tracks for a given media type
     * @param {MediaType} type
     * @returns {Array} list of {@link MediaInfo}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getTracksFor(type) {
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let streamInfo = state.streamController.getActiveStreamInfo();

        if (!streamInfo) {
            return [];
        }

        const tracks = state.mediaController.getTracksFor(type, streamInfo.id);
        return tracks.filter((track) => {
            return state.protectionController ? state.protectionController.areKeyIdsUsable(track.normalizedKeyIds) : true
        })
    }

    /**
     * @param {MediaType} type
     * @returns {Object|null} {@link MediaInfo}
     *
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function getCurrentTrackFor(type) {
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }
        let streamInfo = state.streamController.getActiveStreamInfo();
        if (streamInfo) {
            return state.mediaController.getCurrentTrackFor(type, streamInfo.id);
        }

        return null
    }

    /**
     * This method allows to set media settings that will be used to pick the initial track. The settings object supports the following properties:
     * <ul>
     * <li><code>lang</code>: a string primitive, a string object, or a RegExp object to match</li>
     * <li><code>index</code>: the index of the track</li>
     * <li><code>viewpoint</code>: object <code>{schemeIdUri, value}</code> or value-primitive</li>
     * <li><code>audioChannelConfiguration</code>: object <code>{schemeIdUri, value}</code> or value-primitive (assumes schemeIdUri='urn:mpeg:mpegB:cicp:ChannelConfiguration')</li>
     * <li><code>accessibility</code>: object <code>{schemeIdUri, value}</code> or value-primitive (assumes schemeIdUri='urn:mpeg:dash:role:2011')</li>
     * <li><code>role</code>: object <code>{schemeIdUri, value}</code> or value-primitive (assumes schemeIdUri='urn:mpeg:dash:role:2011')</li>
     * <li><code>codec</code>: full codec string as exposed in MediaInfo.codec, e.g. <code>'audio/mp4;codecs="ec-3"'</code>, compared with strict equality</li>
     * </ul>
     *
     * @example
     * player.setInitialMediaSettingsFor('audio', {
     *     lang: 'de',
     *     role: 'main',
     *     codec: 'audio/mp4;codecs="ec-3"'
     * });
     * @param {MediaType} type
     * @param {Object} value
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     * @instance
     */
    function setInitialMediaSettingsFor(type, value) {
        if (!state.mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }
        let sanitizedValue = _sanitizeSettings(value);
        state.mediaController.setInitialSettings(type, sanitizedValue);
    }

    /**
     * This method returns the media settings that are used to pick the initial track.
     *
     * @example
     * // Returned object has the following format:
     * {
     *     lang: langValue,
     *     index: indexValue,
     *     viewpoint: viewpointValue,
     *     audioChannelConfiguration: audioChannelConfigurationValue,
     *     accessibility: accessibilityValue,
     *     role: roleValue,
     *     codec: codecValue
     * }
     * @param {MediaType} type
     * @returns {Object}
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     * @instance
     */
    function getInitialMediaSettingsFor(type) {
        if (!state.mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }
        return state.mediaController.getInitialSettings(type);
    }

    /**
     * @param {MediaInfo} track - instance of {@link MediaInfo}
     * @param {boolean} [noSettingsSave] - specify if settings from the track must not be saved for incoming track selection
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~STREAMING_NOT_INITIALIZED_ERROR STREAMING_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function setCurrentTrack(track, noSettingsSave = false) {
        if (!state.streamingInitialized) {
            throw STREAMING_NOT_INITIALIZED_ERROR;
        }

        const canUseTrack = state.protectionController ? state.protectionController.areKeyIdsUsable(track.normalizedKeyIds) : true

        if (!canUseTrack) {
            state.logger.error(`Can not switch to track with index ${track.index} because key is not usable`);
            return
        }

        state.mediaController.setTrack(track, { noSettingsSave });
    }

    /**
     * Provide the thumbnail at time position. This can be asynchronous, so you must provide a callback ro retrieve thumbnails informations
     * @param {number} time - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected
     * @param {function} callback - A Callback function provided when retrieving thumbnail the given time position. Thumbnail object is null in case there are is not a thumbnails representation or
     * if it doesn't contain a thumbnail for the given time position.
     * @memberof module:MediaPlayer
     * @instance
     */
    function provideThumbnail(time, callback) {
        if (typeof callback !== 'function') {
            return;
        }
        if (time < 0) {
            callback(null);
            return;
        }
        const s = state.playbackController.getIsDynamic() ? mediaPlayer.getDvrSeekOffset(time) : time;
        const stream = state.streamController.getStreamForTime(s);
        if (stream === null) {
            callback(null);
            return;
        }

        const thumbnailController = stream.getThumbnailController();
        if (!thumbnailController) {
            callback(null);
            return;
        }

        return thumbnailController.provide(s, callback);
    }

    function _sanitizeSettings(value) {
        const defaults = state.settings.get().streaming.defaultSchemeIdUri;
        let output = {};

        function __sanitizeDescriptorType(name, val, defaultSchemeIdUri) {
            let out = {};
            // For an empty string, let's unset the descriptor, i.e. return null
            if (val) {
                if (val instanceof Array) {
                    throw ARRAY_NOT_SUPPORTED_ERROR;
                } else if (val instanceof Object) {
                    out.schemeIdUri = val.schemeIdUri ? val.schemeIdUri : '';
                    out.value = val.value ? val.value : '';
                } else {
                    out.schemeIdUri = defaultSchemeIdUri;
                    out.value = val;
                    state.logger.warn('No schemeIdUri provided for ' + name + ', using default \"' + defaultSchemeIdUri + '\"');
                }
                return out;
            }
            return null;
        }

        if (value.id !== undefined) {
            output.id = value.id;
        }
        if (value.lang !== undefined) {
            output.lang = value.lang;
        }
        if (!isNaN(value.index)) {
            output.index = value.index;
        }
        if (value.viewpoint !== undefined) {
            output.viewpoint = __sanitizeDescriptorType('viewpoint', value.viewpoint, defaults.viewpoint);
        }
        if (value.audioChannelConfiguration !== undefined) {
            output.audioChannelConfiguration = __sanitizeDescriptorType('audioChannelConfiguration', value.audioChannelConfiguration, defaults.audioChannelConfiguration);
        }
        if (value.role !== undefined && value.role !== null) {
            output.role = __sanitizeDescriptorType('role', value.role, defaults.role);

            // conceal misspelled "Main" from earlier MPEG-DASH editions (fixed with 6th edition)
            if (output.role.schemeIdUri === Constants.DASH_ROLE_SCHEME_ID && output.role.value === 'Main') {
                output.role.value = DashConstants.MAIN;
            }
        }
        if (value.accessibility !== undefined) {
            output.accessibility = __sanitizeDescriptorType('accessibility', value.accessibility, defaults.accessibility);
        }
        if (value.codec !== undefined) {
            output.codec = value.codec;
        }

        return output;
    }

    instance = {
        getAverageLatency,
        getAverageThroughput,
        getCurrentRepresentationForType,
        getCurrentTrackFor,
        getInitialMediaSettingsFor,
        getRawThroughputData,
        getRepresentationsByType,
        getRepresentationsByTypeUnfiltered,
        getSafeAverageThroughput,
        getTracksFor,
        provideThumbnail,
        setConfig,
        setCurrentTrack,
        setInitialMediaSettingsFor,
        setRepresentationForTypeById,
        setRepresentationForTypeByIndex,
    };

    return instance;
}

TrackApi.__dashjs_factory_name = 'TrackApi';
export default FactoryMaker.getClassFactory(TrackApi);
