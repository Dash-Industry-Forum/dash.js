/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Fraunhofer Fokus
 * Copyright (c) 2014, British Broadcasting Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * - Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/*globals MediaPlayer, TrackEvent*/
MediaPlayer.dependencies.EventController = function () {
    "use strict";

    var EventCue = window.DataCue || window.VTTCue,
        mediaElement,

        // HBBTV profiles a few additional constraints. this decides whether
        // we should adhere to them. on the whole, it doesn't really matter
        HBBTV_COMPLIANT = true,

        /**
         * to ensure all cues become active, they must have a duration at least
         * as long as time it takes for the user agent to raise them
         *
         * @param event
         */
        ensureSensibleDuration = function (event) {
            var MINIMUM_DURATION_S = HBBTV_COMPLIANT ? 0.250 : 0,
                duration = event.duration === 0xFFFF ?
                        Number.MAX_VALUE :
                        event.duration / (event.timescale || 1);

            event.duration = duration;

            if (duration < MINIMUM_DURATION_S) {
                event.duration = MINIMUM_DURATION_S;
            }

            if (event.schemeIdUri === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_SCHEME_ID_URI &&
                    (event.value === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_UPDATE ||
                    event.value === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_PATCH ||
                    event.value === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_INBAND)) {
                // in this special case, the duration isn't a duration.
                // however, we still don't handle this case. even so, we still
                // need a non-zero length duration so the cue ends up in the
                // activeCues list.
                event.duration = MINIMUM_DURATION_S;
            }

            return event.duration;
        },

        /**
         * search the cue list for a cue with the same id (and, by definition,
         * same schemeIdUri and value). deliberately do not use getCueById
         * since that method returns the first instance - we may want another.
         *
         * @param cues  - a TextTrackCueList object
         * @param cue   - a TextTrackCue/VTTCue
         */
        findExistingCue = function (cues, cue) {
            var numCues = cues.length,
                i = 0;

            while (i < numCues) {
                if (cues[i].id === cue.id) {
                    if ((cue.startTime >= cues[i].startTime) &&
                            (cue.startTime < cues[i].endTime)) {
                        return cues[i];
                    }
                }

                i += 1;
            }
        },
        /**
         * given a schemeIdUri and value, find a matching TextTrack
         *
         * @param schemeIdUri
         * @param value
         * @param includeDisabled - should search disabled tracks too
         */
        findTrackBySchemeAndValue = function (schemeIdUri, value, includeDisabled) {
            var tracks = mediaElement.textTracks,
                numTracks,
                track,
                trackLabel = schemeIdUri + ' ' + value,
                i;

            if (tracks) {
                numTracks = tracks.length;

                for (i = 0; i < numTracks; i += 1) {
                    track = tracks[i];

                    if (track.label === trackLabel) {
                        if (includeDisabled || track.mode !== 'disabled') {
                            return track;
                        } else {
                            return undefined;
                        }
                    }
                }
            }
        },

        /**
         * create a track on the media element
         * if there is already a text track with the same schemeIduri and value
         * they are equivalent. just return the original one, re-enabling it if
         * necessary.
         *
         * @param schemeIdUri
         * @param value
         */
        createTrack = function (schemeIdUri, value) {
            var self = this,
                track = findTrackBySchemeAndValue.call(
                    self,
                    schemeIdUri,
                    value,
                    true
                ),
                label = schemeIdUri + ' ' + value;

            if (!track) {
                track = mediaElement.addTextTrack('metadata', label, '');
                if (track) {
                    track.mode = 'hidden';
                }
            } else {
                if (track.mode === 'disabled') {
                    track.mode = 'hidden';

                    // when calling addTextTrack above, this event will be
                    // dispatched automatically. in the reenabling case, we
                    // must do it ourselves.
                    mediaElement.textTracks.dispatchEvent(
                        new TrackEvent('addtrack', { track: track })
                    );
                }
            }

            this.eventBus.dispatchEvent({
                type:   'addtrack',
                track:  track
            });

            return track;
        },

        /**
         * 'remove' the track from the media element
         * (there's no API call to removeTextTrack, so just delete all
         * the cues and set the mode to disabled.)
         *
         * @param track - the TextTrack object
         */
        removeTrack = function (track) {

            if (track && track.mode !== 'disabled') {

                while (track.cues.length) {
                    track.removeCue(track.cues[0]);
                }

                track.mode = 'disabled';

                this.eventBus.dispatchEvent({
                    type:   'removetrack',
                    track:  track
                });

                // note that, by explicitly dispatching here, this event may
                // be dispatched twice when the media resource is torn down.
                // this may need to be considered in handlers. unfortunately
                // there isn't really a way around this. since the media
                // element persists across sessions, hopefully it shouldn't be
                // an issue.
                mediaElement.textTracks.dispatchEvent(
                    new TrackEvent('removetrack', { track: track })
                );
            }
        },

        /**
         * given a schemeIdUri and value, remove track from the media element
         *
         * @param schemeIdUri
         * @param value
         */
        removeTrackBySchemeAndValue = function (schemeIdUri, value) {
            var track = findTrackBySchemeAndValue.call(
                this,
                schemeIdUri,
                value
            );

            removeTrack.call(this, track);
        },

        /**
         * iterate accross the tracklist, 'removing' each track
         */
        removeAllTracks = function () {
            var tracks = mediaElement.textTracks,
                numTracks,
                i;

            if (tracks) {
                numTracks = tracks.length;

                for (i = 0; i < numTracks; i += 1) {
                    removeTrack.call(this, tracks[i]);
                }
            }
        },

        /**
         * add Events and InbandEvents to Track, modifying existing cues if
         * necessary. uses Cue objects to represent Events
         *
         * @param track - TextTrack object
         * @param events - array of Event/InbandEvent objects
         * @param timescale - timescale for all events in [events]
         */
        addEventsToTrack = function (track, events, timescale) {
            var numEvents = events.length,
                event,
                startTime,
                duration,
                endTime,
                cue,
                existingCue,
                i,
                key;

            if (track) {
                for (i = 0; i < numEvents; i += 1) {
                    event = events[i];

                    startTime = (event.presentationTime || 0) / (timescale || 1);
                    duration = ensureSensibleDuration(event);
                    endTime = startTime + duration;

                    cue = new EventCue(
                        startTime,
                        endTime,
                        JSON.stringify(event)
                    );
                    cue.id = event.id;

                    existingCue = findExistingCue(track.cues, cue);
                    if (existingCue) {
                        // update the existing cue in place with deep copy
                        // probably only need endTime and text, but be safe
                        for (key in cue) {
                            if (cue.hasOwnProperty(key)) {
                                existingCue[key] = cue[key];
                            }
                        }
                    } else {
                        track.addCue(cue);
                    }
                }
            }
        },

        /**
         * add EventStreams and Events, creating Tracks if necessary
         *
         * @param eventStreams - array of EventStream objects
         * @param clearEvents - optionally remove all existing EventStreams
         */
        addEventStreams = function (eventStreams, clearEvents) {
            var numEventStreams,
                eventStream,
                track,
                i;

            if (clearEvents) {
                removeAllTracks.call(this);
            }

            numEventStreams = eventStreams.length;

            for (i = 0; i < numEventStreams; i += 1) {
                eventStream = eventStreams[i];
                if (eventStream) {

                    // will return the track if it already exists
                    track = createTrack.call(
                        this,
                        eventStream.schemeIdUri,
                        eventStream.value
                    );

                    if (track) {
                        addEventsToTrack.call(
                            this,
                            track,
                            eventStream.events,
                            eventStream.timescale
                        );
                    }
                }
            }
        },

        /**
         * remove Tracks associated with EventStream objects
         *
         * @param eventStreams - array of EventStream objects
         */
        removeEventStreams = function (eventStreams) {
            var self = this,
                numEventStreams,
                eventStream,
                track,
                i;

            numEventStreams = eventStreams.length;

            for (i = 0; i < numEventStreams; i += 1) {
                eventStream = eventStreams[i];
                if (eventStream) {
                    track = removeTrackBySchemeAndValue.call(
                        self,
                        eventStream.schemeIdUri,
                        eventStream.value
                    );
                }
            }
        },

        /**
         * Handles the switch between Representations or AdaptationSets by
         * taking arrays of old and new EventStreams and managing the TextTrack
         * according to their contents: entries which exist in both will remain
         * unchanged, old entries only will be removed, new only added.
         *
         * @param oldEventStreams - the previous list of EventStreams
         * @param newEventStreams - the list of new EventStreams
         */
        handleSwitch = function (oldEventStreams, newEventStreams) {
            var compareEventStreams = function (l, r) {
                    return ((l.schemeIdUri === r.schemeIdUri) &&
                        (l.value === r.value) &&
                        (l.id === r.id));
                },

                // there is certainly a more efficient way of acheiving this,
                // but the number of entries should be small.
                getOnlyInLNotR = function (l, r) {
                    return l.filter(function (l1) {
                        return !r.some(function (r1) {
                            return compareEventStreams(l1, r1);
                        });
                    });
                },

                onlyInOld = getOnlyInLNotR(oldEventStreams, newEventStreams),
                onlyInNew = getOnlyInLNotR(newEventStreams, oldEventStreams);

            removeEventStreams.call(this, onlyInOld);
            addEventStreams.call(this, onlyInNew);
        },

        /**
         * adds an Event object to the associated Track
         *
         * @param events - array of Event/InbandEvent objects
         */
        addInbandEvents = function (events) {
            var numEvents = events.length,
                event,
                track,
                i;

            for (i = 0; i < numEvents; i += 1) {
                event = events[i];

                track = findTrackBySchemeAndValue.call(
                    this,
                    event.schemeIdUri,
                    event.value
                );

                if (track) {
                    addEventsToTrack.call(
                        this,
                        track,
                        [event],
                        event.timescale
                    );
                }
            }
        },

        /**
         * reset this controller, disabling all tracks
         */
        reset = function () {
            removeAllTracks.call(this);
        },

        /**
         * associates the media element
         *
         * @param HTMLMediaElement
         */
        setMediaElement = function (value) {
            mediaElement = value;
        };

    return {
        // external dependencies
        eventBus: undefined,

        // currently, these handlers all do the same, but they may not always
        handleRepresentationSwitch: handleSwitch,
        handleAdaptationSetSwitch: handleSwitch,
        handlePeriodSwitch: handleSwitch,
        reset: reset,
        addInbandEvents: addInbandEvents,
        addEventStreams: addEventStreams,

        /**
         * initialises the eventController
         * currently, this is just a case of setting the media object
         *
         * @param videoModel
         */
        initialize: function (videoModel) {
            setMediaElement(videoModel.getElement());
        }
    };
};

MediaPlayer.dependencies.EventController.prototype = {
    constructor: MediaPlayer.dependencies.EventController
};
