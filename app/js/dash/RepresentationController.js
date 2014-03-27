Dash.dependencies.RepresentationController = function () {
    "use strict";

    var data = null,
        availableRepresentations = [],

        updateData = function(dataValue, periodInfoValue, type) {
            var self = this,
                deferred = Q.defer(),
                representation,
                from = data;

            if (!from) {
                from = dataValue;
            }

            notifyDataUpdateStarted.call(self);

            updateRepresentations.call(self, dataValue, periodInfoValue).then(
                function(representations) {
                    availableRepresentations = representations;
                    self.abrController.getPlaybackQuality(type, from).then(
                        function (result) {
                            representation = getRepresentationForQuality.call(self, result.quality);
                            data = dataValue;
                            self.bufferExt.updateData(data, type);
                            notifyDataUpdateCompleted.call(self, representation);
                            deferred.resolve();
                        }
                    );
                }
            );

            return deferred.promise;
        },

        getRepresentationForQuality = function(quality) {
            return availableRepresentations[quality];
        },

        notifyDataUpdateStarted = function() {
            this.system.notify("dataUpdateStarted", this);
        },

        notifyDataUpdateCompleted = function(representation) {
            this.system.notify("dataUpdateCompleted", this, representation);
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
        };

    return {
        system: undefined,
        debug: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        abrController: undefined,

        getData: function() {
            return data;
        },

        updateData: updateData,
        getRepresentationForQuality: getRepresentationForQuality
    };
};

Dash.dependencies.RepresentationController.prototype = {
    constructor: Dash.dependencies.RepresentationController
};
