Dash.dependencies.RepresentationController = function () {
    "use strict";

    var data = null,
        dataIndex = -1,
        updating = true,
        availableRepresentations = [],
        currentRepresentation,

        updateData = function(dataValue, adaptation, type) {
            var self = this;

            updating = true;
            self.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED);

            availableRepresentations = updateRepresentations.call(self, adaptation);
            currentRepresentation = getRepresentationForQuality.call(self, self.abrController.getQualityFor(type, self.streamProcessor.getStreamInfo()));
            data = dataValue;

            if (type !== "video" && type !== "audio") {
                updating = false;
                self.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, {data: data, currentRepresentation: currentRepresentation});
                addRepresentationSwitch.call(self);
                return;
            }

            for (var i = 0; i < availableRepresentations.length; i += 1) {
                self.indexHandler.updateRepresentation(availableRepresentations[i], true);
            }
        },

        addRepresentationSwitch = function() {
            var now = new Date(),
                currentRepresentation = this.getCurrentRepresentation(),
                currentVideoTime = this.streamProcessor.playbackController.getTime();

            this.metricsModel.addTrackSwitch(currentRepresentation.adaptation.type, now, currentVideoTime, currentRepresentation.id);
        },

        addDVRMetric = function() {
            var streamProcessor = this.streamProcessor,
                range = this.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, streamProcessor.isDynamic());

            this.metricsModel.addDVRInfo(streamProcessor.getType(), streamProcessor.playbackController.getTime(), streamProcessor.getStreamInfo().manifestInfo, range);
        },

        getRepresentationForQuality = function(quality) {
            return availableRepresentations[quality];
        },

        isAllRepresentationsUpdated = function() {
            for (var i = 0, ln = availableRepresentations.length; i < ln; i += 1) {
                if (availableRepresentations[i].segmentAvailabilityRange === null || availableRepresentations[i].initialization === null) return false;
            }

            return true;
        },

        updateRepresentations = function(adaptation) {
            var self = this,
                reps,
                manifest = self.manifestModel.getValue();

            dataIndex = self.manifestExt.getIndexForAdaptation(data, manifest, adaptation.period.index);
            reps = self.manifestExt.getRepresentationsForAdaptation(manifest, adaptation);

            return reps;
        },

        updateAvailabilityWindow = function(isDynamic) {
            var self = this,
                rep;

            for (var i = 0, ln = availableRepresentations.length; i < ln; i +=1) {
                rep = availableRepresentations[i];
                rep.segmentAvailabilityRange = self.timelineConverter.calcSegmentAvailabilityRange(rep, isDynamic);
            }
        },

        postponeUpdate = function(availabilityDelay) {
            var self = this,
                delay = (availabilityDelay + (currentRepresentation.segmentDuration * 3)) * 1000,
                update = function() {
                    if (this.isUpdating()) return;

                    updating = true;
                    self.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED);
                    for (var i = 0; i < availableRepresentations.length; i += 1) {
                        self.indexHandler.updateRepresentation(availableRepresentations[i], true);
                    }
                };

            updating = false;
            setTimeout(update.bind(this), delay);
        },

        onRepresentationUpdated = function(e) {
            if (!this.isUpdating()) return;

            var self = this,
                r = e.data.representation,
                metrics = self.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics),
                repInfo,
                err,
                alreadyAdded = false;

            if (e.error && e.error.code === Dash.dependencies.DashHandler.SEGMENTS_UNAVAILABLE_ERROR_CODE) {
                addDVRMetric.call(this);
                postponeUpdate.call(this, e.error.data.availabilityDelay);
                err = new MediaPlayer.vo.Error(Dash.dependencies.RepresentationController.SEGMENTS_UPDATE_FAILED_ERROR_CODE, "Segments update failed", null);
                this.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, {data: data, currentRepresentation: currentRepresentation}, err);

                return;
            }

            for (var i = 0; i < manifestUpdateInfo.trackInfo.length; i += 1) {
                repInfo = manifestUpdateInfo.trackInfo[i];
                if (repInfo.index === r.index && repInfo.mediaType === self.streamProcessor.getType()) {
                    alreadyAdded = true;
                    break;
                }
            }

            if (!alreadyAdded) {
                self.metricsModel.addManifestUpdateTrackInfo(manifestUpdateInfo, r.id, r.index, r.adaptation.period.index,
                    self.streamProcessor.getType(),r.presentationTimeOffset, r.startNumber, r.segmentInfoType);
            }

            if (isAllRepresentationsUpdated()) {
                updating = false;
                self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {latency: currentRepresentation.segmentAvailabilityRange.end - self.streamProcessor.playbackController.getTime()});
                this.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, {data: data, currentRepresentation: currentRepresentation});
                addRepresentationSwitch.call(self);
            }
        },

        onWallclockTimeUpdated = function(e) {
            updateAvailabilityWindow.call(this, e.data.isDynamic);
        },

        onLiveEdgeSearchCompleted = function(e) {
            if (e.error) return;

            updateAvailabilityWindow.call(this, true);
            this.indexHandler.updateRepresentation(currentRepresentation, false);

            // we need to update checkTime after we have found the live edge because its initial value
            // does not take into account clientServerTimeShift
            var manifest = this.manifestModel.getValue();
            currentRepresentation.adaptation.period.mpd.checkTime = this.manifestExt.getCheckTime(manifest, currentRepresentation.adaptation.period);
        },

        onBufferLevelUpdated = function(/*e*/) {
            addDVRMetric.call(this);
        },

        onQualityChanged = function(e) {
            var self = this;

            if (e.data.mediaType !== self.streamProcessor.getType() || self.streamProcessor.getStreamInfo().id !== e.data.streamInfo.id) return;

            currentRepresentation = self.getRepresentationForQuality(e.data.newQuality);
            addRepresentationSwitch.call(self);
        };

    return {
        system: undefined,
        log: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        abrController: undefined,
        timelineConverter: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED] = onQualityChanged;
            this[Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED] = onRepresentationUpdated;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED] = onWallclockTimeUpdated;
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted;
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED] = onBufferLevelUpdated;
        },

        initialize: function(streamProcessor) {
            this.streamProcessor = streamProcessor;
            this.indexHandler = streamProcessor.indexHandler;
        },

        getData: function() {
            return data;
        },

        getDataIndex: function() {
            return dataIndex;
        },

        isUpdating: function() {
            return updating;
        },

        updateData: updateData,
        getRepresentationForQuality: getRepresentationForQuality,

        getCurrentRepresentation: function() {
            return currentRepresentation;
        }
    };
};

Dash.dependencies.RepresentationController.prototype = {
    constructor: Dash.dependencies.RepresentationController
};

Dash.dependencies.RepresentationController.SEGMENTS_UPDATE_FAILED_ERROR_CODE = 1;

Dash.dependencies.RepresentationController.eventList = {
    ENAME_DATA_UPDATE_COMPLETED: "dataUpdateCompleted",
    ENAME_DATA_UPDATE_STARTED: "dataUpdateStarted"
};