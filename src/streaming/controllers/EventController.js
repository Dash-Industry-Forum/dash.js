/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Fraunhofer Fokus
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.EventController = function(){
    "use strict";


    var inlineEvents = [], // Holds all Inline Events not triggered yet
        inbandEvents = [], // Holds all Inband Events not triggered yet
        activeEvents = [], // Holds all Events currently running
        eventInterval = null, // variable holding the setInterval
        refreshDelay = 100, // refreshTime for the setInterval
        presentationTimeThreshold = refreshDelay / 1000,
        MPD_RELOAD_SCHEME = "urn:mpeg:dash:event:2012",
        MPD_RELOAD_VALUE = 1,

        reset = function() {
            clear();
            inlineEvents = null;
            inbandEvents = null;
            activeEvents = null;
        },

        clear = function() {
            if(eventInterval !== null) {
                clearInterval(eventInterval);
                eventInterval = null;
            }
        },

        start = function () {
            var self = this;

            self.log("Start Event Controller");
            if (!isNaN(refreshDelay)) {
                eventInterval = setInterval(onEventTimer.bind(this), refreshDelay);
            }
        },

        /**
         * Add events to the eventList. Events that are not in the mpd anymore but not triggered yet will still be deleted
         * @param values
         */
        addInlineEvents = function(values) {
            var self = this;
            inlineEvents = [];

            if(values && values.length > 0){
                inlineEvents = values;
            }
            self.log("Added "+values.length+ " inline events");
        },

        /**
         * i.e. processing of any one event message box with the same id is sufficient
         * @param values
         */
        addInbandEvents = function(values) {
            var self = this;
            for(var i=0;i<values.length;i++) {
                var event = values[i];
                inbandEvents[event.id] = event;
                self.log("Add inband event with id "+event.id);
            }
        },

        /**
         * Itereate through the eventList and trigger/remove the events
         */
        onEventTimer = function () {
            triggerEvents.call(this,inbandEvents);
            triggerEvents.call(this,inlineEvents);
            removeEvents.call(this);
        },

        triggerEvents = function(events) {
            var self = this,
                currentVideoTime = this.videoModel.getCurrentTime(),
                presentationTime;

            /* == Trigger events that are ready == */
            if(events) {
                for (var j = 0; j < events.length; j++) {
                    var curr = events[j];

                    if (curr !== undefined) {
                        presentationTime = curr.presentationTime / curr.eventStream.timescale;
                        if (presentationTime === 0 || (presentationTime <= currentVideoTime && presentationTime + presentationTimeThreshold > currentVideoTime)) {
                            self.log("Start Event at " + currentVideoTime);
                            if (curr.duration > 0) activeEvents.push(curr);
                            if (curr.eventStream.schemeIdUri == MPD_RELOAD_SCHEME && curr.eventStream.value == MPD_RELOAD_VALUE) refreshManifest.call(this);
                            events.splice(j, 1);
                        }
                    }
                }
            }
        },

        /**
         * Remove events from the list that are over
         */
        removeEvents = function() {
            var self = this;

            if(activeEvents) {
                var currentVideoTime = this.videoModel.getCurrentTime();

                for (var i = 0; i < activeEvents.length; i++) {
                    var curr = activeEvents[i];
                    if (curr !== null && (curr.duration + curr.presentationTime) / curr.eventStream.timescale < currentVideoTime) {
                        self.log("Remove Event at time " + currentVideoTime);
                        curr = null;
                        activeEvents.splice(i, 1);
                    }
                }
            }

        },

        refreshManifest = function () {
            var self = this,
                manifest = self.manifestModel.getValue(),
                url = manifest.url;

            if (manifest.hasOwnProperty("Location")) {
                url = manifest.Location;
            }
            self.log("Refresh manifest @ " + url);
            self.manifestLoader.load(url);
        };

    return {
        manifestModel: undefined,
        manifestLoader:undefined,
        log: undefined,
        system: undefined,
        addInlineEvents : addInlineEvents,
        addInbandEvents : addInbandEvents,
        reset : reset,
        clear : clear,
        start: start,
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel:function(value) {
            this.videoModel = value;
        },
        initialize:function(videoModel) {
            this.setVideoModel(videoModel);
        }
    };

};

MediaPlayer.dependencies.EventController.prototype = {
    constructor: MediaPlayer.dependencies.EventController
};
