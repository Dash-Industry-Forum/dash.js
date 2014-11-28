Dash.dependencies.RepresentationController = function () {
    "use strict";

    var data = null,
        dataIndex = -1,
        updating = true,
        availableRepresentations = [],
        currentRepresentation,

        updateData = function (dataValue, adaptation, type) {
            var self = this,
                previousRepresentation = currentRepresentation,
                manifest = this.manifestModel.getValue(),
                i;

            updating = true;
            self.notify(self.eventList.ENAME_DATA_UPDATE_STARTED);

            availableRepresentations = updateRepresentations.call(self, adaptation);
            currentRepresentation = getRepresentationForQuality.call(self, self.abrController.getQualityFor(type, self.streamProcessor.getStreamInfo()));
            data = dataValue;

            // stop raising events for the old representation
            self.streamProcessor.getEventController().handleRepresentationSwitch(
                self.manifestExt.getEventStreamsForRepresentation(manifest, previousRepresentation),
                self.manifestExt.getEventStreamsForRepresentation(manifest, currentRepresentation)
            );

            if (type !== "video" && type !== "audio") {
                self.notify(self.eventList.ENAME_DATA_UPDATE_COMPLETED, data, currentRepresentation);
                addRepresentationSwitch.call(self);
                return;
            }

            for (i = 0; i < availableRepresentations.length; i += 1) {
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

                    for (var i = 0; i < availableRepresentations.length; i += 1) {
                        self.indexHandler.updateRepresentation(availableRepresentations[i], true);
                    }
                };

            updating = false;
            setTimeout(update.bind(this), delay);
        },

        onRepresentationUpdated = function(sender, representation, error) {
            if (!this.isUpdating()) return;

            var self = this,
                r = representation,
                metrics = self.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics),
                repInfo,
                err,
                alreadyAdded = false;

            if (error && error.code === Dash.dependencies.DashHandler.SEGMENTS_UNAVAILABLE_ERROR_CODE) {
                addDVRMetric.call(this);
                postponeUpdate.call(this, error.availabilityDelay);
                err = {code: Dash.dependencies.RepresentationController.SEGMENTS_UPDATE_FAILED_ERROR_CODE};
                this.notify(this.eventList.ENAME_DATA_UPDATE_COMPLETED, data, currentRepresentation, err);

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
                this.notify(this.eventList.ENAME_DATA_UPDATE_COMPLETED, data, currentRepresentation);
                addRepresentationSwitch.call(self);
            }
        },

        onWallclockTimeUpdated = function(sender, isDynamic/*, wallclockTime*/) {
            updateAvailabilityWindow.call(this, isDynamic);
        },

        onLiveEdgeFound = function(/*sender, liveEdgeTime, searchTime*/) {
            updateAvailabilityWindow.call(this, true);
            this.indexHandler.updateRepresentation(currentRepresentation, false);

            // we need to update checkTime after we have found the live edge because its initial value
            // does not take into account clientServerTimeShift
            var manifest = this.manifestModel.getValue();
            currentRepresentation.adaptation.period.mpd.checkTime = this.manifestExt.getCheckTime(manifest, currentRepresentation.adaptation.period);
        },

        onBufferLevelUpdated = function(/*sender, bufferLevel*/) {
            addDVRMetric.call(this);
        },

        onQualityChanged = function(sender, type, streamInfo, oldQuality, newQuality) {
            var self = this,
                manifest = this.manifestModel.getValue(),
                previousRepresentation = currentRepresentation;

            if (type !== self.streamProcessor.getType() || self.streamProcessor.getStreamInfo().id !== streamInfo.id) return;

            currentRepresentation = self.getRepresentationForQuality(newQuality);
            addRepresentationSwitch.call(self);

            // stop raising events for the old representation
            self.streamProcessor.getEventController().handleRepresentationSwitch(
                self.manifestExt.getEventStreamsForRepresentation(manifest, previousRepresentation),
                self.manifestExt.getEventStreamsForRepresentation(manifest, currentRepresentation)
            );
        };

    return {
        system: undefined,
        debug: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        abrController: undefined,
        timelineConverter: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        eventList: {
            ENAME_DATA_UPDATE_COMPLETED: "dataUpdateCompleted",
            ENAME_DATA_UPDATE_STARTED: "dataUpdateStarted"
        },

        setup: function() {
            this.qualityChanged = onQualityChanged;
            this.representationUpdated = onRepresentationUpdated;
            this.wallclockTimeUpdated = onWallclockTimeUpdated;
            this.liveEdgeFound = onLiveEdgeFound;
            this.bufferLevelUpdated = onBufferLevelUpdated;
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
