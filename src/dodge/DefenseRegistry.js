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

import Debug from '../core/Debug.js';
import FactoryMaker from '../core/FactoryMaker.js';

/**
 * Validate init cycles in a stream entry. Check that each range, if
 * present, is a string of the form "<start>-<end>" with start <= end.
 * @param {Object} stream - The stream entry from an extended manifest.
 * @param {Object} [logger] - Optional logger for rejection messages.
 * @returns {boolean} True if all init cycles are valid.
 */
function checkInitCycles(stream, logger) {
    for (let i = 0; i < stream['init'].length; i++) {
        const range = stream['init'][i].range;

        // range is optional but, when present, MUST be a string of the form
        // "<start>-<end>". Either bound MAY be omitted (e.g. "-855" or "44-"),
        // in which case it defaults to 0 or the end of the resource.
        if (range !== undefined && range !== null) {
            if (typeof range !== 'string' && !(range instanceof String)) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid range');
                }
                return false;
            }

            const rangeTokens = range.split('-');
            if (rangeTokens.length != 2 || isNaN(rangeTokens[0]) || isNaN(rangeTokens[1])) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid range');
                }
                return false;
            }
            let rs = parseInt(rangeTokens[0], 10);
            let re = parseInt(rangeTokens[1], 10);
            if (isNaN(rs)) {
                rs = 0;
            }
            if (isNaN(re)) {
                re = Number.MAX_SAFE_INTEGER;
            }

            // Range start MUST NOT exceed range end.
            if (rs > re) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid range');
                }
                return false;
            }
        }

        // padding MUST be a boolean (or a string parseable to boolean), or absent.
        let padding = stream['init'][i].padding;
        if (padding !== undefined && padding !== null) {
            if (typeof padding === 'string') {
                if (padding === 'true') {
                    padding = true;
                } else if (padding === 'false') {
                    padding = false;
                } else {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid padding value');
                    }
                    return false;
                }
                stream['init'][i].padding = padding;
            } else if (typeof padding !== 'boolean') {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid padding value');
                }
                return false;
            }
        }

        // buffer MUST be a boolean (or a string parseable to boolean), or absent.
        // Array buffer is NOT valid on init cycles.
        let buffer = stream['init'][i].buffer;
        if (buffer !== undefined && buffer !== null) {
            if (Array.isArray(buffer)) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', buffer must not be an array');
                }
                return false;
            } else if (typeof buffer === 'string') {
                if (buffer === 'true') {
                    buffer = true;
                } else if (buffer === 'false') {
                    buffer = false;
                } else {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid buffer value');
                    }
                    return false;
                }
                stream['init'][i].buffer = buffer;
            } else if (typeof buffer !== 'boolean') {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid buffer value');
                }
                return false;
            }
        }
    }

    // Buffer flags on init cycles are ignored by getInitRequest() (it always
    // sets buffer = full on the last init cycle). But for correctness, either
    // no init cycle should carry a buffer flag, or only the last one.
    for (let i = 0; i < stream['init'].length - 1; i++) {
        if (stream['init'][i].buffer) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', unexpected buffer flag');
            }
            return false;
        }
    }

    return true;
}

/**
 * Validate data cycles in a stream entry. Check that segment indices are
 * non-negative, non-padding cycles are monotonically non-decreasing and do not
 * contain duplicate segment downloads, ranges are well-formed, and consecutive
 * partial ranges do not skip bytes. Set `stream.maxNoPad` to the index of the
 * last non-padding cycle.
 * @param {Object} stream - The stream entry from an extended manifest.
 * @param {Object} [logger] - Optional logger for rejection messages.
 * @returns {boolean} True if all data cycles are valid.
 */
function checkDataCycles(stream, logger) {
    let rangeEnd = -1; // end of current partial segment range
    let maxIndex = -1; // maximum segment index encountered so far
    let maxNoPad = -1; // maximum non-padding cycle index found

    for (let i = 0; i < stream['data'].length; i++) {
        const range = stream['data'][i].range;
        let padding = stream['data'][i].padding;

        // padding MUST be a boolean (or a string parseable to boolean), or absent.
        if (padding !== undefined && padding !== null) {
            if (typeof padding === 'string') {
                if (padding === 'true') {
                    padding = true;
                } else if (padding === 'false') {
                    padding = false;
                } else {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid padding value');
                    }
                    return false;
                }
                stream['data'][i].padding = padding;
            } else if (typeof padding !== 'boolean') {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid padding value');
                }
                return false;
            }
        }

        // buffer MUST be a boolean (or a string parseable to boolean), an array
        // of non-negative integers, or absent.
        let buffer = stream['data'][i].buffer;
        if (buffer !== undefined && buffer !== null) {
            if (Array.isArray(buffer)) {
                for (let j = 0; j < buffer.length; j++) {
                    const elem = Number(buffer[j]);
                    if (isNaN(elem) || elem < 0 || !Number.isInteger(elem)) {
                        if (logger) {
                            logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid buffer array element at position ' + j);
                        }
                        return false;
                    }
                    buffer[j] = elem;
                }
                stream['data'][i].buffer = buffer;
            } else if (typeof buffer === 'string') {
                if (buffer === 'true') {
                    buffer = true;
                } else if (buffer === 'false') {
                    buffer = false;
                } else {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid buffer value');
                    }
                    return false;
                }
                stream['data'][i].buffer = buffer;
            } else if (typeof buffer !== 'boolean') {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid buffer value');
                }
                return false;
            }
        }

        // quality is optional. When present, it selects an alternate
        // representation in the same adaptation set to fetch this cycle from.
        // Accepted forms: a non-empty string (matched against representation.id
        // at request time) or a non-negative integer (index into the array
        // returned by adapter.getVoRepresentations(mediaInfo)). Numeric strings
        // are kept as strings and treated as representation IDs (with a warning);
        // use a JSON number if an index is intended. Actual resolution against
        // the MPD's representations is deferred to DodgeDashHandlerOverride,
        // since the registry has no access to them.
        let quality = stream['data'][i].quality;
        if (quality !== undefined && quality !== null) {
            if (typeof quality === 'string') {
                if (quality.length === 0) {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid quality override (empty string)');
                    }
                    return false;
                }
                // Since other fields can be strings as long as they resolve to
                // integers, warn here that strings containing numbers will be
                // interpreted as representation IDs (use a JSON number if an
                // index is intended).
                const qint = Number(quality);
                if (!isNaN(qint) && Number.isInteger(qint)) {
                    if (logger) {
                        logger.warn('Extended manifest parsing: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', quality override resolves to an integer ' + qint + ', treating as a representation ID');
                    }
                }
            } else if (typeof quality === 'number') {
                if (!Number.isInteger(quality) || quality < 0) {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid quality override (must be a non-negative integer)');
                    }
                    return false;
                }
            } else {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid quality override');
                }
                return false;
            }
        }

        // Every data cycle MUST have a non-negative integer segment index.
        // Strings are accepted if they parse to a non-negative integer.
        const idx = Number(stream['data'][i].index);
        if (isNaN(idx) || idx < 0 || !Number.isInteger(idx)) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid index');
            }
            return false;
        }

        // While a partial sequence is in progress for segment maxIndex (rangeEnd >= 0),
        // the next non-padding cycle MUST have index >= maxIndex.
        //
        // Once a segment is complete (rangeEnd == -1), the next non-padding cycle MUST
        // have index > maxIndex; revisiting a completed segment is not allowed.
        //
        // Padding cycles may have any index; they have no requirements.
        if (!padding) {
            if (maxIndex >= 0 && ((rangeEnd == -1 && idx <= maxIndex) || (rangeEnd >= 0 && idx < maxIndex))) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', non-sequential index');
                }
                return false;
            }

            if (idx > maxIndex) {
                rangeEnd = -1;
                maxIndex = idx;
            }

            maxNoPad = i;
        }

        // range is optional
        let rs;
        let re;

        if (range) {
            if (typeof range !== 'string' && !(range instanceof String)) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid range');
                }
                return false;
            }

            const rangeTokens = range.split('-');
            if (rangeTokens.length != 2 || isNaN(rangeTokens[0]) || isNaN(rangeTokens[1])) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid range');
                }
                return false;
            }
            rs = parseInt(rangeTokens[0], 10);
            re = parseInt(rangeTokens[1], 10);
            if (isNaN(rs)) {
                rs = 0;
            }
            if (isNaN(re)) {
                re = Number.MAX_SAFE_INTEGER;
            }

            // Range start MUST NOT exceed range end.
            if (rs > re) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', invalid range');
                }
                return false;
            }
        }

        if (!padding) {
            // When continuing a partial sequence (rangeEnd >= 0), the start of the new
            // range MUST NOT skip bytes. Overlap (rs <= rangeEnd) is permitted.
            if (rangeEnd >= 0 && rs > rangeEnd + 1) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data cycle at index ' + i + ', partial with non-sequential range ' + rs + '-' + re + ' (segment ' + idx + '), rangeEnd is ' + rangeEnd);
                }
                return false;
            }

            // A cycle without a range is a full download; it completes the segment.
            // A cycle with a range leaves the segment open for further cycles.
            rangeEnd = range ? re : -1;
        }
    }

    stream.maxNoPad = maxNoPad;

    return true;
}

/**
 * Validate the structure of an extended manifest object. Check for `start.mpd`
 * and `start.base_uri` which should be strings, that `streams` is a non-empty
 * array of well-formed entries, and validate cycles with `checkInitCycles`
 * and `checkDataCycles`. The manifest is not allowed to be dynamic. Also set
 * `stream.maxNoPad` on each stream entry, a side effect of `checkDataCycles`.
 * @param {Object} manifest - The parsed extended manifest JSON object.
 * @param {Object} [logger] - Optional logger for rejection messages.
 * @returns {boolean} True if the extended manifest is valid.
 */
function isValidExtendedManifest(manifest, logger) {
    if (!manifest) {
        if (logger) {
            logger.error('Extended manifest rejected: null');
        }
        return false;
    }

    // An extended manifest MUST contain the start object.
    if (!manifest['start']) {
        if (logger) {
            logger.error('Extended manifest rejected: no start data');
        }
        return false;
    }

    // An extended manifest MUST contain the video's original MPD.
    if (typeof manifest['start']['mpd'] !== 'string' && !(manifest['start']['mpd'] instanceof String)) {
        if (logger) {
            logger.error('Extended manifest rejected: incomplete start data, missing mpd');
        }
        return false;
    }

    // An extended manifest MUST contain a base URI for segments.
    if (typeof manifest['start']['base_uri'] !== 'string' && !(manifest['start']['base_uri'] instanceof String)) {
        if (logger) {
            logger.error('Extended manifest rejected: incomplete start data, missing base URI');
        }
        return false;
    }

    // Extended manifests are only valid for static (on-demand) content. Live
    // MPDs continuously add new segments that have no corresponding cycles in
    // the fixed cycle array, so the behavior would be undefined.
    if (manifest['start']['mpd'].includes('type="dynamic"')) {
        if (logger) {
            logger.error('Extended manifest rejected: dynamic MPDs are not supported');
        }
        return false;
    }

    // An extended manifest MUST contain defended stream info.
    if (!manifest['streams']) {
        if (logger) {
            logger.error('Extended manifest rejected: no defended stream info');
        }
        return false;
    }

    // [check the list of defended stream info objects]
    for (let i = 0; i < manifest['streams'].length; i++) {
        const stream = manifest['streams'][i];

        // Defended stream info MUST be labeled with a representation.
        // Here, we only check that the label is present, not that it
        // corresponds to a valid representation.
        if (typeof stream['label'] !== 'string' && !(stream['label'] instanceof String)) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info at index ' + i + ', missing label');
            }
            return false;
        }

        // init is optional for self-initialized streams (no init segment needed)
        // data is optional for init-only streams (e.g. non-fragmented text)
        // At least one of init or data must be non-empty.
        if (stream['init'] !== undefined && stream['init'] !== null && !Array.isArray(stream['init'])) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init is not an array');
            }
            return false;
        }
        if (stream['data'] !== undefined && stream['data'] !== null && !Array.isArray(stream['data'])) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', data is not an array');
            }
            return false;
        }

        const hasInit = Array.isArray(stream['init']) && stream['init'].length > 0;
        const hasData = Array.isArray(stream['data']) && stream['data'].length > 0;
        if (!hasInit && !hasData) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', stream has no init or data cycles');
            }
            return false;
        }

        // Normalize absent arrays so downstream code always sees arrays.
        if (!stream['init']) {
            stream['init'] = [];
        }
        
        if (!stream['data']) {
            stream['data'] = [];
        }

        // [check init cycles]
        if (!checkInitCycles(stream, logger)) {
            return false;
        }

        // [check data cycles]
        if (!checkDataCycles(stream, logger)) {
            return false;
        }
    }

    return true;
}

/**
 * Return the index of the first non-padding data cycle for the given segment
 * index in the given stream entry, or -1 if no such cycle is found.
 * @param {Object} stream - The stream entry from an extended manifest.
 * @param {number} segmentIndex - The segment index to look up.
 * @returns {number}
 */
export function getCycleIndexBySegmentIndex(stream, segmentIndex) {
    const data = stream['data'] || [];

    for (let i = 0; i < data.length; i++) {
        if (segmentIndex == data[i].index && !data[i].padding) {
            return i;
        }
    }

    return -1;
}

/**
 * Return the index of the first non-padding data cycle for the segment that
 * contains the given playback time in the given stream entry, or -1 if no such
 * cycle is found.
 * @param {Object} stream - The stream entry from an extended manifest.
 * @param {number} playbackTime - Target playback position in seconds.
 * @param {number} segmentDuration - Duration of each segment in seconds.
 * @returns {number}
 */
export function getCycleIndexByPlaybackTime(stream, playbackTime, segmentDuration) {
    const segmentIndex = Math.floor(playbackTime / segmentDuration);
    return getCycleIndexBySegmentIndex(stream, segmentIndex);
}

/**
 * Singleton that stores and provides access to extended manifests for the
 * lifetime of a media session.
 */
function DefenseRegistry() {

    const context = this.context;

    let instance,
        logger,
        manifestData;
    
    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        manifestData = [];
    }

    // Discard all manifest data currently stored.
    function reset() {
        manifestData = [];
    }

    /**
     * Return true if at least one extended manifest has been stored.
     * @returns {boolean}
     */
    function hasContent() {
        return manifestData.length > 0;
    }

    /**
     * Return the maximum length of any stream label across all extended
     * manifests currently registered, or 0 if none are registered. Used by
     * DodgeDashHandlerOverride to derive a sensible fallback for
     * dodge.maxIdLength when the setting is misconfigured.
     * @returns {number}
     */
    function getMaxLabelLength() {
        let max = 0;
        for (let i = 0; i < manifestData.length; i++) {
            const streams = manifestData[i]['streams'] || [];
            for (let j = 0; j < streams.length; j++) {
                const label = streams[j] && streams[j]['label'];
                if (typeof label === 'string' && label.length > max) {
                    max = label.length;
                }
            }
        }
        return max;
    }

    /**
     * Validate and store an extended manifest. Assigns a unique `manifestId`
     * and associates the extended manifest with the given `streamId`.
     * @param {Object} content - The parsed extended manifest JSON object.
     * @param {string|null} [streamId] - The stream ID to associate with this extended manifest.
     * @returns {boolean} True if the extended manifest was accepted.
     */
    function addExtendedManifest(content, streamId = null) {
        // Validate the extended manifest.
        if (!isValidExtendedManifest(content, logger)) {
            return false;
        }

        // Each extended manifest receives a unique ID.
        content['manifestId'] = manifestData.length;
        content['streamId'] = streamId;

        // Add the extended manifest to manifestData.
        logger.info('Extended manifest accepted, stream id ' + streamId);
        manifestData.push(content);

        return true;
    }

    /**
     * Find the first stream entry whose `label` matches the given label across
     * all registered extended manifests. If `streamId` is provided, only
     * extended manifests associated with that stream ID are searched.
     * @param {string} label - The representation ID to search for.
     * @param {string|null} [streamId] - Optional stream ID to narrow the search.
     * @returns {Object|null} The matching stream entry, or null if not found.
     */
    function getDefendedStreamInfo(label, streamId = null) {
        for (let i = 0; i < manifestData.length; i++) {
            const manifest = manifestData[i];

            if (streamId && streamId != manifest['streamId']) {
                continue;
            }

            for (let j = 0; j < manifest['streams'].length; j++) {
                const stream = manifest['streams'][j];

                if (label === stream['label']) {
                    return stream;
                }
            }
        }

        return null;
    }

    instance = {
        addExtendedManifest,
        getDefendedStreamInfo,
        getMaxLabelLength,
        hasContent,
        reset,
        setup
    };

    setup();

    return instance;
}

DefenseRegistry.__dashjs_factory_name = 'DefenseRegistry';
export default FactoryMaker.getSingletonFactory(DefenseRegistry);
export {isValidExtendedManifest};
