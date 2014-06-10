/**
 * Created by dsi on 02.06.2014.
 */
/**
 * Created by dsi on 31.03.14.
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
            if(eventInterval !== null) {
                clearInterval(eventInterval);
                eventInterval = null;
            }

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
            self.debug.log("Start Event Controller");

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
            self.debug.log("Added "+values.length+ " inline events");
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
                self.debug.log("Add inband event with id "+event.id);
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
                        if (presentationTime == 0 || (presentationTime <= currentVideoTime && presentationTime + presentationTimeThreshold > currentVideoTime)) {
                            self.debug.log("Start Event at " + currentVideoTime);
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
                        self.debug.log("Remove Event at time " + currentVideoTime);
                        curr = null;
                        activeEvents.splice(i, 1);
                    }
                }
            }

        },

        refreshManifest = function () {
            var self = this,
                manifest = self.manifestModel.getValue();

            var url = manifest.mpdUrl;
            //var url = "http://se-mashup.fokus.fraunhofer.de:8080/dash/dsi/inband_event_2/dash_2.mpd";
            if (manifest.hasOwnProperty("Location")) {
                url = manifest.Location;
            }

            self.debug.log("Refresh manifest @ " + url);

            self.manifestLoader.load(url);
        };

    return {
        manifestModel: undefined,
        manifestExt:undefined,
        manifestLoader:undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        videoModel:undefined,
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

    }

}