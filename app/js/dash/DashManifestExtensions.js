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
 * copyright Digital Primates 2012
 */
Dash.dependencies.DashManifestExtensions = function () {
    "use strict";
};

Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,
    
    getIsAudio: function (adaptation) { // TODO : could come from representation or elsewhere too?
            var i,
                len,
                col = adaptation.ContentComponent_asArray,
                representation,
                result = false,
                found = false;

            if (col) {
                for (i = 0, len = col.length; i < len; i += 1) {
                    if (col[i].contentType === "audio") {
                        result = true;
                        found = true;
                    }
                }
            }

            if (adaptation.hasOwnProperty("mimeType")) {
                result = adaptation.mimeType.indexOf("audio") !== -1;
                found = true;
            }
            
            // couldn't find on adaptationset, so check a representation
            if (!found) {
                i = 0;
                len = adaptation.Representation_asArray.length;
                while (!found && i < len) {
                    representation = adaptation.Representation_asArray[i];
                    
                    if (representation.hasOwnProperty("mimeType")) {
                        result = representation.mimeType.indexOf("audio") !== -1;
                        found = true;
                    }
                    
                    i += 1;
                }
            }

            return Q.when(result);
        },

        getIsVideo: function (adaptation) { // TODO : could come from representation or elsewhere too?
            var i,
                len,
                col = adaptation.ContentComponent_asArray,
                representation,
                result = false,
                found = false;

            if (col) {
                for (i = 0, len = col.length; i < len; i += 1) {
                    if (col[i].contentType === "video") {
                        result = true;
                        found = true;
                    }
                }
            }

            if (adaptation.hasOwnProperty("mimeType")) {
                result = adaptation.mimeType.indexOf("video") !== -1;
                found = true;
            }
            
            // couldn't find on adaptationset, so check a representation
            if (!found) {
                i = 0;
                len = adaptation.Representation_asArray.length;
                while (!found && i < len) {
                    representation = adaptation.Representation_asArray[i];
                    
                    if (representation.hasOwnProperty("mimeType")) {
                        result = representation.mimeType.indexOf("video") !== -1;
                        found = true;
                    }
                    
                    i += 1;
                }
            }

            return Q.when(result);
        },

        getIsMain: function (adaptation) {
            // TODO : Check "Role" node.
            // TODO : Use this somewhere.
            return Q.when(false);
        },
        
        getVideoData: function(manifest) {
            //return Q.when(null);
            //------------------------------------
            var adaptations = manifest.Period_asArray[0].AdaptationSet_asArray,
                i,
                len,
                data,
                deferred = Q.defer(),
                funcs = [];

            for (i = 0, len = adaptations.length; i < len; i += 1) {
                funcs.push(this.getIsVideo(adaptations[i]));
            }
            
            Q.all(funcs).then(
                function (results) {
                    var found = false;
                    for (i = 0, len = results.length; i < len; i += 1) {
                        if (results[i] === true) {
                            found = true;
                            deferred.resolve(adaptations[i]);
                        }
                    }
                    if (!found) {
                        deferred.resolve(null);
                    }
                }
            );
            
            return deferred.promise;
        },
        
        getAudioDatas: function(manifest) {
            //return Q.when(null);
            //------------------------------------
            var adaptations = manifest.Period_asArray[0].AdaptationSet_asArray,
                i,
                len,
                data,
                deferred = Q.defer(),
                funcs = [];

            for (i = 0, len = adaptations.length; i < len; i += 1) {
                funcs.push(this.getIsAudio(adaptations[i]));
            }
            
            Q.all(funcs).then(
                function (results) {
                    var datas = [];
                    for (i = 0, len = results.length; i < len; i += 1) {
                        if (results[i] === true) {
                            datas.push(adaptations[i]);
                        }
                    }
                    deferred.resolve(datas);
                }
            );
            
            return deferred.promise;
        },
        
        getPrimaryAudioData: function(manifest) {
            var adaptations = manifest.Period_asArray[0].AdaptationSet_asArray,
                i,
                len,
                data,
                deferred = Q.defer(),
                funcs = [],
                self = this;
            
            this.getAudioDatas(manifest).then(
                function (datas) {
                    if (!datas || datas.length === 0) {
                        deferred.resolve(null);
                    }
                    
                    for (i = 0, len = datas.length; i < len; i += 1) {
                        funcs.push(self.getIsMain(datas[i]));
                    }
                    
                    Q.all(funcs).then(
                        function (results) {
                            var found = false;
                            for (i = 0, len = results.length; i < len; i += 1) {
                                if (results[i] === true) {
                                    found = true;
                                    deferred.resolve(datas[i]);
                                }
                            }
                            if (!found) {
                                deferred.resolve(datas[0]);
                            }
                        }
                    );
                }
            );
            
            return deferred.promise;
        },
        
        getCodec: function(data) {
            var representation = data.Representation_asArray[0],
                codec = (representation.mimeType + ';codecs="' + representation.codecs + '"');
            return Q.when(codec);
        },
        
        getIsLive: function (manifest) {
            return Q.when(manifest.type === "dynamic");
        },

        getIsDVR: function (manifest) {
            var deferred = Q.defer();
            
            this.getIsLive(manifest).then(
                function (isLive) {
                    var containsDVR = !isNaN(manifest.timeShiftBufferDepth);
                    deferred.resolve(isLive && containsDVR);
                }
            );
            
            return deferred.promise;
        },

        getIsOnDemand: function (manifest) {
            var isOnDemand = false;
            
            if (manifest.profiles && manifest.profiles.length > 0) {
                isOnDemand = (manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:201") !== -1);
            }
            
            return Q.when(isOnDemand);
        },
        
        getDuration: function (manifest) {
            var deferred = Q.defer(),
                dur = NaN;
            
            this.getIsLive(manifest).then(
                function (isLive) {
                    if (isLive) {
                        deferred.resolve(Number.POSITIVE_INFINITY);
                    } else {
                        if (manifest.mediaPresentationDuration) {
                            dur = manifest.mediaPresentationDuration;
                        } else if (manifest.availabilityEndTime && manifest.availabilityStartTime) {
                            dur = (manifest.availabilityEndTime.getTime() - manifest.availabilityStartTime.getTime());
                        }
                        deferred.resolve(dur);
                    }
                }
            );
            
            return deferred.promise;
        }
};