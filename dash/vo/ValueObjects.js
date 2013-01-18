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
 */
Dash.vo.AdaptationSet = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.codingDependency = false;
        this.maxPlayoutRate = 1;
        this.subsegmentStartsWithSAP = 0;
        this.subsegmentAlignment = false;
        this.bitstreamSwitching = false;
        this.segmentAlignment = false;
        this.height = NaN;
        this.width = NaN;
        this.scanType = null;
        this.startWithSAP = NaN;
        this.maximumSAPPeriod = NaN;
        this.codecs = null;
        this.segmentProfiles = null;
        this.mimeType = null;
        this.audioSamplingRate = NaN;
        this.frameRate = NaN;
        this.sar = null;
        this.profiles = null;
        this.medias = null;
        this.segmentTemplate = null;
        this.segmentList = null;
        this.segmentBase = null;
        this.contentComponents = null;
        this.baseURL = null;
        this.maxFrameRate = NaN;
        this.minFrameRate = NaN;
        this.maxHeight = NaN;
        this.minHeight = NaN;
        this.maxWidth = NaN;
        this.minWidth = NaN;
        this.maxBandwidth = NaN;
        this.minBandwidth = NaN;
        this.par = null;
        this.contentType = null;
        this.lang = null;
        this.group = null;
        this.id = null;
    };

    Constr.prototype = {
        constructor: Stream.vo.SegmentRequest,

        getIsAudio: function () {
            var i,
                len;

            if (this.contentComponents) {
                for (i = 0, len = this.contentComponents.length; i < len; i += 1) {
                    if (this.contentComponents[i].contentType === "audio") {
                        return true;
                    }
                }
            }

            if (this.mimeType !== null && this.mimeType.length > 0) {
                return this.mimeType.indexOf("audio") !== -1;
            }

            return false;
        },

        getIsVideo: function () {
            var i,
                len;

            if (this.contentComponents) {
                for (i = 0, len = this.contentComponents.length; i < len; i += 1) {
                    if (this.contentComponents[i].contentType === "video") {
                        return true;
                    }
                }
            }

            if (this.mimeType !== null && this.mimeType.length > 0) {
                return this.mimeType.indexOf("video") !== -1;
            }

            return false;
        },

        getIsMain: function () {
            // TODO : Check "Role" node.
            // TODO : Use this somewhere.
            return false;
        },

        getCodec: function () {
            var representation = this.medias[0];
            return representation.mimeType + '; codecs="' + representation.codecs.join(",") + '"';
        }
    };

    return Constr;
}());

Dash.vo.ContentComponent = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.lang = null;
        this.id = null;
        this.contentType = null;
    };

    Constr.prototype = {
        constructor: Stream.vo.SegmentRequest
    };

    return Constr;
}());

Dash.vo.DashManifest = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.suggestedPresentationDelay = 10;
        this.minBufferTime = 4;
        this.periods = null;
        this.baseURL = null;
        this.maxSubsegmentDuration = NaN;
        this.maxSegmentDuration = NaN;
        this.timeShiftBufferDepth = NaN;
        this.minimumUpdatePeriod = NaN;
        this.mediaPresentationDuration = NaN;
        this.availabilityEndTime = null;
        this.availabilityStartTime = null;
        this.type = null;
        this.profiles = null;
        this.id = null;
        this.source = null;
    };

    Stream.utils.inherit(Constr, Stream.modules.Manifest);

    Constr.prototype = {
        constructor: Dash.vo.DashManifest,

        getAdaptationSet: function (contentType) {
            var adaptations = this.periods[0].adaptations,
                i,
                len;

            for (i = 0, len = adaptations.length; i < len; i += 1) {
                if (contentType === "video" && adaptations[i].getIsVideo()) {
                    return adaptations[i];
                }

                if (contentType === "audio" && adaptations[i].getIsAudio()) {
                    return adaptations[i];
                }
            }

            return null;
        },

        getStreamItems: function (data) {
            var medias = data.medias,
                items = [],
                i,
                len,
                representation,
                itm;

            for (i = 0, len = medias.length; i < len; i += 1) {
                representation = medias[i];
                itm = new Stream.vo.StreamItem();
                itm.id = representation.id;
                itm.bandwidth = representation.bandwidth;
                items.push(itm);
            }

            return items;
        },

        getVideoData: function () {
            var adaptations = this.periods[0].adaptations,
                i,
                len;

            for (i = 0, len = adaptations.length; i < len; i += 1) {
                if (adaptations[i].getIsVideo()) {
                    return adaptations[i];
                }
            }
        },

        getPrimaryAudioData: function () {
            var audios = this.getAudioDatas(),
                i,
                len;

            for (i = 0, len = audios.length; i < len; i += 1) {
                if (audios[i].getIsMain()) {
                    return audios[i];
                }
            }

            // if nothing is marked as main just use the first one
            return audios[0];
        },

        getAudioDatas: function () {
            var adaptations = this.periods[0].adaptations,
                audios = [],
                i,
                len;

            for (i = 0, len = adaptations.length; i < len; i += 1) {
                if (adaptations[i].getIsAudio()) {
                    audios.push(adaptations[i]);
                }
            }
            return audios;
        },

        hasVideoStream: function () {
            return (this.getVideoData() !== null);
        },

        hasAudioStream: function () {
            return (this.getAudioDatas().length > 0);
        },

        getDuration: function () {
            var dur = NaN;

            if (this.mediaPresentationDuration) {
                dur = this.mediaPresentationDuration;
            } else if (this.availabilityEndTime && this.availabilityStartTime) {
                dur = (this.availabilityEndTime.getTime() - this.availabilityStartTime.getTime());
            }

            return dur;
        },

        getIsLive: function () {
            return (this.type === "dynamic");
        },

        getIsDVR: function () {
            var containsDVR = !isNaN(this.timeShiftBufferDepth);
            return this.getIsLive() && containsDVR;
        },

        getIsOnDemand: function () {
            if (this.profiles && this.profiles.length > 0) {
                return this.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:201") !== -1;
            }

            return false;
        }
    };

    return Constr;
}());

Dash.vo.IndexRange = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.end = NaN;
        this.start = NaN;
    };

    Constr.prototype = {
        constructor: Dash.vo.IndexRange
    };

    return Constr;
}());

Dash.vo.SegmentBase = (function () {
    "use strict";

    var Constr;

    Constr = function (base) {
        this.indexRangeExact = false;
        this.timescale = 1;
        this.initialization = null;
        this.initializationRange = null;
        this.indexRange = null;
        this.presentationTimeOffset = NaN;

        if (base) {
            this.timescale = base.timescale;
            this.presentationTimeOffset = base.presentationTimeOffset;
            this.indexRange = base.indexRange;
            this.indexRangeExact = base.indexRangeExact;
            this.initializationRange = base.initializationRange;
            this.initialization = base.initialization;
        }
    };

    Constr.prototype = {
        constructor: Dash.vo.SegmentBase
    };

    return Constr;
}());

Dash.vo.MultipleSegmentBase = (function () {
    "use strict";
    var Constr;
    Constr = function (base) {
        this.startNumber = 0;
        this.duration = 0;

        if (base) {
            this.duration = base.duration;
            this.startNumber = base.startNumber;
        }

        Dash.vo.SegmentBase.call(this, base);
    };

    Stream.utils.inherit(Constr, Dash.vo.SegmentBase);

    Constr.prototype = {
        constructor: Dash.vo.MultipleSegmentBase
    };

    return Constr;
}());

Dash.vo.Period = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.adaptations = null;
        this.segmentTemplate = null;
        this.segmentList = null;
        this.segmentBase = null;
        this.baseURL = null;
        this.duration = NaN;
        this.start = NaN;
        this.id = null;
    };
    
    Constr.prototype = {
        constructor: Dash.vo.Period
    };
    
    return Constr;
}());

Dash.vo.Representation = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.codingDependency = false;
        this.maxPlayoutRate = 1;
        this.scanType = null;
        this.startWithSAP = NaN;
        this.maximumSAPPeriod = NaN;
        this.codecs = null;
        this.segmentProfiles = null;
        this.mimeType = null;
        this.audioSamplingRate = NaN;
        this.frameRate = NaN;
        this.sar = null;
        this.height = NaN;
        this.width = NaN;
        this.profiles = null;
        this.segments = null;
        this.segmentTemplate = null;
        this.segmentList = null;
        this.segmentBase = null;
        this.mediaStreamStructureId = null;
        this.dependencyId = null;
        this.qualityRanking = NaN;
        this.bandwidth = NaN;
        this.id = null;
        this.baseURL = null;
    };

    Constr.prototype = {
        constructor: Dash.vo.SegmentRequest,
        
        getInitializationRange: function () {
            if (this.segmentBase) {
                return this.segmentBase.initializationRange;
            }
            return null;
        },

        getInitialization: function () {
            var init = null;

            if (this.segmentBase) {
                init = this.segmentBase.initialization;
            } else if (this.segmentList) {
                init = this.segmentList.initialization;
            } else if (this.segmentTemplate) {
                init = this.segmentTemplate.initialization;
            }

            return init;
        },

        getSegmentDuration: function () {
            var dur = 0;

            if (this.segmentList) {
                dur = this.segmentList.duration;
            } else if (this.segmentTemplate) {
                dur = this.segmentTemplate.duration;
            }

            return dur;
        },

        getSegmentTimescale: function () {
            var ts = 0;

            if (this.segmentList) {
                ts = this.segmentList.timescale;
            } else if (this.segmentTemplate) {
                ts = this.segmentTemplate.timescale;
            }

            return ts;
        }
    };

    return Constr;
}());

Dash.vo.Segment = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.indexRange = null;
        this.mediaRange = null;
        this.media = null;
        this.duration = NaN;
        this.startTime = NaN;
        this.timescale = NaN;
    };

    Constr.prototype = {
        constructor: Dash.vo.Segment
    };

    return Constr;
}());

Dash.vo.SegmentList = (function () {
    "use strict";

    var Constr;

    Constr = function (base) {
        this.segments = null;

        if (base) {
            this.segments = base.segments;
        }

        Dash.vo.MultipleSegmentBase.call(this, base);
    };

    Stream.utils.inherit(Constr, Dash.vo.MultipleSegmentBase);

    Constr.prototype = {
        constructor: Dash.vo.SegmentList
    };

    return Constr;
}());

Dash.vo.SegmentTemplate = (function () {
    "use strict";

    var Constr;

    Constr = function (base) {
        this.segments = null;
        this.bitstreamSwitching = null;
        this.index = null;
        this.media = null;

        if (base) {
            this.media = base.media;
            this.index = base.index;
            this.bitstreamSwitching = base.bitstreamSwitching;
            this.segments = base.segments;
        }

        Dash.vo.MultipleSegmentBase.call(this, base);
    };

    Stream.utils.inherit(Constr, Dash.vo.MultipleSegmentBase);

    Constr.prototype = {
        constructor: Dash.vo.SegmentTemplate
    };

    return Constr;
}());

Dash.vo.SegmentURL = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.indexRange = null;
        this.index = null;
        this.mediaRange = null;
        this.media = null;
    };

    Constr.prototype = {
        constructor: Dash.vo.SegmentURL
    };

    return Constr;
}());

Dash.vo.TimelineFragment = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.repeat = 1;
        this.duration = 0;
        this.time = -1;
    };

    Constr.prototype = {
        constructor: Dash.vo.TimelineFragment
    };

    return Constr;
}());