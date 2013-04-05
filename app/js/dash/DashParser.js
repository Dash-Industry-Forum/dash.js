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
Dash.dependencies.DashParser = function () {
    "use strict";

    var SECONDS_IN_YEAR = 365 * 24 * 60 * 60,
        SECONDS_IN_MONTH = 30 * 24 * 60 * 60, // not precise!
        SECONDS_IN_DAY = 24 * 60 * 60,
        SECONDS_IN_HOUR = 60 * 60,
        SECONDS_IN_MIN = 60,
        durationRegex = /P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/,
        datetimeRegex = /^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):(\d\d))?$/,
        numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/,
        matchers = [
            {
                type: "duration",
                test: function (str) {
                    return durationRegex.test(str);
                },
                converter: function (str) {
                    //str = "P10Y10M10DT10H10M10.1S";
                    var match = durationRegex.exec(str);
                    return (parseFloat(match[2] || 0) * SECONDS_IN_YEAR +
                            parseFloat(match[4] || 0) * SECONDS_IN_MONTH +
                            parseFloat(match[6] || 0) * SECONDS_IN_DAY +
                            parseFloat(match[8] || 0) * SECONDS_IN_HOUR +
                            parseFloat(match[10] || 0) * SECONDS_IN_MIN +
                            parseFloat(match[12] || 0));
                }
            },
            {
                type: "datetime",
                test: function (str) {
                    return datetimeRegex.test(str);
                },
                converter: function (str) {
                    return new Date(str);
                }
            },
            {
                type: "numeric",
                test: function (str) {
                    return numericRegex.test(str);
                },
                converter: function (str) {
                    return parseFloat(str);
                }
            }
        ],

        getCommonValuesMap = function () {
            var adaptationSet,
                representation,
                subRepresentation,
                common;

            common = [
                {
                    name: 'profiles',
                    merge: false
                },
                {
                    name: 'width',
                    merge: false
                },
                {
                    name: 'height',
                    merge: false
                },
                {
                    name: 'sar',
                    merge: false
                },
                {
                    name: 'frameRate',
                    merge: false
                },
                {
                    name: 'audioSamplingRate',
                    merge: false
                },
                {
                    name: 'mimeType',
                    merge: false
                },
                {
                    name: 'segmentProfiles',
                    merge: false
                },
                {
                    name: 'codecs',
                    merge: false
                },
                {
                    name: 'maximumSAPPeriod',
                    merge: false
                },
                {
                    name: 'startsWithSap',
                    merge: false
                },
                {
                    name: 'maxPlayoutRate',
                    merge: false
                },
                {
                    name: 'codingDependency',
                    merge: false
                },
                {
                    name: 'scanType',
                    merge: false
                },
                {
                    name: 'FramePacking',
                    merge: true
                },
                {
                    name: 'AudioChannelConfiguration',
                    merge: true
                },
                {
                    name: 'ContentProtection',
                    merge: true
                }
            ];

            adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = null;
            adaptationSet.children = [];
            adaptationSet.properties = common;

            representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = adaptationSet;
            representation.children = [];
            representation.properties = common;
            adaptationSet.children.push(representation);

            subRepresentation = {};
            subRepresentation.name = "SubRepresentation";
            subRepresentation.isRoot = false;
            subRepresentation.isArray = true;
            subRepresentation.parent = representation;
            subRepresentation.children = [];
            subRepresentation.properties = common;
            representation.children.push(subRepresentation);

            return adaptationSet;
        },

        getSegmentValuesMap = function () {
            var period,
                adaptationSet,
                representation,
                common;

            common = [
                {
                    name: 'SegmentBase',
                    merge: true
                },
                {
                    name: 'SegmentTemplate',
                    merge: true
                },
                {
                    name: 'SegmentList',
                    merge: true
                }
            ];

            period = {};
            period.name = "Period";
            period.isRoot = false;
            period.isArray = true;
            period.parent = null;
            period.children = [];
            period.properties = common;

            adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
            period.children.push(adaptationSet);

            representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = adaptationSet;
            representation.children = [];
            representation.properties = common;
            adaptationSet.children.push(representation);

            return period;
        },

        getBaseUrlValuesMap = function () {
            var mpd,
                period,
                adaptationSet,
                representation,
                common;

            common = [
                {
                    name: 'BaseURL',
                    merge: true,
                    mergeFunction: function (parentValue, childValue) {
                        var mergedValue;

                        // child is absolute, don't merge
                        if (childValue.indexOf("http://") === 0) {
                            mergedValue = childValue;
                        } else {
                            mergedValue = parentValue + childValue;
                        }

                        return mergedValue;
                    }
                }
            ];

            mpd = {};
            mpd.name = "mpd";
            mpd.isRoot = true;
            mpd.isArray = true;
            mpd.parent = null;
            mpd.children = [];
            mpd.properties = common;

            period = {};
            period.name = "Period";
            period.isRoot = false;
            period.isArray = true;
            period.parent = null;
            period.children = [];
            period.properties = common;
            mpd.children.push(period);

            adaptationSet = {};
            adaptationSet.name = "AdaptationSet";
            adaptationSet.isRoot = false;
            adaptationSet.isArray = true;
            adaptationSet.parent = period;
            adaptationSet.children = [];
            adaptationSet.properties = common;
            period.children.push(adaptationSet);

            representation = {};
            representation.name = "Representation";
            representation.isRoot = false;
            representation.isArray = true;
            representation.parent = adaptationSet;
            representation.children = [];
            representation.properties = common;
            adaptationSet.children.push(representation);

            return mpd;
        },

        getDashMap = function () {
            var result = [];

            result.push(getCommonValuesMap());
            result.push(getSegmentValuesMap());
            result.push(getBaseUrlValuesMap());

            return result;
        },

        internalParse = function (data, baseUrl) {
            this.debug.log("Doing parse.");

            var manifest,
                converter = new X2JS(matchers, '', true),
                iron = new ObjectIron(getDashMap());

            this.debug.log("Converting from XML.");
            manifest = converter.xml_str2json(data);

            if (!manifest.hasOwnProperty("BaseURL")) {
                this.debug.log("Setting baseURL: " + baseUrl);
                manifest.BaseURL = baseUrl;
            }
            if (manifest.BaseURL.indexOf("http") !== 0) {
                manifest.BaseURL = baseUrl + manifest.BaseURL;
            }

            this.debug.log("Flatten manifest properties.");
            iron.run(manifest);

            this.debug.log("Parsing complete.");
            return Q.when(manifest);
        };

    return {
        debug: undefined,
        parse: internalParse
    };
};

Dash.dependencies.DashParser.prototype = {
    constructor: Dash.dependencies.DashParser
};