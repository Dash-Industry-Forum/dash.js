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
            self.notify(self.eventList.ENAME_DATA_UPDATE_STARTED);

            availableRepresentations = updateRepresentations.call(self, adaptation);
            currentRepresentation = getRepresentationForQuality.call(self, self.abrController.getQualityFor(type));
            data = dataValue;

            if (type !== "video" && type !== "audio") {
                self.notify(self.eventList.ENAME_DATA_UPDATE_COMPLETED, data, currentRepresentation);
                return;
            }

            for (var i = 0; i < availableRepresentations.length; i += 1) {
                self.indexHandler.updateRepresentation(availableRepresentations[i], true);
            }
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

            dataIndex = self.manifestExt.getDataIndex(data, manifest, adaptation.period.index);
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

        onRepresentationUpdated = function(sender, representation) {
            var self = this,
                r = representation,
                metrics = self.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics),
                repInfo,
                alreadyAdded = false;

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
            }
        },

        onWallclockTimeUpdated = function(sender, isDynamic/*, wallclockTime*/) {
            updateAvailabilityWindow.call(this, isDynamic);
        },

        onLiveEdgeFound = function(/*sender, liveEdgeTime*/) {
            updateAvailabilityWindow.call(this, true);
            this.indexHandler.updateRepresentation(currentRepresentation, false);
        },

        onBufferLevelUpdated = function(sender/*, bufferLevel*/) {
            var streamProcessor = sender.streamProcessor,
                self = this,
                range = self.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, streamProcessor.isDynamic());

            self.metricsModel.addDVRInfo(streamProcessor.getType(), streamProcessor.playbackController.getTime(), streamProcessor.getStreamInfo().manifestInfo, range);
        },

        onQualityChanged = function(sender, type, oldQuality, newQuality/*, dataChanged*/) {
            var self = this;

            if (type !== self.streamProcessor.getType()) return;

            currentRepresentation = self.getRepresentationForQuality(newQuality);
        };

    return {
        system: undefined,
        debug: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        bufferExt: undefined,
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
