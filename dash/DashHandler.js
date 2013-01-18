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
Dash.modules.DashHandler = (function () {
    "use strict";

    var Constr;

    Constr = function (data, items, duration, isLive) {
        this.adaptation = data;
        this.items = items;
        this.duration = duration;
        this.isLive = isLive;
        this.ready = true;
        this.onReady = function () { };
        this.currentIndex = -1;
        this.segmentLoader = new Dash.modules.SegmentIndexLoader();
        this.segmentLoader.setInitializationChangedCallback(this.onInitializationChanged.bind(this));
        this.segmentLoader.setSegmentsLoadedCallback(this.onSegmentsLoaded.bind(this));
    };

    Stream.utils.inherit(Constr, Stream.modules.IndexHandler);

    Constr.prototype = {
        constructor: Dash.modules.DashHandler,
        
        getRepresentationForQuality: function (quality) {
            var representation = null;

            if (this.adaptation) {
                representation = this.adaptation.medias[quality];
            }

            return representation;
        },

        getBandwidthForIndex: function (quality) {
            var media = this.getRepresentationForQuality(quality),
                bandwidth = 0;

            if (media) {
                bandwidth = media.bandwidth;
            }

            return bandwidth;
        },

        getMaxQuality: function () {
            return this.adaptation.medias.length;
        },

        doTemplateReplacements: function (url, media, index, time) {
            var newURL = url,
                i;

            if (index !== undefined) {
                i = index;
                if (media.segmentTemplate && media.segmentTemplate.startNumber >= 0) {
                    i += media.segmentTemplate.startNumber;
                }
                newURL = newURL.replace("$Number$", i.toString());
            }

            if (time !== undefined) {
                newURL = newURL.replace("$Time$", time.toString());
            }

            newURL = newURL.replace("$Bandwidth$", media.bandwidth.toString());
            newURL = newURL.replace("$RepresentationID$", media.id.toString());

            return newURL;
        },

        getRequestURL: function (destination, baseURL, media, index, time) {
            var url;

            if (destination === baseURL) {
                url = destination;
            } else if (destination.indexOf("http://") !== -1) {
                url = destination;
            } else {
                url = baseURL + destination;
            }

            return this.doTemplateReplacements(url, media, index, time);
        },

        getSegmentFromTemplate: function (template, index) {
            var i = template.startNumber + index,
                seg = new Dash.vo.Segment();

            seg.timescale = template.timescale;
            seg.duration = template.duration;
            seg.startTime = i * seg.duration;
            seg.media = template.media;

            return seg;
        },

        getIndexForTime: function (time, quality) {
            var media = this.getRepresentationForQuality(quality),
                index = -1000,
                segments = media.segments,
                fragmentDuration,
                ft,
                frag;

            if (media.getSegmentDuration() > 0 && media.getSegmentTimescale() > 0) {
                fragmentDuration = (media.getSegmentDuration() / media.getSegmentTimescale());
                index = Math.floor(time / fragmentDuration);
            } else if (segments) {
                index = 0;
                ft = 0;
                frag = null;

                while (ft <= time && index < segments.length) {
                    index += 1;
                    frag = segments[index];
                    ft += frag.duration / frag.timescale;
                }
                index -= 1;
            }

            return index;
        },

        getInitRequest: function (quality) {
            var debug = Stream.modules.debug,
                media = this.getRepresentationForQuality(quality),
                segmentBase = media.segmentBase,
                init = media.getInitialization(),
                initRange,
                url,
                req;

            // Special case!
            // If this is the first time we're playing the representation, we won't know what the segments are yet.
            // We have to load some of the single mp4 file to get the SIDX box.
            // This box is going to contain the segment information.
            if (segmentBase !== null && media.segments === null) {
                debug.log("Load SIDX box to get segments.");
                this.ready = false;
                url = this.getRequestURL(media.getInitialization(), media.baseURL, media);
                this.segmentLoader.loadSegments(url, segmentBase.indexRange, quality);
                return null;
            }

            if (init !== null) {
                initRange = media.getInitializationRange();

                // Special case..  SegmentBase with no range means no initialization.
                if (media.segmentBase !== null && initRange === null) {
                    return null;
                }

                req = new Stream.vo.SegmentRequest();
                req.url = this.getRequestURL(init, media.baseURL, media);
                req.startTime = 0;
                req.duration = 0;
                if (initRange) {
                    req.startRange = initRange.start;
                    req.endRange = initRange.end;
                }

                debug.log(req);
                return req;
            }

            return null;
        },

        isMediaFinished: function (quality) {
            var media = this.getRepresentationForQuality(quality),
                fragLength,
                isFinished = false;

            if (this.isLive) {
                isFinished = false;
            } else if (media.segments !== null) {
                if (this.currentIndex >= media.segments.length) {
                    isFinished = true;
                }
            } else if (media.segmentTemplate) {
                if (!isNaN(this.duration)) {
                    fragLength = (media.segmentTemplate.duration / media.segmentTemplate.timescale);
                    if (fragLength * this.currentIndex > this.duration) {
                        isFinished = true;
                    }
                }
            }

            return isFinished;
        },

        getSegmentRequestForTime: function (time, quality) {
            var debug = Stream.modules.debug,
                req = new Stream.vo.SegmentRequest(),
                media,
                segment;

            if (!this.ready) {
                req.action = "stall";
                debug.log("Signal stall.");
                return req;
            }

            media = this.getRepresentationForQuality(quality);
            this.currentIndex = this.getIndexForTime(time, quality);

            if (this.isMediaFinished(quality)) {
                req.action = "complete";
                debug.log("Signal complete.");
                return req;
            }

            if (media.segments && media.segments.length > 0) {
                segment = media.segments[this.currentIndex];
            } else if (media.segmentTemplate) {
                segment = this.getSegmentFromTemplate(media.segmentTemplate, this.currentIndex);
            } else {
                throw ("missing segment information");
            }

            req.url = this.getRequestURL(segment.media, media.baseURL, media, this.currentIndex, segment.startTime / segment.timescale);
            if (segment.mediaRange) {
                req.startRange = segment.mediaRange.start;
                req.endRange = segment.mediaRange.end;
            }
            req.startTime = segment.startTime / segment.timescale;
            req.duration = segment.duration / segment.timescale;
            debug.log(req);
            return req;
        },

        getNextSegmentRequest: function (quality) {
            var debug = Stream.modules.debug,
                req = new Stream.vo.SegmentRequest(),
                media,
                segment;

            if (!this.ready) {
                req.action = "stall";
                debug.log("Signal stall.");
                return req;
            }

            if (this.currentIndex < 0) {
                throw "You must call getIndexForTime first.";
            }

            media = this.getRepresentationForQuality(quality);
            this.currentIndex += 1;

            if (this.isMediaFinished(quality)) {
                req.action = "complete";
                debug.log("Signal complete.");
                return req;
            }

            if (media.segments && media.segments.length > 0) {
                segment = media.segments[this.currentIndex];
            } else if (media.segmentTemplate) {
                segment = this.getSegmentFromTemplate(media.segmentTemplate, this.currentIndex);
            }

            if (segment === null) {
                throw ("Segment not found! " + this.currentIndex + " | " + media.segments.length);
            }

            req.url = this.getRequestURL(segment.media, media.baseURL, media, this.currentIndex, segment.startTime);
            req.startTime = segment.startTime / segment.timescale;
            if (segment.mediaRange) {
                req.startRange = segment.mediaRange.start;
                req.endRange = segment.mediaRange.end;
            }
            req.duration = segment.duration / segment.timescale;
            debug.log(req);
            return req;
        },

        onInitializationChanged: function (start, end, q) {
            var media = this.getRepresentationForQuality(q);
            if (media.segmentBase !== null) {
                media.segmentBase.initializationRange = new Dash.vo.IndexRange();
                media.segmentBase.initializationRange.start = start;
                media.segmentBase.initializationRange.end = end;
            }
        },

        onSegmentsLoaded: function (s, q) {
            var debug = Stream.modules.debug,
                media = this.getRepresentationForQuality(q);

            debug.log("Segments done loading from SIDX: " + s.length);

            media.segments = s;
            this.ready = true;
            this.onReady();
        },

        setOnReadyHandler: function (func) {
            this.onReady = func;
        }
    };

    return Constr;
}());