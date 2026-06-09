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
 * Check that padding and buffer are booleans, strings true/false, or
 * absent (selective buffering is not allowed for init cycles).
 * Check that quality is a string representation ID, numerical
 * representation index, or absent. Precompute `full` flags.
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

        // quality is optional on init cycles, with the same semantics as on data
        // cycles: a non-empty string (matched against representation.id) or a
        // non-negative integer (index into adapter.getVoRepresentations). On init
        // cycles, quality selects the representation whose init segment is fetched
        // and cached in the Dodge-owned cache or InitCache, if enabled. Resolution
        // against the MPD is deferred to DodgeDashHandlerOverride.
        let quality = stream['init'][i].quality;
        if (quality !== undefined && quality !== null) {
            if (typeof quality === 'string') {
                if (quality.length === 0) {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid quality override (empty string)');
                    }
                    return false;
                }
                const qint = Number(quality);
                if (!isNaN(qint) && Number.isInteger(qint)) {
                    if (logger) {
                        logger.warn('Extended manifest parsing: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', quality override resolves to an integer ' + qint + ', treating as a representation ID');
                    }
                }
            } else if (typeof quality === 'number') {
                if (!Number.isInteger(quality) || quality < 0) {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid quality override (must be a non-negative integer)');
                    }
                    return false;
                }
            } else {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', init cycle at index ' + i + ', invalid quality override');
                }
                return false;
            }
        }
    }

    // Precompute the `full` flag for each init cycle. A cycle is `full` when
    // it is the last cycle of a contiguous run for the same representation
    // (identified by its `quality` value - undefined/null is the home rep).
    // Mirrors the data cycle backward scan for segment indices. Defense
    // designers are responsible for setting `buffer: true` on cycles that
    // should fire INIT_FRAGMENT_LOADED (a subset of the `full` cycles).
    //
    // Simple default for the single representation case: if no cycle
    // carries a quality override and no cycle has `buffer: true`, set
    // `buffer: true` on the last init cycle. With multi-representation
    // defenses, the designer must set the buffer flag explicitly.
    const hasQuality = stream['init'].some(c => c.quality !== undefined && c.quality !== null);
    const hasBuffer = stream['init'].some(c => c.buffer === true);
    if (!hasQuality && !hasBuffer && stream['init'].length > 0) {
        stream['init'][stream['init'].length - 1].buffer = true;
    }

    const seen = new Set();
    for (let i = stream['init'].length - 1; i >= 0; i--) {
        const cycle = stream['init'][i];
        const key = (cycle.quality === undefined || cycle.quality === null) ? 'home'
            : (typeof cycle.quality === 'number' ? 'n:' + cycle.quality : 's:' + cycle.quality);
        if (seen.has(key)) {
            cycle.full = false;
        } else {
            cycle.full = true;
            seen.add(key);
        }
    }

    return true;
}

/**
 * Validate the structural fields of a single data cycle (index, range,
 * padding, buffer, quality) and normalize string booleans / coerce
 * buffer array elements in place. Does not validate buffer array
 * references. Shared by checkDataCycles and appendDataCycles.
 * @param {string} label - Stream label, for error messages.
 * @param {Object} cycle - The data cycle to validate (mutated in place).
 * @param {number} i - Cycle position, for error messages.
 * @param {Object} [logger] - Optional logger for rejection messages.
 * @returns {boolean} True if the cycle's fields are valid.
 */
function checkDataCycleFields(label, cycle, i, logger) {
    const idx = Number(cycle.index);
    const range = cycle.range;
    let padding = cycle.padding;

    // Every data cycle MUST have a non-negative integer segment index.
    // Strings are accepted if they parse to a non-negative integer.
    if (isNaN(idx) || idx < 0 || !Number.isInteger(idx)) {
        if (logger) {
            logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid index');
        }
        return false;
    }

    // range is optional
    if (range) {
        if (typeof range !== 'string' && !(range instanceof String)) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid range');
            }
            return false;
        }

        const rangeTokens = range.split('-');
        if (rangeTokens.length != 2 || isNaN(rangeTokens[0]) || isNaN(rangeTokens[1])) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid range');
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
                logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid range');
            }
            return false;
        }
    }

    // padding MUST be a boolean (or a string parseable to boolean), or absent.
    if (padding !== undefined && padding !== null) {
        if (typeof padding === 'string') {
            if (padding === 'true') {
                padding = true;
            } else if (padding === 'false') {
                padding = false;
            } else {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid padding value');
                }
                return false;
            }
            cycle.padding = padding;
        } else if (typeof padding !== 'boolean') {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid padding value');
            }
            return false;
        }
    }

    // buffer MUST be a boolean (or a string parseable to boolean), an array
    // of non-negative integers, or absent.
    let buffer = cycle.buffer;
    if (buffer !== undefined && buffer !== null) {
        if (Array.isArray(buffer)) {
            for (let j = 0; j < buffer.length; j++) {
                const elem = Number(buffer[j]);
                if (isNaN(elem) || elem < 0 || !Number.isInteger(elem)) {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid buffer array element at position ' + j);
                    }
                    return false;
                }
                buffer[j] = elem;
            }
            cycle.buffer = buffer;
        } else if (typeof buffer === 'string') {
            if (buffer === 'true') {
                buffer = true;
            } else if (buffer === 'false') {
                buffer = false;
            } else {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid buffer value');
                }
                return false;
            }
            cycle.buffer = buffer;
        } else if (typeof buffer !== 'boolean') {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid buffer value');
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
    let quality = cycle.quality;
    if (quality !== undefined && quality !== null) {
        if (typeof quality === 'string') {
            if (quality.length === 0) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid quality override (empty string)');
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
                    logger.warn('Extended manifest parsing: defended stream info with label ' + label + ', data cycle at index ' + i + ', quality override resolves to an integer ' + qint + ', treating as a representation ID');
                }
            }
        } else if (typeof quality === 'number') {
            if (!Number.isInteger(quality) || quality < 0) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid quality override (must be a non-negative integer)');
                }
                return false;
            }
        } else {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', invalid quality override');
            }
            return false;
        }
    }

    return true;
}

/**
 * Return the index of the last non-padding cycle in an array, or -1.
 * @param {Array} data - The cycle array.
 * @returns {number}
 */
function computeMaxNoPad(data) {
    let maxNoPad = -1;
    for (let i = 0; i < data.length; i++) {
        if (!data[i].padding) {
            maxNoPad = i;
        }
    }
    return maxNoPad;
}

/**
 * Precompute the `full` flag for a contiguous run of data cycles (mutates each
 * cycle's `full`). `full` triggers segment assembly in
 * DodgeHandler._concatPartialSegments: at each buffer directive, every segment
 * index that will be flushed must have exactly one cycle marked full (the last
 * download of that index before the flush point). We scan forward; when we hit
 * a buffer directive, we scan backwards to mark the last occurrence of each
 * target index. Also validates that selective buffer arrays only reference
 * indices that have appeared (and not yet been flushed) within this run.
 *
 * @param {Array} data - The cycle array (a whole stream or a single append batch).
 * @param {boolean} requireFullyFlushed - When true (progressive seed / incremental
 *        append batch), every non-padding index introduced MUST be flushed
 *        within this run; any leftover pending index is a rejection. When false
 *        (complete manifest), leftover indices get their last occurrence marked
 *        full (implicit end-of-stream flush).
 * @param {string} label - Stream label, for error messages.
 * @param {Object} [logger] - Optional logger for rejection messages.
 * @returns {boolean} True on success.
 */
function computeDataCycleFull(data, requireFullyFlushed, label, logger) {
    for (let i = 0; i < data.length; i++) {
        data[i].full = false;
    }

    const pendingIndices = new Set();

    for (let i = 0; i < data.length; i++) {
        const cycle = data[i];
        cycle.full = false;

        if (!cycle.padding) {
            pendingIndices.add(cycle.index);
        }

        const bufferActive = cycle.buffer === true
            || (Array.isArray(cycle.buffer) && cycle.buffer.length > 0);

        if (bufferActive) {
            let target;
            if (cycle.buffer === true) {
                target = new Set(pendingIndices);
            } else {
                target = new Set();
                for (let k = 0; k < cycle.buffer.length; k++) {
                    if (!pendingIndices.has(cycle.buffer[k])) {
                        if (logger) {
                            logger.error('Extended manifest rejected: defended stream info with label ' + label + ', data cycle at index ' + i + ', buffer array references segment index ' + cycle.buffer[k] + ' which has not appeared in the stream');
                        }
                        return false;
                    }
                    target.add(cycle.buffer[k]);
                }
            }

            const needed = new Set(target);
            for (let j = i; j >= 0 && needed.size > 0; j--) {
                if (!data[j].padding && !data[j].full && needed.has(data[j].index)) {
                    data[j].full = true;
                    needed.delete(data[j].index);
                }
            }

            if (cycle.buffer === true) {
                pendingIndices.clear();
            } else {
                for (let k = 0; k < cycle.buffer.length; k++) {
                    pendingIndices.delete(cycle.buffer[k]);
                }
            }
        }
    }

    // Every index a progressive batch introduces MUST be flushed within that same batch.
    if (requireFullyFlushed) {
        if (pendingIndices.size > 0) {
            if (logger) {
                logger.error('Extended manifest rejected: defended stream info with label ' + label + ', progressive batch leaves segment index(es) ' + Array.from(pendingIndices).join(', ') + ' unbuffered; every index a progressive batch introduces must be flushed within the same batch');
            }
            return false;
        }
        return true;
    }

    // Complete manifest: mark remaining unflushed indices (implicit flush at
    // end of stream).
    const remaining = new Set(pendingIndices);
    for (let i = data.length - 1; i >= 0 && remaining.size > 0; i--) {
        if (!data[i].padding && !data[i].full && remaining.has(data[i].index)) {
            data[i].full = true;
            remaining.delete(data[i].index);
        }
    }

    return true;
}

/**
 * Validate data cycles in a stream entry. Check that segment indices are
 * non-negative; ranges are well-formed; and the padding, buffer, and quality
 * fields have correct values. Set `stream.maxNoPad` to the index of the last
 * non-padding cycle and precompute `full` flags. When `stream.progressive` is
 * true, the data cycles must be self-contained (every segment index flushed
 * within them), since the stream will be extended at runtime.
 * @param {Object} stream - The stream entry from an extended manifest.
 * @param {Object} [logger] - Optional logger for rejection messages.
 * @returns {boolean} True if all data cycles are valid.
 */
function checkDataCycles(stream, logger) {
    const data = stream['data'];

    for (let i = 0; i < data.length; i++) {
        if (!checkDataCycleFields(stream['label'], data[i], i, logger)) {
            return false;
        }
    }

    stream.maxNoPad = computeMaxNoPad(data);

    return computeDataCycleFull(data, !!stream['progressive'], stream['label'], logger);
}

/**
 * Validate the structure of an extended manifest object. Check for `start.mpd`
 * and `start.base_uri` which should be strings, that `streams` is a non-empty
 * array of well-formed entries (with proper `label`, `period`, and init and/or
 * data cycles), and validate cycles with `checkInitCycles` and `checkDataCycles`.
 * The manifest is not allowed to be dynamic. Also set `stream.maxNoPad` on each
 * stream entry, a side effect of `checkDataCycles`, and precompute `full` flags
 * for both init and data cycles.
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

        // period is optional. When present, scopes this stream entry to a
        // specific period in multi-period MPDs. Must be a non-negative integer.
        // Strings are accepted if they parse to a non-negative integer.
        if (stream['period'] !== undefined && stream['period'] !== null) {
            const p = Number(stream['period']);
            if (isNaN(p) || p < 0 || !Number.isInteger(p)) {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', invalid period');
                }
                return false;
            }
            stream['period'] = p;
        }

        // progressive is optional. When true, this stream's data cycles are
        // incomplete and will be extended at runtime via appendDataCycles /
        // finalizeStream (progressive defense generation). The override stalls
        // when playback runs off the end of a progressive stream's data. A
        // progressive seed's data MUST be self-contained (enforced by
        // checkDataCycles), since later appended batches cannot flush
        // an earlier batch's segment indices.
        if (stream['progressive'] !== undefined && stream['progressive'] !== null) {
            let progressive = stream['progressive'];
            if (typeof progressive === 'string') {
                if (progressive === 'true') {
                    progressive = true;
                } else if (progressive === 'false') {
                    progressive = false;
                } else {
                    if (logger) {
                        logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', invalid progressive value');
                    }
                    return false;
                }
            } else if (typeof progressive !== 'boolean') {
                if (logger) {
                    logger.error('Extended manifest rejected: defended stream info with label ' + stream['label'] + ', invalid progressive value');
                }
                return false;
            }
            stream['progressive'] = progressive;
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
     * Validate and store an extended manifest. Assigns a unique `manifestId`.
     * @param {Object} content - The parsed extended manifest JSON object.
     * @returns {boolean} True if the extended manifest was accepted.
     */
    function addExtendedManifest(content) {
        // Validate the extended manifest.
        if (!isValidExtendedManifest(content, logger)) {
            return false;
        }

        // Each extended manifest receives a unique ID.
        content['manifestId'] = manifestData.length;

        // Add the extended manifest to manifestData.
        logger.info('Extended manifest accepted');
        manifestData.push(content);

        return true;
    }

    /**
     * Find the first stream entry whose `label` matches the given label across
     * all registered extended manifests. If `periodIndex` is provided, streams
     * with a `period` field only match when `period === periodIndex`; streams
     * without a `period` field match any period.
     * @param {string} label - The representation ID to search for.
     * @param {number|null} [periodIndex] - Optional period index for multi-period MPDs.
     * @returns {Object|null} The matching stream entry, or null if not found.
     */
    function getDefendedStreamInfo(label, periodIndex = null) {
        for (let i = 0; i < manifestData.length; i++) {
            const manifest = manifestData[i];

            for (let j = 0; j < manifest['streams'].length; j++) {
                const stream = manifest['streams'][j];

                if (label !== stream['label']) {
                    continue;
                }

                // When the stream has a `period` field and a periodIndex was
                // supplied, they must match. Streams without a `period` field
                // match any period (single-period backward compatibility).
                if (periodIndex !== null && stream['period'] !== undefined && stream['period'] !== null) {
                    if (stream['period'] !== periodIndex) {
                        continue;
                    }
                }

                return stream;
            }
        }

        return null;
    }

    /**
     * Append data cycles to a progressive stream at runtime. The append is
     * atomic and self-contained:
     *
     *  - The stream must exist and have `progressive: true` (a finalized or
     *    non-progressive stream cannot be appended to).
     *  - Every cycle is structurally validated; on any failure, the stream is
     *    left untouched and false is returned.
     *  - `full` flags are computed over the batch alone, starting from an empty
     *    pending set. Every non-padding segment index the batch introduces MUST
     *    be flushed (buffered) within the batch, and any selective buffer array
     *    may only reference indices introduced by the batch. A batch is a
     *    complete buffer window. A batch that leaves an index unflushed,
     *    or references an index from an earlier batch, is rejected.
     *
     * On success, the cycles are appended (with correct `full` flags), maxNoPad
     * is recomputed, and true is returned. Because getDefendedStreamInfo returns
     * the stored stream by reference and DodgeDashHandlerOverride re-reads it on
     * every request, the appended cycles are visible to the next
     * getNextSegmentRequest with no further modifications.
     *
     * @param {string} label - The stream label (representation ID).
     * @param {number|null} periodIndex - Optional period index for multi-period MPDs.
     * @param {Array} cycles - The data cycles to append.
     * @returns {boolean} True if the batch was accepted and appended.
     */
    function appendDataCycles(label, periodIndex, cycles) {
        if (!Array.isArray(cycles) || cycles.length === 0) {
            return false;
        }

        const stream = getDefendedStreamInfo(label, periodIndex === undefined ? null : periodIndex);
        if (!stream) {
            logger.error('appendDataCycles: no stream found for label ' + label + ', period ' + periodIndex);
            return false;
        }
        if (!stream['progressive']) {
            logger.error('appendDataCycles: stream ' + label + ' is not progressive (already finalized or never progressive)');
            return false;
        }

        // Work on clones so a validation failure mutates nothing (atomicity).
        const batch = [];
        for (let i = 0; i < cycles.length; i++) {
            const clone = Object.assign({}, cycles[i]);
            if (Array.isArray(clone.buffer)) {
                clone.buffer = clone.buffer.slice();
            }
            if (!checkDataCycleFields(stream['label'], clone, i, logger)) {
                return false;
            }
            batch.push(clone);
        }

        // Self-contained batch: full computed over the batch alone, every
        // introduced index required to be flushed within the batch.
        if (!computeDataCycleFull(batch, true, stream['label'], logger)) {
            return false;
        }

        // Commit. Already-consumed cycles are never touched.
        for (let i = 0; i < batch.length; i++) {
            stream['data'].push(batch[i]);
        }
        stream.maxNoPad = computeMaxNoPad(stream['data']);
        return true;
    }

    /**
     * Finalize a progressive stream: append optional trailing padding cycles,
     * clear the `progressive` flag, and recompute maxNoPad. After this, the
     * override finishes (rather than stalls) when it runs off the end of the
     * data. Trailing cycles MUST be padding cycles: they are never assembled
     * (`full` is always false) and never introduce flushable indices, so
     * appending them cannot disturb any earlier cycle's `full` flag. To
     * append a final batch of real content, call appendDataCycles first,
     * then finalizeStream with only the trailing padding.
     *
     * @param {string} label - The stream label (representation ID).
     * @param {number|null} periodIndex - Optional period index for multi-period MPDs.
     * @param {Array} [paddingCycles] - Trailing padding cycles to append.
     * @returns {boolean} True if the stream was finalized.
     */
    function finalizeStream(label, periodIndex, paddingCycles = []) {
        if (!Array.isArray(paddingCycles)) {
            return false;
        }

        const stream = getDefendedStreamInfo(label, periodIndex === undefined ? null : periodIndex);
        if (!stream) {
            logger.error('finalizeStream: no stream found for label ' + label + ', period ' + periodIndex);
            return false;
        }
        if (!stream['progressive']) {
            logger.error('finalizeStream: stream ' + label + ' is not progressive (already finalized or never progressive)');
            return false;
        }

        const batch = [];
        for (let i = 0; i < paddingCycles.length; i++) {
            const clone = Object.assign({}, paddingCycles[i]);
            if (Array.isArray(clone.buffer)) {
                clone.buffer = clone.buffer.slice();
            }
            if (!checkDataCycleFields(stream['label'], clone, i, logger)) {
                return false;
            }
            if (clone.padding !== true) {
                logger.error('finalizeStream: trailing cycle at index ' + i + ' must be a padding cycle');
                return false;
            }
            clone.full = false;
            batch.push(clone);
        }

        for (let i = 0; i < batch.length; i++) {
            stream['data'].push(batch[i]);
        }
        stream['progressive'] = false;
        stream.maxNoPad = computeMaxNoPad(stream['data']);
        return true;
    }

    instance = {
        addExtendedManifest,
        appendDataCycles,
        finalizeStream,
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
