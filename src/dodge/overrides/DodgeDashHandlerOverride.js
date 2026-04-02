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

import Constants from '../../streaming/constants/Constants.js';
import DefenseRegistry, { getCycleIndexBySegmentIndex } from '../DefenseRegistry.js';
import Settings from '../../core/Settings.js';
import {
    replaceIDForTemplate,
    replaceTokenForTemplate,
    unescapeDollarsInTemplate,
    countUnpaddedTokenOccurrences
} from '../utils/SegmentsUtils.js';
import FragmentRequest from '../../streaming/vo/FragmentRequest.js';
import {HTTPRequest} from '../../streaming/vo/metrics/HTTPRequest.js';

/**
 * Dodge override, replaces DashHandler's request generation logic to use
 * cycles from an extended manifest.
 * 
 * Registered via mediaPlayer.extend('DashHandler', DodgeDashHandlerOverride, true).
 */
function DodgeDashHandlerOverride(config) {
    config = config || {};
    const context = this.context;
    const parent = this.parent;
    const _parentInitialize = parent.initialize;
    const _parentResetInitialSettings = parent.resetInitialSettings;
    const _parentGetInitRequest = parent.getInitRequest;
    const _parentGetNextSegmentRequest = parent.getNextSegmentRequest;
    const _parentGetSegmentRequestForTime = parent.getSegmentRequestForTime;
    const _parentIsLastSegmentRequested = parent.isLastSegmentRequested;

    const defenseRegistry = DefenseRegistry(context).getInstance();
    const settings = Settings(context).getInstance();
    const baseURLController = config.baseURLController;
    const urlUtils = config.urlUtils;
    const timelineConverter = config.timelineConverter;
    const segmentsController = config.segmentsController;
    const playbackController = config.playbackController;
    const debug = config.debug;

    let logger;

    let defendedStreamInfo,
        lastInitIndex,
        lastCycleIndex,
        lastSegment,
        mediaHasFinished,
        lastRepresentationMediaType;

    function setup() {
        logger = debug.getLogger({ __dashjs_factory_name: 'DodgeDashHandlerOverride' });
        _resetState();
    }

    function _resetState() {
        defendedStreamInfo = null;
        lastInitIndex = -1;
        lastCycleIndex = -1;
        lastSegment = null;
        mediaHasFinished = false;
        lastRepresentationMediaType = null;
    }

    // Return true if strict mode is 'representation' or 'manifest' (both
    // enforce per-representation defense requirements).
    function _isRepresentationStrict() {
        const mode = (settings.get().dodge || {}).strictMode;
        return mode === 'representation' || mode === 'manifest';
    }

    function resetInitialSettings() {
        _resetState();
        _parentResetInitialSettings.call(parent);
    }

    function initialize(isDynamic) {
        mediaHasFinished = false;
        _parentInitialize.call(parent, isDynamic);
    }

    // ************************************************************************
    // URL PADDING
    // ************************************************************************

    /**
     * Sets the request URL with padding to normalize URL lengths.
     */
    function _setRequestUrlWithPadding(request, destination, representation, replacements) {
        const baseURL = baseURLController.resolve(representation.path);
        let url, serviceLocation, queryParams = {};

        if (!baseURL || (destination === baseURL.url) || (!urlUtils.isRelative(destination))) {
            url = destination;
        } else {
            url = baseURL.url;
            serviceLocation = baseURL.serviceLocation;
            queryParams = baseURL.queryParams;

            if (queryParams == null || queryParams == undefined) {
                queryParams = {};
            }

            // Start with a short random string for cache busting.
            let random = Math.random().toString(36).substring(2, 10);

            // Pad to normalize URL lengths across different template values.
            if (replacements) {
                let max = Number.MAX_SAFE_INTEGER.toString().length;

                if (replacements['Number'] > 0) {
                    let count = replacements['Number'];
                    let chars = request.replacementNumber.toString().length;
                    let pad = max - chars;
                    if (pad > 0) {
                        random += '0'.repeat(count * pad);
                    } else if (pad < 0) {
                        logger.warn('set request URL: replacement number ' + request.replacementNumber + ' exceeds max length ' + max);
                    }
                }
                if (replacements['Time'] > 0) {
                    let count = replacements['Time'];
                    let chars = request.replacementTime.toString().length;
                    let pad = max - chars;
                    if (pad > 0) {
                        random += '0'.repeat(count * pad);
                    } else if (pad < 0) {
                        logger.warn('set request URL: replacement time ' + request.replacementTime + ' exceeds max length ' + max);
                    }
                }
                if (replacements['Bandwidth'] > 0) {
                    let count = replacements['Bandwidth'];
                    let chars = request.representation.bandwidth.toString().length;
                    let pad = max - chars;
                    if (pad > 0) {
                        random += '0'.repeat(count * pad);
                    } else if (pad < 0) {
                        logger.warn('set request URL: bandwidth ' + request.representation.bandwidth + ' exceeds max length ' + max);
                    }
                }
                if (replacements['ID'] > 0) {
                    let count = replacements['ID'];
                    let chars = request.representation.id.toString().length;
                    const maxId = (settings.get().dodge || {}).maxIdLength || 32;
                    let pad = maxId - chars;
                    if (pad > 0) {
                        random += '0'.repeat(count * pad);
                    } else if (pad < 0) {
                        logger.warn('set request URL: representation ID "' + request.representation.id + '" exceeds maxIdLength ' + maxId);
                    }
                }
            }

            const queryParam = (settings.get().dodge || {}).queryParam || 'padding';
            queryParams[queryParam] = random;

            if (destination) {
                url = urlUtils.resolve(destination, url);
            }
        }

        if (urlUtils.isRelative(url)) {
            return false;
        }

        request.url = url;
        request.serviceLocation = serviceLocation;
        request.queryParams = queryParams;

        return true;
    }

    // ************************************************************************
    // INIT REQUEST GENERATION
    // ************************************************************************

    function getInitRequest(mediaInfo, representation) {
        if (!representation || !defendedStreamInfo) {
            if (_isRepresentationStrict() && defenseRegistry.hasContent()) {
                return null; // block undefended request
            }
            // No extended manifest loaded, fall back to vanilla DashHandler.
            return _parentGetInitRequest.call(parent, mediaInfo, representation);
        }

        const initIndex = lastInitIndex + 1;
        const cycle = defendedStreamInfo['init'][initIndex];
        if (!cycle) {
            return null;
        }

        lastInitIndex = initIndex;

        const request = _generateInitRequest(mediaInfo, representation, representation.mediaInfo.type, cycle.range, cycle.padding);
        if (request) {
            request.full = getRemainingInitCycles() == 0;
            request.buffer = request.full;
        }
        return request;
    }

    function _generateInitRequest(mediaInfo, representation, mediaType, range = null, padding = false) {
        const request = new FragmentRequest();
        const period = representation.adaptation.period;
        const presentationStartTime = period.start;
        const isDynamicManifest = parent.getStreamInfo().manifestInfo.isDynamic;

        // Count token occurrences for URL padding.
        const replacements = {
            'Bandwidth': 1,
            'Number': 0,
            'Time': 0,
            'ID': 0,
        };

        request.mediaType = mediaType;
        request.type = HTTPRequest.INIT_SEGMENT_TYPE;
        request.originalRange = representation.range;
        if (range) {
            request.range = range;
            request.partial = true;
        } else {
            request.range = representation.range;
            request.partial = false;
        }
        if (padding) {
            request.padding = true;
        }
        request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation, isDynamicManifest);
        request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, representation, isDynamicManifest);
        request.representation = representation;

        if (_setRequestUrlWithPadding(request, representation.initialization, representation, replacements)) {
            request.url = replaceTokenForTemplate(request.url, 'Bandwidth', representation.bandwidth);
            request.url = replaceIDForTemplate(request.url, representation.id);
            request.url = unescapeDollarsInTemplate(request.url);
            return request;
        }
    }

    // ************************************************************************
    // DATA REQUEST GENERATION
    // ************************************************************************

    function _getRequestForSegment(mediaInfo, segment, range = null, padding = false) {
        if (segment === null || segment === undefined) {
            return null;
        }

        const request = new FragmentRequest();
        const representation = segment.representation;
        const bandwidth = representation.bandwidth;
        let url = segment.media;

        // Count token occurrences for URL padding.
        const replacements = {
            'Number': countUnpaddedTokenOccurrences(url, 'Number'),
            'Time': countUnpaddedTokenOccurrences(url, 'Time'),
            'Bandwidth': countUnpaddedTokenOccurrences(url, 'Bandwidth'),
            'ID': (url.indexOf('$RepresentationID$') === -1) ? 0 : 1,
        };
        if (segment.replacements) {
            replacements['Number'] += segment.replacements['Number'];
            replacements['Time'] += segment.replacements['Time'];
        }

        url = replaceTokenForTemplate(url, 'Number', segment.replacementNumber);
        url = replaceTokenForTemplate(url, 'Time', segment.replacementTime);
        url = replaceTokenForTemplate(url, 'Bandwidth', bandwidth);
        url = replaceIDForTemplate(url, representation.id);
        url = unescapeDollarsInTemplate(url);

        request.mediaType = parent.getType();
        request.bandwidth = representation.bandwidth;
        request.type = HTTPRequest.MEDIA_SEGMENT_TYPE;
        request.originalRange = segment.mediaRange;
        if (range) {
            request.range = range;
            request.partial = true;
        } else {
            request.range = segment.mediaRange;
            request.partial = false;
        }
        if (padding) {
            request.padding = true;
        }
        request.startTime = segment.presentationStartTime;
        request.mediaStartTime = segment.mediaStartTime;
        request.duration = segment.duration;
        request.timescale = representation.timescale;
        request.availabilityStartTime = segment.availabilityStartTime;
        request.availabilityEndTime = segment.availabilityEndTime;
        request.availabilityTimeComplete = representation.availabilityTimeComplete;
        request.wallStartTime = segment.wallStartTime;
        request.index = segment.index;
        request.adaptationIndex = representation.adaptation.index;
        request.representation = representation;
        request.replacementNumber = segment.replacementNumber;
        request.replacementTime = segment.replacementTime;

        if (_setRequestUrlWithPadding(request, url, representation, replacements)) {
            return request;
        }
    }

    function getSegmentRequestForTime(mediaInfo, representation, time) {
        if (!representation || !representation.segmentInfoType || !defendedStreamInfo) {
            if (_isRepresentationStrict() && defenseRegistry.hasContent()) {
                return null; // block undefended request
            }
            // No extended manifest, fall back to vanilla DashHandler.
            return _parentGetSegmentRequestForTime.call(parent, mediaInfo, representation, time);
        }

        // If we are trailing and a spurious seek occurs (it shouldn't),
        // ignore it. But if the user seeks to at least one segment before
        // the end of the stream, allow it.
        if (playbackController.getTimeSinceStreamEnd() > 0 && playbackController.getStreamEndTime(representation.mediaInfo.streamInfo) - time < representation.segmentDuration) {
            return getNextSegmentRequest(mediaInfo, representation);
        }

        // Start with the segment.
        const segment = segmentsController.getSegmentByTime(representation, time);
        if (!segment) {
            logger.debug('No segment found for time ' + time);
            return null;
        } else {
            logger.debug('Index for time ' + time + ' is ' + segment.index);
        }

        // Find first cycle containing the desired segment.
        const cycleIndex = getCycleIndexBySegmentIndex(defendedStreamInfo, segment.index);
        const cycle = defendedStreamInfo['data'][cycleIndex];
        if (!cycle) {
            return null;
        }
        logger.debug('cycle ' + cycleIndex + '/' + defendedStreamInfo['data'].length + ', getSegmentRequestForTime');

        // Determine if this is a full request by skipping padding cycles.
        let nextIndex = cycleIndex + 1;
        let nextCycle = defendedStreamInfo['data'][nextIndex];
        while (nextCycle && nextCycle.padding) {
            nextIndex += 1;
            nextCycle = defendedStreamInfo['data'][nextIndex];
        }

        // Update invariants.
        lastCycleIndex = cycleIndex;
        lastSegment = segment;

        const request = _getRequestForSegment(mediaInfo, segment, cycle.range, cycle.padding);
        if (request) {
            request.full = !cycle.padding && (!nextCycle || nextCycle.index != cycle.index);
            request.buffer = !!cycle.buffer;
            request.padding = !!cycle.padding;
            request.trail = cycleIndex > defendedStreamInfo['maxNoPad'];
        }
        return request;
    }

    function getNextSegmentRequest(mediaInfo, representation) {
        if (!representation || !representation.segmentInfoType || !defendedStreamInfo) {
            if (_isRepresentationStrict() && defenseRegistry.hasContent()) {
                return null; // block undefended request
            }
            // No extended manifest, fall back to vanilla DashHandler.
            return _parentGetNextSegmentRequest.call(parent, mediaInfo, representation);
        }

        // Init-only defended stream (e.g. non-fragmented text): no data cycles to serve.
        if (defendedStreamInfo['data'].length === 0) {
            mediaHasFinished = true;
            return null;
        }

        // Advance to next cycle.
        const cycleIndex = lastCycleIndex + 1;
        const cycle = defendedStreamInfo['data'][cycleIndex];
        if (!cycle) {
            logger.debug('No cycle found with index ' + cycleIndex);
            mediaHasFinished = true;
            return null;
        }

        // Reuse lastSegment or look up segment by index.
        const segment = (lastSegment && cycle.index == lastSegment.index)
            ? lastSegment
            : segmentsController.getSegmentByIndex(representation, cycle.index, -1);
        if (!segment) {
            logger.debug('No segment found, lastSegment = ' + !!lastSegment);
            return null;
        }
        logger.debug('cycle ' + cycleIndex + '/' + defendedStreamInfo['data'].length + ', getNextSegmentRequest');

        // Determine if full request by skipping padding cycles.
        let nextIndex = cycleIndex + 1;
        let nextCycle = defendedStreamInfo['data'][nextIndex];
        while (nextCycle && nextCycle.padding) {
            nextIndex += 1;
            nextCycle = defendedStreamInfo['data'][nextIndex];
        }

        // Update invariants.
        lastCycleIndex = cycleIndex;
        if (!cycle.padding) {
            lastSegment = segment;
        }

        const request = _getRequestForSegment(mediaInfo, segment, cycle.range, cycle.padding);
        if (request) {
            request.full = !cycle.padding && (!nextCycle || nextCycle.index != cycle.index);
            request.buffer = !!cycle.buffer;
            request.padding = !!cycle.padding;
            request.trail = cycleIndex > defendedStreamInfo['maxNoPad'];
        }
        return request;
    }

    function isLastSegmentRequested(representation, bufferingTime) {
        if (!defendedStreamInfo) {
            if (_isRepresentationStrict() && defenseRegistry.hasContent()) {
                if (lastRepresentationMediaType === 'text') {
                    return true; // graceful completion for undefended text track
                }
                return false; // stall non-text undefended stream
            }
            // Fall back to vanilla DashHandler.
            return _parentIsLastSegmentRequested.call(parent, representation, bufferingTime);
        }

        // Init-only defended stream: finished once getNextSegmentRequest has been called.
        if (defendedStreamInfo['data'].length === 0) {
            return mediaHasFinished;
        }

        if (!representation || !lastSegment || lastCycleIndex < 0) {
            return false;
        }

        if (mediaHasFinished) {
            return true;
        }

        if (!isNaN(bufferingTime) && lastSegment.presentationStartTime + lastSegment.duration > bufferingTime) {
            return false;
        }

        if (lastCycleIndex >= defendedStreamInfo['data'].length - 1) {
            return true;
        }

        return false;
    }

    function repeatSegmentRequest(mediaInfo, representation) {
        if (!lastSegment) {
            return null;
        }
        return getSegmentRequestForTime(mediaInfo, representation, lastSegment.presentationStartTime);
    }

    // ************************************************************************
    // GETTERS AND SETTERS
    // ************************************************************************

    function getCurrentIndex() {
        return lastSegment ? lastSegment.index : -1;
    }

    function getNextExpectedIndex() {
        if (!defendedStreamInfo) { return -1; }
        const cycleIndex = lastCycleIndex + 1;
        const cycle = defendedStreamInfo['data'][cycleIndex];
        return cycle ? cycle.index : -1;
    }

    function getRemainingInitCycles() {
        if (!defendedStreamInfo) { return -1; }
        return defendedStreamInfo['init'].length - lastInitIndex - 1;
    }

    function updateDefendedStreamInfo(representation) {
        if (!representation) {
            defendedStreamInfo = null;
            lastRepresentationMediaType = null;
            return false;
        }

        const period = representation.adaptation.period.index;
        const adaptation = representation.adaptation.index;
        const quality = representation.index;
        const label = representation.id;
        lastRepresentationMediaType = representation.mediaInfo.type;

        defendedStreamInfo = defenseRegistry.getDefendedStreamInfo(label);

        if (defendedStreamInfo) {
            logger.debug('Defended stream info set for label ' + label + ', period ' + period + ', adaptation ' + adaptation + ', quality ' + quality);
        } else {
            logger.debug('Defended stream info not found for label ' + label + ', period ' + period + ', adaptation ' + adaptation + ', quality ' + quality);
            if (_isRepresentationStrict() && defenseRegistry.hasContent()) {
                logger.error('Dodge strict mode is enabled and no defended stream info for label ' + label + ', blocking requests');
            }
        }

        return !!defendedStreamInfo;
    }

    function getIsTrailing() {
        return !!(defendedStreamInfo && lastCycleIndex >= defendedStreamInfo['maxNoPad'] && lastCycleIndex < defendedStreamInfo['data'].length - 1);
    }

    function isTextTrackBlockedByDodge() {
        return _isRepresentationStrict() && defenseRegistry.hasContent() &&
            !defendedStreamInfo && lastRepresentationMediaType === Constants.TEXT;
    }

    setup();

    return {
        initialize,
        resetInitialSettings,
        getInitRequest,
        getNextSegmentRequest,
        getSegmentRequestForTime,
        isLastSegmentRequested,
        repeatSegmentRequest,
        getCurrentIndex,
        getNextExpectedIndex,
        getRemainingInitCycles,
        updateDefendedStreamInfo,
        getIsTrailing,
        isTextTrackBlockedByDodge,
    };
}

export default DodgeDashHandlerOverride;
