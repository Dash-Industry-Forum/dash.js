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
            self.indexHandler.updateSegmentList(currentRepresentation).then(
                function() {
                    updating = false;
                    self.notify(self.eventList.ENAME_DATA_UPDATE_COMPLETED, data, currentRepresentation);
                }
            );
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
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this.qualityChanged = onQualityChanged;
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
