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

/**
 * BeaconTracker - application-side handling of SVTA 2053-1 ad creative signaling (version 2) tracking events.
 *
 * Listens to the SVTA EventStream events dispatched by dash.js, parses the carriage envelope and requests the
 * tracking URLs in sync with playback. Remote fields ($remote, clause 5.2.2.2) are not supported.
 *
 * Basis: SVTA2053-1 Rev 1.0 (May 19, 2025), clauses 4.3.2, 4.4, 5.2 and 6.1.
 *
 * Usage:
 *   const tracker = createBeaconTracker({ player, dashjs, onBeacon, onSlotStart, onSlotEnd, onLog });
 *   tracker.attach();
 */

/** Normative scheme URI (SVTA2053-1 clause 5). */
export const SVTA_SCHEME_ID_URI = 'urn:svta:advertising-wg:ad-creative-signaling';

/** Scheme URI used in the DASH examples of SVTA2053-1 clause 6.1 (Code 7 and 8). Accepted with a warning. */
export const SVTA_EXAMPLE_SCHEME_ID_URI = 'urn:svta:advertising-wg:ad-id-signaling';

const ENVELOPE_TYPES = ['trackingEvent', 'verification', 'slot', 'pod'];

// Tracking event types (SVTA2053-1 Table 3) and how this tracker triggers them when no offset is given.
// Fractions are relative to the duration of the containing Slot or Pod.
const TIME_TRIGGERS = {
    start: 0,
    impression: 0,
    podStart: 0,
    firstQuartile: 0.25,
    midpoint: 0.5,
    thirdQuartile: 0.75,
    complete: 1,
    podEnd: 1
};
const ACTION_TYPES = ['pause', 'resume', 'mute', 'unmute', 'error'];
const UNSUPPORTED_TYPES = ['clickTracking', 'skip', 'playerExpand', 'playerCollapse', 'loaded'];

const TIME_EPSILON = 0.1; // seconds of tolerance when comparing media times
const LATE_THRESHOLD = 1; // a beacon fired more than this many seconds after its scheduled time is "late"
const JOIN_TOLERANCE = 1; // onStart within this many seconds of the event start counts as playing from the start

/**
 * @param {object} config
 * @param {object} config.player - dash.js MediaPlayer instance
 * @param {object} config.dashjs - the dashjs namespace (for event constants)
 * @param {number} [config.requestTimeout=5000] - timeout in ms for beacon requests
 * @param {function} [config.onBeacon] - called with a beacon record; record.result resolves to the request outcome
 * @param {function} [config.onSlotStart] - called with slot metadata when a slot becomes active
 * @param {function} [config.onSlotEnd] - called with slot metadata when a slot ends
 * @param {function} [config.onLog] - called with (level, message)
 */
export function createBeaconTracker(config) {
    const player = config.player;
    const events = config.dashjs.MediaPlayer.events;
    const requestTimeout = config.requestTimeout || 5000;
    const onBeacon = config.onBeacon || function () {};
    const onSlotStart = config.onSlotStart || function () {};
    const onSlotEnd = config.onSlotEnd || function () {};
    const onLog = config.onLog || function (level, msg) {
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log']('[BeaconTracker] ' + msg);
    };

    let entries = {};
    let lastTime = 0;
    let paused = false;
    let muted = false;

    // ---------------------------------------------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------------------------------------------

    // dash.js calls listeners without try/catch, so an exception here would also stop the player's own handlers
    // for the same dispatch. Every listener is therefore guarded.
    const listeners = [];
    [SVTA_SCHEME_ID_URI, SVTA_EXAMPLE_SCHEME_ID_URI].forEach(function (scheme) {
        listeners.push([scheme, _guard(_onEventReceived), { mode: events.EVENT_MODE_ON_RECEIVE }]);
        listeners.push([scheme, _guard(_onEventStarted), { mode: events.EVENT_MODE_ON_START }]);
    });
    listeners.push([events.PLAYBACK_TIME_UPDATED, _guard(_onTimeUpdated)]);
    listeners.push([events.PLAYBACK_SEEKING, _guard(_onSeeking)]);
    listeners.push([events.PLAYBACK_PAUSED, _guard(_onPaused)]);
    listeners.push([events.PLAYBACK_PLAYING, _guard(_onPlaying)]);
    listeners.push([events.PLAYBACK_ENDED, _guard(_onEnded)]);
    listeners.push([events.PLAYBACK_VOLUME_CHANGED, _guard(_onVolumeChanged)]);
    listeners.push([events.ERROR, _guard(_onError)]);

    function attach() {
        listeners.forEach(function (l) {
            player.on(l[0], l[1], null, l[2]);
        });
    }

    function detach() {
        listeners.forEach(function (l) {
            player.off(l[0], l[1]);
        });
        reset();
    }

    function _guard(handler) {
        return function (e) {
            try {
                handler(e);
            } catch (err) {
                onLog('error', `Unexpected error in ${handler.name}: ${err.message}`);
            }
        };
    }

    function reset() {
        entries = {};
        lastTime = 0;
        paused = false;
        muted = false;
    }

    function getEntries() {
        return Object.keys(entries).map(function (key) {
            return entries[key];
        });
    }

    // ---------------------------------------------------------------------------------------------------------------
    // dash.js event handlers
    // ---------------------------------------------------------------------------------------------------------------

    function _onEventReceived(e) {
        _getOrCreateEntry(e.event);
    }

    function _onEventStarted(e) {
        const entry = _getOrCreateEntry(e.event);
        if (!entry || entry.state !== 'pending') {
            return;
        }
        const now = _currentTime();
        entry.state = 'active';
        // Joining within the tolerance counts as playing from the start; otherwise only what is played from now on
        // is tracked (a seek into the middle of an ad does not fire the skipped beacons).
        entry.playedFrom = now - entry.start <= JOIN_TOLERANCE ? entry.start : now;
        onLog('info', `Event ${entry.label} started at ${now.toFixed(3)}s`);
        _process(now);
    }

    function _onTimeUpdated(e) {
        const now = typeof e.time === 'number' ? e.time : _currentTime();
        _process(now);
        lastTime = now;
    }

    function _onSeeking(e) {
        const target = typeof e.seekTime === 'number' ? e.seekTime : _currentTime();
        getEntries().forEach(function (entry) {
            if (entry.state !== 'active') {
                return;
            }
            entry.playedFrom = target;
            entry.containers.forEach(function (container) {
                container.schedule.forEach(function (item) {
                    if (!item.fired && !item.skipped && item.time !== null && item.time < target - TIME_EPSILON) {
                        item.skipped = true;
                        onLog('info', `Skipped ${item.type} beacon of ${container.label} (seek to ${target.toFixed(3)}s)`);
                    }
                });
                if (container.started && !container.ended && (target < container.start || target >= container.end)) {
                    _endContainer(container, 'seek');
                }
            });
        });
        lastTime = target;
    }

    function _onPaused(e) {
        // The browser fires pause before ended when playback reaches the end; that is not a user pause.
        if (e && e.ended) {
            return;
        }
        paused = true;
        _fireAction('pause');
    }

    function _onPlaying() {
        if (paused) {
            paused = false;
            _fireAction('resume');
        }
    }

    function _onEnded() {
        _process(_currentTime() + TIME_EPSILON);
    }

    function _onVolumeChanged() {
        const isMuted = player.isMuted();
        if (isMuted !== muted) {
            muted = isMuted;
            _fireAction(isMuted ? 'mute' : 'unmute');
        }
    }

    function _onError() {
        _fireAction('error');
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Parsing (SVTA2053-1 clause 5 and 6.1)
    // ---------------------------------------------------------------------------------------------------------------

    function _getOrCreateEntry(event) {
        const key = _eventKey(event);
        if (entries[key]) {
            return entries[key];
        }
        const entry = _parseEvent(event, key);
        if (entry) {
            entries[key] = entry;
            onLog('info', `Registered ${entry.label}: ${entry.containers.length} container(s), ` +
                `start ${entry.start.toFixed(3)}s, duration ${entry.duration.toFixed(3)}s`);
        } else {
            // Remember invalid events so they are reported only once
            entries[key] = { key, state: 'invalid', containers: [] };
        }
        return entries[key].state === 'invalid' ? null : entries[key];
    }

    function _eventKey(event) {
        const stream = event.eventStream || {};
        const periodId = stream.period ? stream.period.id : '';
        const id = event.id !== null && event.id !== undefined && !isNaN(event.id) ? event.id : 't' + event.presentationTime;
        return `${stream.schemeIdUri}|${periodId}|${id}`;
    }

    function _parseEvent(event, key) {
        const stream = event.eventStream || {};
        const periodId = stream.period ? stream.period.id : undefined;
        const label = `event ${event.id} (period ${periodId})`;

        if (stream.schemeIdUri === SVTA_EXAMPLE_SCHEME_ID_URI) {
            onLog('warn', `${label} uses the example scheme URI ${SVTA_EXAMPLE_SCHEME_ID_URI}; ` +
                `the normative URI is ${SVTA_SCHEME_ID_URI}`);
        }

        let envelope;
        try {
            let data = event.messageData;
            if (data instanceof Uint8Array) {
                data = new TextDecoder().decode(data);
            }
            envelope = JSON.parse(String(data).trim());
        } catch (e) {
            onLog('error', `${label}: payload is not valid JSON (${e.message})`);
            return null;
        }
        if (!_isObject(envelope)) {
            onLog('error', `${label}: payload is not a JSON object`);
            return null;
        }

        const start = event.calculatedPresentationTime;
        const duration = isNaN(event.duration) ? 0 : event.duration;
        const entry = {
            key,
            label,
            eventId: event.id,
            periodId,
            schemeIdUri: stream.schemeIdUri,
            start,
            duration,
            end: start + duration,
            version: envelope.version,
            envelopeType: null,
            state: 'pending',
            playedFrom: start,
            containers: []
        };

        if (envelope.version === 1) {
            // Version 1 carries identifiers only (clause 5.1), there is nothing to track.
            entry.envelopeType = 'v1';
            entry.containers.push(_createContainer(entry, 'slot', {
                type: 'linear',
                start: 0,
                duration,
                identifiers: envelope.identifiers || []
            }, start, duration, 0, 1));
            return entry;
        }

        if (envelope.version !== 2) {
            onLog('error', `${label}: unsupported payload version ${envelope.version}`);
            return null;
        }
        if (ENVELOPE_TYPES.indexOf(envelope.type) === -1 || !Array.isArray(envelope.payload) ||
            envelope.payload.length === 0) {
            onLog('error', `${label}: invalid carriage envelope (type ${envelope.type})`);
            return null;
        }
        entry.envelopeType = envelope.type;

        if (envelope.type === 'slot') {
            _objects(envelope.payload, `${label}: payload`).forEach(function (slot, i, slots) {
                const slotStart = start + _num(slot.start, 0);
                entry.containers.push(_createContainer(entry, 'slot', slot, slotStart, _num(slot.duration, duration), i,
                    slots.length));
            });
        } else if (envelope.type === 'pod') {
            if (envelope.payload.length > 1) {
                onLog('warn', `${label}: ${envelope.payload.length} pods in one event, only the first is used`);
            }
            const pod = envelope.payload[0];
            if (!_isObject(pod)) {
                onLog('error', `${label}: pod is not an object`);
                return null;
            }
            // In DASH carriage the Event@presentationTime anchors the creative asset (Table 18); Pod.start is ignored.
            const podDuration = _num(pod.duration, duration);
            entry.containers.push(_createContainer(entry, 'pod', pod, start, podDuration, 0, 1));
            const slots = _objects(pod.slots, `${label}: pod slots`);
            slots.forEach(function (slot, i) {
                entry.containers.push(_createContainer(entry, 'slot', slot, start + _num(slot.start, 0),
                    _num(slot.duration, 0), i, slots.length));
            });
        } else if (envelope.type === 'trackingEvent') {
            // Tracking events directly in the envelope are relative to the event start.
            entry.containers.push(_createContainer(entry, 'event', { tracking: envelope.payload }, start, duration, 0, 1));
        } else {
            onLog('info', `${label}: verification envelopes are not handled`);
        }
        return entry;
    }

    function _createContainer(entry, kind, data, start, duration, index, count) {
        const container = {
            kind,
            label: `${kind} ${index + 1}/${count} of ${entry.label}`,
            entry,
            data,
            index,
            count,
            start,
            duration,
            end: start + duration,
            started: false,
            ended: false,
            schedule: []
        };
        if (data.$remote) {
            onLog('warn', `${container.label}: $remote fields are not supported, ignored`);
        }
        _buildSchedule(container, Array.isArray(data.tracking) ? data.tracking : []);
        return container;
    }

    function _buildSchedule(container, tracking) {
        container.schedule = [];
        _objects(tracking, `${container.label}: tracking`).forEach(function (trackingEvent) {
            const type = trackingEvent.type;
            const urls = (Array.isArray(trackingEvent.urls) ? trackingEvent.urls : []).filter(function (url) {
                if (typeof url !== 'string') {
                    onLog('warn', `${container.label}: ${type} tracking URL ${JSON.stringify(url)} is not a string, ignored`);
                    return false;
                }
                return true;
            });
            // Table 8 names the field "offset", Table 11 "start"; both are accepted, "offset" wins.
            const offset = _num(trackingEvent.offset, _num(trackingEvent.start, null));
            const item = { type, urls, time: null, trigger: null, fired: false, skipped: false };

            if (offset !== null) {
                item.time = container.start + offset;
                item.trigger = 'time';
            } else if (TIME_TRIGGERS.hasOwnProperty(type)) {
                item.time = container.start + TIME_TRIGGERS[type] * container.duration;
                item.trigger = 'time';
            } else if (ACTION_TYPES.indexOf(type) !== -1) {
                item.trigger = 'action';
            } else if (type === 'progress') {
                onLog('warn', `${container.label}: progress tracking event without offset, ignored`);
                return;
            } else if (UNSUPPORTED_TYPES.some(function (t) {
                return t.toLowerCase() === String(type).toLowerCase();
            })) {
                onLog('info', `${container.label}: ${type} tracking events are not supported yet, ignored`);
                return;
            } else {
                onLog('warn', `${container.label}: unknown tracking event type ${type}, ignored`);
                return;
            }
            container.schedule.push(item);
        });
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Scheduling and dispatch
    // ---------------------------------------------------------------------------------------------------------------

    function _process(now) {
        getEntries().forEach(function (entry) {
            if (entry.state !== 'active') {
                return;
            }
            entry.containers.forEach(function (container) {
                if (container.ended) {
                    return;
                }
                if (!container.started && now >= container.start - TIME_EPSILON && now < container.end) {
                    container.started = true;
                    onSlotStart(_metadata(container));
                }
                container.schedule.forEach(function (item) {
                    if (item.trigger !== 'time' || item.fired || item.skipped) {
                        return;
                    }
                    if (item.time < entry.playedFrom - TIME_EPSILON) {
                        item.skipped = true;
                        return;
                    }
                    if (now >= item.time - TIME_EPSILON) {
                        _fire(container, item, now);
                    }
                });
                if (container.started && now >= container.end - TIME_EPSILON) {
                    _endContainer(container, 'complete');
                }
            });
            if (now >= entry.end - TIME_EPSILON && entry.containers.every(function (c) {
                return c.ended || !c.started;
            })) {
                entry.state = 'ended';
                onLog('info', `Event ${entry.label} ended`);
            }
        });
    }

    function _endContainer(container, reason) {
        container.ended = true;
        const meta = _metadata(container);
        meta.reason = reason;
        onSlotEnd(meta);
    }

    function _fireAction(type) {
        const now = _currentTime();
        getEntries().forEach(function (entry) {
            if (entry.state !== 'active') {
                return;
            }
            entry.containers.forEach(function (container) {
                if (!container.started || container.ended) {
                    return;
                }
                container.schedule.forEach(function (item) {
                    // Unlike the time-based events, user actions are reported each time they occur
                    if (item.trigger === 'action' && item.type === type) {
                        _fire(container, item, now);
                    }
                });
            });
        });
    }

    function _fire(container, item, now) {
        item.fired = true;
        const late = item.time !== null && now - item.time > LATE_THRESHOLD;
        item.urls.forEach(function (rawUrl) {
            const url = _replaceMacros(rawUrl, container, now);
            const record = {
                type: item.type,
                url,
                rawUrl,
                eventId: container.entry.eventId,
                periodId: container.entry.periodId,
                container: container.kind,
                containerIndex: container.index,
                scheduledTime: item.time,
                firedAt: now,
                late,
                result: _sendBeacon(url)
            };
            onLog(late ? 'warn' : 'info', `Beacon ${item.type}${late ? ' (late)' : ''} for ${container.label}: ${url}`);
            onBeacon(record);
        });
    }

    /**
     * ISO/IEC 23009-1 clause 5.10.4.5 and VAST: a GET request whose response is ignored. Failures are only logged
     * and never interrupt playback.
     */
    function _sendBeacon(url) {
        return _fetchWithTimeout(url, {
            method: 'GET',
            mode: 'no-cors',
            keepalive: true,
            credentials: 'omit',
            cache: 'no-store'
        })
            .then(function () {
                return 'sent';
            })
            .catch(function (e) {
                onLog('error', `Beacon request failed: ${url} (${e.message})`);
                return 'error: ' + e.message;
            });
    }

    function _fetchWithTimeout(url, options) {
        const opts = Object.assign({}, options);
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            opts.signal = AbortSignal.timeout(requestTimeout);
        }
        return fetch(url, opts);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // VAST macros (SVTA2053-1 clause 5.2.3); limited subset, unknown macros stay untouched
    // ---------------------------------------------------------------------------------------------------------------

    function _replaceMacros(url, container, now) {
        const values = {
            TIMESTAMP: new Date().toISOString(),
            CACHEBUSTING: String(Math.floor(10000000 + Math.random() * 90000000)),
            ADPLAYHEAD: _formatPlayhead(Math.max(0, now - container.start)),
            MEDIAPLAYHEAD: _formatPlayhead(Math.max(0, now))
        };
        return url.replace(/\[([A-Z_]+)\]/g, function (match, name) {
            return values.hasOwnProperty(name) ? encodeURIComponent(values[name]) : match;
        });
    }

    function _formatPlayhead(seconds) {
        const ms = Math.round(seconds * 1000);
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        const pad = function (n, l) {
            return String(n).padStart(l, '0');
        };
        return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms % 1000, 3)}`;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------------------------------

    function _metadata(container) {
        const data = container.data || {};
        return {
            kind: container.kind,
            eventId: container.entry.eventId,
            periodId: container.entry.periodId,
            envelopeVersion: container.entry.version,
            envelopeType: container.entry.envelopeType,
            index: container.index,
            count: container.count,
            start: container.start,
            duration: container.duration,
            type: data.type,
            identifiers: data.identifiers || [],
            skipOffset: data.skipOffset,
            clickThrough: data.clickThrough
        };
    }

    function _currentTime() {
        try {
            return player.time();
        } catch (e) {
            return lastTime;
        }
    }

    function _isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    // Returns the object entries of an array; other entries are reported and dropped
    function _objects(list, what) {
        if (!Array.isArray(list)) {
            return [];
        }
        return list.filter(function (item, i) {
            if (!_isObject(item)) {
                onLog('warn', `${what}[${i}] is not an object, ignored`);
                return false;
            }
            return true;
        });
    }

    function _num(value, fallback) {
        return typeof value === 'number' && isFinite(value) ? value : fallback;
    }

    return {
        attach,
        detach,
        reset,
        getEntries
    };
}
