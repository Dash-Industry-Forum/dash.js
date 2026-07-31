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
import MediaPlayerEvents from '../MediaPlayerEvents.js';

/**
 * @module C2paEvents
 * @description Event-name constants and payload typedefs for the C2PA scanning module.
 *
 * The event names are the same public identifiers declared on {@link MediaPlayerEvents}
 * so that consumers subscribing through the player receive exactly these types; this
 * module re-exposes them for internal use and documents the payload shapes dispatched
 * alongside each event.
 */

/**
 * The C2PA signing method a segment was validated against.
 * @typedef {('19.3'|'19.4')} C2paMethod
 */

/**
 * The provenance status assigned to a media segment.
 * @typedef {('valid'|'invalid'|'replayed'|'reordered'|'missing'|'continuityInvalid'|'continuityUnsupported'|'unverified')} C2paSegmentStatus
 */

/**
 * Public payload of the {@link MediaPlayerEvents#event:C2PA_SEGMENT_VALIDATED} event.
 * This is the record the reference-player UI renders per segment.
 * @typedef {Object} SegmentRecord
 * @property {number} segmentNumber Monotonic segment number derived from the segment URL.
 * @property {('video'|'audio')} mediaType Media type of the validated segment.
 * @property {?C2paMethod} method Signing method the segment was validated against, or null when unknown.
 * @property {C2paSegmentStatus} status Provenance status assigned to the segment.
 * @property {?string} keyId Identifier of the session key used for VSI validation, when applicable.
 * @property {?string} hash Content hash reported by the validation engine, when applicable.
 * @property {?string} manifestId Manifest id carried by the segment, when applicable.
 * @property {?string} issuer Issuer of the signing certificate, when applicable.
 * @property {?string} previousManifestId Manifest id of the previous segment in the continuity chain, when applicable.
 * @property {Array.<string>} errorCodes Stable, narrowed error codes describing any validation failure.
 * @property {number} timestamp Epoch milliseconds at which the record was produced.
 */

/**
 * Public payload of the {@link MediaPlayerEvents#event:C2PA_INIT_PROCESSED} event.
 * @typedef {Object} InitProcessedEvent
 * @property {string} trackKey Stable per-representation key derived from the segment URL.
 * @property {?C2paMethod} method Signing method classified from the init segment, or null when no provenance is present.
 * @property {?string} manifestId Manifest id carried by the init segment, when applicable.
 * @property {?string} issuer Issuer of the signing certificate, when applicable.
 * @property {number} sessionKeyCount Number of VSI session keys found in the init segment.
 * @property {boolean} isValid Whether the init segment carried verifiable C2PA provenance.
 * @property {Array.<string>} errorCodes Stable, narrowed error codes describing any init validation failure.
 */

/**
 * Public payload of the {@link MediaPlayerEvents#event:C2PA_ERROR} event.
 * @typedef {Object} C2paErrorEvent
 * @property {string} trackKey Stable per-representation key derived from the segment URL.
 * @property {?number} segmentNumber Segment number the error relates to, when applicable.
 * @property {?('video'|'audio')} mediaType Media type the error relates to, when applicable.
 * @property {Array.<string>} errorCodes Stable, narrowed error codes describing the failure.
 * @property {string} message Human-readable diagnostic message.
 * @property {number} timestamp Epoch milliseconds at which the error was produced.
 */

/**
 * Event-name constants dispatched by the C2PA scanning module. Values mirror the
 * public identifiers on {@link MediaPlayerEvents}.
 * @enum {string}
 */
const C2paEvents = {
    C2PA_INIT_PROCESSED: MediaPlayerEvents.C2PA_INIT_PROCESSED,
    C2PA_SEGMENT_VALIDATED: MediaPlayerEvents.C2PA_SEGMENT_VALIDATED,
    C2PA_ERROR: MediaPlayerEvents.C2PA_ERROR
};

export default C2paEvents;
