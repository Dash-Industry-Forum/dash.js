Dash.dependencies.RepresentationController = function () {
    "use strict";

    var data = null,
        dataIndex = -1,
        updating = true,
        availableRepresentations = [],
        currentRepresentation,

        updateData = function(dataValue, periodInfoValue, type) {
            var self = this;

            updating = true;
            self.notify(self.eventList.ENAME_DATA_UPDATE_STARTED);

            availableRepresentations = updateRepresentations.call(self, dataValue, periodInfoValue);
            currentRepresentation = getRepresentationForQuality.call(self, self.abrController.getQualityFor(type));
            data = dataValue;

            for (var i = 0; i < availableRepresentations.length; i += 1) {
                self.indexHandler.updateRepresentation(availableRepresentations[i]);
            }
        },

        getRepresentationForQuality = function(quality) {
            return availableRepresentations[quality];
        },

        updateRepresentations = function(data, periodInfo) {
            var self = this,
                reps,
                adaptations,
                manifest = self.manifestModel.getValue();

            dataIndex = self.manifestExt.getDataIndex(data, manifest, periodInfo.index);

            adaptations = self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo);
            reps = self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[dataIndex]);

            return reps;
        },

        onRepresentationUpdated = function(sender, representation) {
            if (representation === currentRepresentation) {
                updating = false;
                this.notify(this.eventList.ENAME_DATA_UPDATE_COMPLETED, data, currentRepresentation);
            }
        },

        onWallclockTimeUpdated = function(sender, isDynamic/*, wallclockTime*/) {
            var self = this,
                rep;

            for (var i = 0, ln = availableRepresentations.length; i < ln; i +=1) {
                rep = availableRepresentations[i];
                rep.segmentAvailabilityRange = self.timelineConverter.calcSegmentAvailabilityRange(rep, isDynamic);
            }
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
        bufferExt: undefined,
        abrController: undefined,
        timelineConverter: undefined,
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this.qualityChanged = onQualityChanged;
            this.representationUpdated = onRepresentationUpdated;
            this.wallclockTimeUpdated = onWallclockTimeUpdated;
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
