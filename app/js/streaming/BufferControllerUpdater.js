/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.dependencies.BufferControllerUpdater = function () {
    "use strict";

    var manifest,
        MANIFEST_CONST = 'manifest',
        MANIFEST_UPDATED_CONST = 'manifestUpdated',
        buffers = [],

        updateBufferControllers = function () {
            var self = this,
                buffer,
                bufferIndex,
                bufferUpdateFuncs = [];

            for (bufferIndex = 0; bufferIndex < buffers.length; bufferIndex += 1) {
                buffer = buffers[bufferIndex];
                bufferUpdateFuncs.push(updateBufferController.call(self, buffer.bufferController, buffer.type));
            }

            if(bufferUpdateFuncs.length > 0) {
            	Q.all(bufferUpdateFuncs);
            }
        },
        updateBufferController = function (bufferController, type) {
            var self = this,
                minBufferTime,
                deferred = Q.defer();

            self.manifestExt.getIsLive(manifest).then(
                function (isLive) {
                    self.debug.log("Gathering information for buffers. (1)");
                    return self.manifestExt.getDuration(manifest);
                }
            ).then(
                function (duration) {
                    self.debug.log("Gathering information for buffers. (2)");
                    return self.bufferExt.decideBufferLength(manifest.minBufferTime);
                }
            ).then(
                function (time) {
                    self.debug.log("Gathering information for buffers. (3)");
                    self.debug.log("Buffer time: " + time);
                    minBufferTime = time;
                    //return self.manifestExt.getVideoData(manifest);
                    return obtainBufferDataForType.call(self, type);
                }
            ).then(
                function (bufferData) {
                	appendDataToBuffer.call(self, bufferController, bufferData);
                },
                function (error) {
                	self.debug.log("Recieved Error: " + error)
                }
            );

            return deferred.promise;
        },
        appendDataToBuffer = function (bufferController, bufferData) {
        	var existingData = bufferController.getData(),
                existingSegmentTemplate,
                existingSegmentTimeline,
                existingS,
                segmentTemplate,
                segmentTimeline,
                s,
                existingSIndex = 0,
                sIndex,
                existingItem,
                firstItem;
        	
        	if (existingData.hasOwnProperty('SegmentTemplate')) {
        		existingSegmentTemplate = existingData.SegmentTemplate;
        		if (existingSegmentTemplate.hasOwnProperty('SegmentTimeline')) {
        			existingSegmentTimeline = existingSegmentTemplate.SegmentTimeline;
        			if (existingSegmentTimeline.hasOwnProperty('S')) {
        				existingS = existingSegmentTimeline.S;
        			}
        		}
        	}
        	
        	if (bufferData.hasOwnProperty('SegmentTemplate')) {
        		segmentTemplate = bufferData.SegmentTemplate;
        		if (segmentTemplate.hasOwnProperty('SegmentTimeline')) {
        			segmentTimeline = segmentTemplate.SegmentTimeline;
        			if (segmentTimeline.hasOwnProperty('S')) {
        				s = segmentTimeline.S;
        			}
        		}
        	}
        	
        	var oldT = 0;
        	var newT = 0;
        	if (s != null && existingS != null) {
        		firstItem = s[0];
        		newT = firstItem.t;
        		
        		while (existingSIndex < existingS.length && s.length > 0 ) {
        			existingItem = existingS[existingSIndex];
        			if(oldT === 0) { oldT = existingItem.t }
        			if(oldT === newT) {
        				newT += firstItem.d;
        				s.shift();
        				firstItem = s[0];
        			}
        			oldT += existingItem.d;
    				existingSIndex += 1;
        		}
        		
    			while (s.length > 0) {
    				existingS.push(s.shift());
    			}
        	}
        },
        obtainBufferDataForType = function (type) {
            var self = this,
                errorMsg,
                deferred;

            if (type === 'video') {
            	deferred = self.manifestExt.getVideoData(manifest);
            } else if (type === 'audio') {
            	deferred = self.manifestExt.getAudioData(manifest);
            } else {
            	errorMsg = ("Unknown buffer type: " + type);
            	self.debug.log(errorMsg);
            	deferred = Q.reject(errorMsg);
            }

            return deferred;
        },
        addBufferController = function (bufferController, type) {
            var buffer = {};

            buffer.bufferController = bufferController;
            buffer.type = type;

            buffers.push(buffer);
        },
        removeBufferController = function (bufferController) {
            var buffer,
                bufferIndex;

            for (bufferIndex = 0; bufferIndex < buffers.length; bufferIndex += 1) {
            	buffer = buffers[bufferIndex];
            	if (bufferController === buffer.bufferController) {
            		buffers.splice(bufferIndex, 1);
            		return;
            	}
            }
        },
        handleManifestUpdated = function () {
            var self = this;

            manifest = self.system.getObject(MANIFEST_CONST);
            updateBufferControllers.call(self);
        };

    return {
        debug : undefined,
        system : undefined,
        manifestExt : undefined,
        bufferExt : undefined,
        setup : function () {
            var self = this;
            self.system.mapHandler(MANIFEST_UPDATED_CONST, MANIFEST_CONST, handleManifestUpdated.bind(self));
        },
        addBufferController : addBufferController,
        removeBufferController : removeBufferController
    };
};

MediaPlayer.dependencies.BufferControllerUpdater.prototype = {
    constructor: MediaPlayer.dependencies.BufferControllerUpdater
};