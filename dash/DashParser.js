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
Dash.modules.DashParser = (function () {
    "use strict";

    var Constr;

    Constr = function () {
        this.manifest = null;
    };

    Stream.utils.inherit(Constr, Stream.modules.Parser);

    Constr.prototype = {
        constructor: Dash.modules.DashParser,

        // From YouTube player.  Reformatted for JSLint.
        parseTime: function (str) {
            if (str === null) {
                return NaN;
            }

            var re = /PT(([0-9]*)H)?(([0-9]*)M)?(([0-9.]*)S)?/,
                match = re.exec(str);

            if (!match) {
                return parseFloat(str);
            }

            return (parseFloat(match[2] || 0) * 3600 +
                    parseFloat(match[4] || 0) * 60 +
                    parseFloat(match[6] || 0));
        },

        parseRangeValues: function (value) {
            var range = null;

            if (value !== null && value.length > 0 && value.indexOf("-") > 0) {
                range = new Dash.vo.IndexRange();
                range.start = parseFloat(value.split("-")[0]);
                range.end = parseFloat(value.split("-")[1]);
            }

            return range;
        },

        trimURL: function (url) {
            var paramIdx = url.indexOf("?");

            if (paramIdx !== -1) {
                return url.substring(0, paramIdx);
            }

            return url;
        },

        parseSegmentTemplate: function (xml, base) {
            if (!xml) {
                return null;
            }

            var item = new Dash.vo.SegmentTemplate(base),
                node,
                frag,
                segments,
                fragments,
                i,
                len;

            item.duration = parseFloat(xml.getAttribute("duration"));
            item.startNumber = parseFloat(xml.getAttribute("startNumber") || 0);
            item.media = xml.getAttribute("media");
            item.index = xml.getAttribute("index");
            item.bitstreamSwitching = xml.getAttribute("bitstreamSwitching");
            item.timescale = parseFloat(xml.getAttribute("timescale")) || item.timescale;
            item.initialization = xml.getAttribute("initialization") || item.initialization;

            node = xml.querySelector("SegmentTimeline");
            if (node) {
                segments = [];
                fragments = node.getElementsByTagName("S");
                for (i = 0, len = fragments.length; i < len; i += 1) {
                    frag = new Dash.vo.TimelineFragment();
                    frag.repeat = parseFloat(fragments[i].getAttribute("r"));
                    frag.duration = parseFloat(fragments[i].getAttribute("d"));
                    frag.time = parseFloat(fragments[i].getAttribute("t"));
                    segments.push(frag);
                }
                item.segments = segments;
            }

            return item;
        },

        parseSegmentURL: function (xml) {
            var segment = new Dash.vo.Segment();
            segment.media = xml.getAttribute("media");
            segment.mediaRange = this.parseRangeValues(xml.getAttribute("mediaRange"));
            segment.index = xml.getAttribute("index");
            segment.indexRange = this.parseRangeValues(xml.getAttribute("indexRange"));
            return segment;
        },

        parseSegmentList: function (xml, base) {
            if (!xml) {
                return null;
            }

            var list = new Dash.vo.SegmentList(base),
                node,
                items,
                set,
                i,
                len;

            list.duration = parseFloat(xml.getAttribute("duration"));
            list.startNumber = parseFloat(xml.getAttribute("startNumber"));
            list.timescale = parseFloat(xml.getAttribute("timescale")) || list.timescale;

            node = xml.querySelector("Initialization[sourceURL]");
            if (node) {
                list.initialization = node.getAttribute("sourceURL");
            }

            items = xml.getElementsByTagName("SegmentURL");
            if (items.length > 0) {
                set = [];
                for (i = 0, len = items.length; i < len; i += 1) {
                    set.push(this.parseSegmentURL(items[i]));
                }
                list.segments = set;
            }
            return list;
        },

        parseSegmentBase: function (xml, base) {
            if (!xml) {
                return null;
            }

            var sb = new Dash.vo.SegmentBase(base),
                node;

            sb.timescale = parseFloat(xml.getAttribute("timescale")) || sb.timescale;
            sb.presentationTimeOffset = parseFloat(xml.getAttribute("presentationTimeOffset"));
            sb.indexRange = this.parseRangeValues(xml.getAttribute("indexRange"));
            sb.indexRangeExact = xml.getAttribute("indexRangeExact") === "true";

            node = xml.querySelector("Initialization");
            if (node) {
                sb.initializationRange = this.parseRangeValues(node.getAttribute("range"));
            }

            return sb;
        },

        buildSegmentBaseFromURL: function (url, baseURL) {
            var sb = new Dash.vo.SegmentBase();

            if ((url.indexOf("http://") !== 0) && (baseURL !== null && baseURL !== "")) {
                sb.initialization = baseURL + url;
            } else {
                sb.initialization = url;
            }

            return sb;
        },

        segmentsFromTemplate: function (template) {
            var segments = null,
                frag,
                url,
                time = 0,
                i,
                j,
                len,
                count,
                segment,
                repeat;

            if (template.segments) {
                count = 0;
                segments = [];

                for (i = 0, len = template.segments.length; i < len; i += 1) {
                    segment = template.segments[i];
                    repeat = parseFloat(segment.repeat) || 1;

                    for (j = 0; j < repeat; j += 1) {
                        frag = new Dash.vo.Segment();
                        frag.timescale = template.timescale;
                        if (!isNaN(segment.time)) {
                            frag.startTime = segment.time;
                            time = segment.time;
                        } else {
                            frag.startTime = time;
                        }

                        frag.duration = segment.duration;

                        url = template.media;
                        url = url.split("$Number$").join((template.startNumber + count).toString());
                        url = url.split("$Time$").join(frag.startTime.toString());
                        frag.media = url;
                        time += segment.duration;
                        count += 1;
                        segments.push(frag);
                    }
                }
            }

            return segments;
        },

        segmentsFromList: function (list) {
            var segments = [],
                i,
                len,
                frag,
                s;

            for (i = 0, len = list.segments.length; i < len; i += 1) {
                frag = new Dash.vo.Segment();
                s = list.segments[i];
                frag.media = s.media;
                frag.mediaRange = s.mediaRange;
                frag.indexRange = s.indexRange;
                frag.timescale = list.timescale;
                frag.duration = list.duration;
                frag.startTime = i * list.duration;
                segments.push(frag);
            }
            return segments;
        },

        parseCommonAttributes: function (item, xml, parent) {
            var propertyList = ["profiles", "width", "height", "sar", "frameRate", "audioSamplingRate", "mimeType", "segmentProfiles", "codecs", "maximumSAPPeriod", "startWithSAP", "maxPlayoutRate", "codingDependency", "scanType"],
                prop,
                val,
                i,
                len;

            if (parent) {
                for (i = 0, len = propertyList.length; i < len; i += 1) {
                    prop = propertyList[i];
                    item[prop] = parent[prop];
                }
            }

            for (i = 0, len = propertyList.length; i < len; i += 1) {
                prop = propertyList[i];
                val = xml.getAttribute(prop);
                if (val !== null) {
                    item[prop] = val;
                }
            }

            val = xml.getAttribute("codecs");

            if (val !== null) {
                item.codecs = val.split(",");
            }
        },

        parseRepresentations: function (items, parent) {
            var sets = [],
                item,
                xml,
                i,
                len,
                node,
                hasBase,
                hasList,
                hasTemplate,
                numInfos;

            for (i = 0, len = items.length; i < len; i += 1) {
                xml = items[i];
                item = new Dash.vo.Representation();
                this.parseCommonAttributes(item, xml, parent);
                node = xml.querySelector(xml.nodeName + " > BaseURL");
                item.baseURL = node !== null ? node.textContent || node.innerText : this.manifest.baseURL;
                item.baseURL = this.trimURL(item.baseURL);
                item.id = xml.getAttribute("id");
                item.bandwidth = parseFloat(xml.getAttribute("bandwidth"));
                item.qualityRanking = parseFloat(xml.getAttribute("qualityRanking"));
                item.dependencyId = xml.getAttribute("dependencyId");
                item.mediaStreamStructureId = xml.getAttribute("mediaStreamStructureId");

                node = xml.querySelector(xml.nodeName + " > SegmentBase");

                if (node) {
                    item.segmentBase = this.parseSegmentBase(node, parent.segmentBase);
                } else {
                    item.segmentBase = parent.segmentBase;
                }

                node = xml.querySelector(xml.nodeName + " > SegmentList");
                if (node) {
                    item.segmentList = this.parseSegmentList(node, parent.segmentList);
                } else {
                    item.segmentList = parent.segmentList;
                }

                node = xml.querySelector(xml.nodeName + " > SegmentTemplate");
                if (node) {
                    item.segmentTemplate = this.parseSegmentTemplate(node, parent.segmentTemplate);
                } else {
                    item.segmentTemplate = parent.segmentTemplate;
                }

                hasBase = item.segmentBase !== null ? 1 : 0;
                hasList = item.segmentList !== null ? 1 : 0;
                hasTemplate = item.segmentTemplate !== null ? 1 : 0;

                numInfos = hasBase + hasList + hasTemplate;
                // Special Case!
                // This means we have a 'SegmentBase' scenario, but without the extra information.
                // Fake a SegmentBase object since this use-case and the SegmentBase are handled in the same way.
                if (numInfos === 0) {
                    item.segmentBase = this.buildSegmentBaseFromURL(item.baseURL, this.manifest.baseURL);
                } else if (numInfos > 1) {
                    throw "Must specify at most SegmentBase, SegmentList, or SegmentTemplate.";
                }

                if (hasBase === 1) {
                    item.segments = null;
                    item.segmentBase.initialization = item.baseURL;
                    item.baseURL = this.manifest.baseURL;
                } else if (hasList === 1) {
                    item.segments = this.segmentsFromList(item.segmentList);
                } else if (hasTemplate === 1) {
                    item.segments = this.segmentsFromTemplate(item.segmentTemplate);
                }

                sets.push(item);
            }

            sets.sort(
                function (a, b) {
                    var value;

                    if (a.bandwidth > b.bandwidth) {
                        value = 1;
                    } else if (a.bandwidth < b.bandwidth) {
                        value = -1;
                    } else {
                        value = 0;
                    }

                    return value;
                }
            );

            return sets;
        },

        parseAdaptationSets: function (items, parent) {
            var sets = [],
                item,
                xml,
                i,
                j,
                x,
                cc,
                len,
                max,
                node,
                nodes;

            for (i = 0, len = items.length; i < len; i += 1) {
                xml = items[i];
                item = new Dash.vo.AdaptationSet();
                node = xml.querySelector(xml.nodeName + " > BaseURL");
                item.baseURL = node !== null ? node.textContent || node.innerText : this.manifest.baseURL;
                item.baseURL = this.trimURL(item.baseURL);

                this.parseCommonAttributes(item, xml);

                nodes = xml.getElementsByTagName("ContentComponent");
                if (nodes.length > 0) {
                    item.contentComponents = [];
                    for (j = 0, max = nodes.length; j < max; j += 1) {
                        x = nodes[j];
                        cc = new Dash.vo.ContentComponent();
                        cc.id = x.getAttribute("id");
                        cc.contentType = x.getAttribute("contentType");
                        cc.lang = x.getAttribute("lang");
                        item.contentComponents.push(cc);
                    }
                }

                node = xml.querySelector(xml.nodeName + " > SegmentBase");
                if (node) {
                    item.segmentBase = this.parseSegmentBase(node, parent.segmentBase);
                } else {
                    item.segmentBase = parent.segmentBase;
                }

                node = xml.querySelector(xml.nodeName + " > SegmentList");
                if (node) {
                    item.segmentList = this.parseSegmentList(node, parent.segmentList);
                } else {
                    item.segmentList = parent.segmentList;
                }

                node = xml.querySelector(xml.nodeName + " > SegmentTemplate");
                if (node) {
                    item.segmentTemplate = this.parseSegmentTemplate(node, parent.segmentTemplate);
                } else {
                    item.segmentTemplate = parent.segmentTemplate;
                }

                item.medias = this.parseRepresentations(xml.getElementsByTagName("Representation"), item);
                sets.push(item);
            }

            return sets;
        },

        parsePeriods: function (items) {
            var periods = [],
                item,
                xml,
                i,
                len,
                node;

            for (i = 0, len = items.length; i < len; i += 1) {
                xml = items[i];
                item = new Dash.vo.Period();
                item.id = xml.getAttribute("id");
                item.start = this.parseTime(xml.getAttribute("start"));
                item.duration = this.parseTime(xml.getAttribute("duration"));

                node = xml.querySelector(xml.nodeName + " > BaseURL");
                item.baseURL = node !== null ? node.textContent || node.innerText : this.manifest.baseURL;
                item.baseURL = this.trimURL(item.baseURL);

                node = xml.querySelector(xml.nodeName + " > SegmentBase");
                if (node) {
                    item.segmentBase = this.parseSegmentBase(node);
                }

                node = xml.querySelector(xml.nodeName + " > SegmentList");
                if (node) {
                    item.segmentList = this.parseSegmentList(node);
                }

                node = xml.querySelector(xml.nodeName + " > SegmentTemplate");
                if (node) {
                    item.segmentTemplate = this.parseSegmentTemplate(node);
                }

                item.adaptations = this.parseAdaptationSets(xml.getElementsByTagName("AdaptationSet"), item);
                periods.push(item);
            }

            return periods;
        },

        parseTopManifest: function (xml, baseURL) {
            var man = new Dash.vo.DashManifest(),
                timeAttrs,
                attr,
                i,
                p,
                len,
                node,
                absoluteBase;

            man.id = xml.getAttribute("id");
            man.type = xml.getAttribute("type");
            man.availabilityStartTime = new Date(xml.getAttribute("availabilityStartTime"));
            man.availabilityEndTime = new Date(xml.getAttribute("availabilityEndTime"));
            timeAttrs = ["mediaPresentationDuration", "minBufferTime", "minimumUpdatePeriod", "timeShiftBufferDepth", "suggestedPresentationDelay", "maxSegmentDuration", "maxSubsegmentDuration"];

            for (i = 0, len = timeAttrs.length; i < len; i += 1) {
                attr = timeAttrs[i];
                man[attr] = this.parseTime(xml.getAttribute(attr));
            }

            p = xml.getAttribute("profiles");
            if (p !== null) {
                man.profiles = p.split(" ").join("").split(",");
            }

            node = xml.querySelector(xml.nodeName + " > BaseURL");
            man.baseURL = node !== null ? node.textContent || node.innerText : baseURL;
            man.baseURL = this.trimURL(man.baseURL);

            absoluteBase = man.baseURL.indexOf("http") === 0;
            if (!absoluteBase) {
                man.baseURL = baseURL + man.baseURL;
            }
            man.baseURL = this.trimURL(man.baseURL);

            return man;
        },

        parse: function (value, baseURL) {
            var xml,
                items;

            if (value === null || value.length === 0) {
                alert("Error parsing manifest.");
                throw "No XML to parse!";
            }

            xml = new DOMParser().parseFromString(value, "text/xml");
            if (xml === null) {
                alert("Error parsing manifest.");
                throw "Could now get XML from string.";
            }

            this.manifest = this.parseTopManifest(xml.documentElement, baseURL);

            items = xml.querySelectorAll("Period");
            this.manifest.periods = this.parsePeriods(items);

            return this.manifest;
        }
    };

    return Constr;
}());