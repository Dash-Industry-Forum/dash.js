/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import DashHandler from '../DashHandler.js';
import AbrController from '../../streaming/controllers/AbrController.js';
import PlaybackController from '../../streaming/controllers/PlaybackController.js';
import StreamController from '../../streaming/controllers/StreamController.js';
import ManifestModel from '../../streaming/models/ManifestModel.js';
import MetricsModel from '../../streaming/models/MetricsModel.js';
import DOMStorage from '../../streaming/utils/DOMStorage.js';
import Error from '../../streaming/vo/Error.js';
import EventBus from '../../streaming/utils/EventBus.js';
import Events from "../../streaming/Events.js";

let RepresentationController = function () {
    "use strict";

    var data = null,
        dataIndex = -1,
        updating = true,
        availableRepresentations = [],
        currentRepresentation,
        streamController = StreamController.getInstance(),
        playbackController = PlaybackController.getInstance(),
        manifestModel = ManifestModel.getInstance(),
        metricsModel = MetricsModel.getInstance(),
        domStorage = DOMStorage.getInstance(),

        updateData = function(dataValue, adaptation, type) {
            var self = this,
                bitrate = null,
                streamInfo = self.streamProcessor.getStreamInfo(),
                quality,
                maxQuality = self.abrController.getTopQualityIndexFor(type, streamInfo.id),
                averageThroughput;

            updating = true;
            EventBus.trigger(Events.DATA_UPDATE_STARTED, {sender: self});

            availableRepresentations = updateRepresentations.call(self, adaptation);

            if (data === null) {
                averageThroughput = self.abrController.getAverageThroughput(type);
                bitrate = averageThroughput || self.abrController.getInitialBitrateFor(type, streamInfo);
                quality = self.abrController.getQualityForBitrate(self.streamProcessor.getMediaInfo(), bitrate);
            } else {
                quality = self.abrController.getQualityFor(type, streamInfo);
            }

            if (quality > maxQuality) {
                quality = maxQuality;
            }

            currentRepresentation = getRepresentationForQuality.call(self, quality);
            data = dataValue;

            if (type !== "video" && type !== "audio" && type !== "fragmentedText") {
                updating = false;
                EventBus.trigger(Events.DATA_UPDATE_COMPLETED, {sender: self, data: data, currentRepresentation: currentRepresentation});
                return;
            }

            for (var i = 0; i < availableRepresentations.length; i += 1) {
                self.indexHandler.updateRepresentation(availableRepresentations[i], true);
            }
        },

        addRepresentationSwitch = function() {
            var now = new Date(),
                currentRepresentation = this.getCurrentRepresentation(),
                currentVideoTime = playbackController.getTime();

            metricsModel.addRepresentationSwitch(currentRepresentation.adaptation.type, now, currentVideoTime, currentRepresentation.id);
        },

        addDVRMetric = function() {
            var streamProcessor = this.streamProcessor,
                range = this.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, streamProcessor.isDynamic());

            metricsModel.addDVRInfo(streamProcessor.getType(), playbackController.getTime(), streamProcessor.getStreamInfo().manifestInfo, range);
        },

        getRepresentationForQuality = function(quality) {
            return availableRepresentations[quality];
        },

        getQualityForRepresentation = function(representation) {
            return availableRepresentations.indexOf(representation);
        },

        isAllRepresentationsUpdated = function() {
            for (var i = 0, ln = availableRepresentations.length; i < ln; i += 1) {
                var segmentInfoType = availableRepresentations[i].segmentInfoType;
                if (availableRepresentations[i].segmentAvailabilityRange === null || availableRepresentations[i].initialization === null ||
                        ((segmentInfoType === "SegmentBase" || segmentInfoType === "BaseURL") && !availableRepresentations[i].segments)
                ) {
                    return false;
                }
            }

            return true;
        },

        updateRepresentations = function(adaptation) {
            var self = this,
                reps,
                manifest = manifestModel.getValue();

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
                delay = (availabilityDelay + (currentRepresentation.segmentDuration * this.liveDelayFragmentCount)) * 1000,
                update = function() {
                    if (this.isUpdating()) return;

                    updating = true;
                    EventBus.trigger(Events.DATA_UPDATE_STARTED, {sender: self});
                    for (var i = 0; i < availableRepresentations.length; i += 1) {
                        self.indexHandler.updateRepresentation(availableRepresentations[i], true);
                    }
                };

            updating = false;
            setTimeout(update.bind(this), delay);
        },

        onRepresentationUpdated = function(e) {
            if (e.sender.getStreamProcessor() !== this.streamProcessor) return;
            if (!this.isUpdating()) return;

            var self = this,
                r = e.representation,
                streamMetrics = metricsModel.getMetricsFor("stream"),
                metrics = metricsModel.getMetricsFor(this.getCurrentRepresentation().adaptation.type),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(streamMetrics),
                repInfo,
                err,
                alreadyAdded = false,
                repSwitch;

            if (e.error && e.error.code === DashHandler.SEGMENTS_UNAVAILABLE_ERROR_CODE) {
                addDVRMetric.call(this);
                postponeUpdate.call(this, e.error.data.availabilityDelay);
                err = new Error(RepresentationController.SEGMENTS_UPDATE_FAILED_ERROR_CODE, "Segments update failed", null);
                EventBus.trigger(Events.DATA_UPDATE_COMPLETED, {sender: self, data: data, currentRepresentation: currentRepresentation, error: err});

                return;
            }

            if (manifestUpdateInfo) {
                for (var i = 0; i < manifestUpdateInfo.trackInfo.length; i += 1) {
                    repInfo = manifestUpdateInfo.trackInfo[i];
                    if (repInfo.index === r.index && repInfo.mediaType === self.streamProcessor.getType()) {
                        alreadyAdded = true;
                        break;
                    }
                }

                if (!alreadyAdded) {
                    metricsModel.addManifestUpdateRepresentationInfo(manifestUpdateInfo, r.id, r.index, r.adaptation.period.index,
                            self.streamProcessor.getType(),r.presentationTimeOffset, r.startNumber, r.segmentInfoType);
                }
            }

            if (isAllRepresentationsUpdated()) {
                updating = false;
                self.abrController.setPlaybackQuality(self.streamProcessor.getType(), self.streamProcessor.getStreamInfo(), getQualityForRepresentation.call(this, currentRepresentation));
                metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {latency: currentRepresentation.segmentAvailabilityRange.end - playbackController.getTime()});

                repSwitch = self.metricsExt.getCurrentRepresentationSwitch(metrics);

                if (!repSwitch) {
                    addRepresentationSwitch.call(self);
                }

                EventBus.trigger(Events.DATA_UPDATE_COMPLETED, {sender: self, data: data, currentRepresentation: currentRepresentation});
            }
        },

        onWallclockTimeUpdated = function(e) {
            if (e.isDynamic){
                updateAvailabilityWindow.call(this, e.isDynamic);
            }
        },

        onLiveEdgeSearchCompleted = function(e) {
            if (e.error) return;

            updateAvailabilityWindow.call(this, true);
            this.indexHandler.updateRepresentation(currentRepresentation, false);

            // we need to update checkTime after we have found the live edge because its initial value
            // does not take into account clientServerTimeShift
            var manifest = manifestModel.getValue(),
                period = currentRepresentation.adaptation.period,
                streamInfo = streamController.getActiveStreamInfo();

            if (streamInfo.isLast) {
                period.mpd.checkTime = this.manifestExt.getCheckTime(manifest, period);
                period.duration = this.manifestExt.getEndTimeForLastPeriod(manifestModel.getValue(), period) - period.start;
                streamInfo.duration = period.duration;
            }
        },

        onBufferLevelUpdated = function(e) {
            if (e.sender.getStreamProcessor() !== this.streamProcessor) return;

            addDVRMetric.call(this);
        },

        onQualityChanged = function(e) {
            var self = this;

            if (e.mediaType !== self.streamProcessor.getType() || self.streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

            if (e.oldQuality !== e.newQuality){
                currentRepresentation = self.getRepresentationForQuality(e.newQuality);
                setLocalStorage.call(self, e.mediaType, currentRepresentation.bandwidth);
                addRepresentationSwitch.call(self);
            }

        },

        setLocalStorage = function(type, bitrate) {
            if (domStorage.isSupported(DOMStorage.STORAGE_TYPE_LOCAL) && (type === "video" || type === "audio")) {
                localStorage.setItem(DOMStorage["LOCAL_STORAGE_"+type.toUpperCase()+"_BITRATE_KEY"], JSON.stringify({bitrate:bitrate/1000, timestamp:new Date().getTime()}));
            }
        };

    return {
        system: undefined,
        log: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        timelineConverter: undefined,
        liveDelayFragmentCount:undefined,

        setup: function() {
            EventBus.on(Events.QUALITY_CHANGED, onQualityChanged, this);
            EventBus.on(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
            EventBus.on(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
            EventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
            EventBus.on(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, this);
        },

        initialize: function(streamProcessor) {
            this.abrController = AbrController.getInstance();
            this.streamProcessor = streamProcessor;
            this.indexHandler = streamProcessor.getIndexHandler();
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
        },

        reset: function() {
            EventBus.off(Events.QUALITY_CHANGED, onQualityChanged, this);
            EventBus.off(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
            EventBus.off(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, this);
            EventBus.off(Events.LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
            playbackController = null;
            streamController = null;
            manifestModel = null;
        }
    };
};

RepresentationController.prototype = {
    constructor: RepresentationController
};

RepresentationController.SEGMENTS_UPDATE_FAILED_ERROR_CODE = 1;

export default RepresentationController;