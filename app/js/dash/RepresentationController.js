Dash.dependencies.RepresentationController = function () {
    "use strict";

    var data = null,
        availableRepresentations = [],
        currentRepresentation,

        updateData = function(dataValue, periodInfoValue, type) {
            var self = this,
                deferred = Q.defer(),
                from = data;

            if (!from) {
                from = dataValue;
            }

            self.notify(self.notifier.ENAME_DATA_UPDATE_STARTED);

            updateRepresentations.call(self, dataValue, periodInfoValue).then(
                function(representations) {
                    availableRepresentations = representations;
                    self.abrController.getPlaybackQuality(type, from).then(
                        function (result) {
                            currentRepresentation = getRepresentationForQuality.call(self, result.quality);
                            data = dataValue;
                            self.bufferExt.updateData(data, type);
                            self.indexHandler.updateSegmentList(currentRepresentation).then(
                                function() {
                                    self.notify(self.notifier.ENAME_DATA_UPDATE_COMPLETED, currentRepresentation);
                                    deferred.resolve();
                                }
                            );
                        }
                    );
                }
            );

            return deferred.promise;
        },

        getRepresentationForQuality = function(quality) {
            return availableRepresentations[quality];
        },

        updateRepresentations = function(data, periodInfo) {
            var self = this,
                deferred = Q.defer(),
                manifest = self.manifestModel.getValue();

            self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(
                function(idx) {
                    self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(
                        function(adaptations) {
                            self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(
                                function(representations) {
                                    deferred.resolve(representations);
                                }
                            );
                        }
                    );
                }
            );

            return deferred.promise;
        },

        onQualityChanged = function(sender, oldQuality, newQuality/*, dataChanged*/) {
            var self = this;

            if (sender !== self.streamProcessor.scheduleController) return;

            currentRepresentation = self.getRepresentationForQuality(newQuality);
        };

    return {
        system: undefined,
        debug: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        abrController: undefined,
        notifier: undefined,
        notify: undefined,
        subscribe: undefined,

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
