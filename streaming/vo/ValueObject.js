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

window["streaming"] = window["streaming"] || {};
streaming.vo = {};

//util
streaming.$extend = function (from, fields) {
    function Inherit() { }
    Inherit.prototype = from;
    var proto = new Inherit();
    for (var name in fields)
        proto[name] = fields[name];
    return proto;
};

/**
 * @constructor
 */
streaming.vo.SegmentRequest = function () {
    /** @type {string}*/
    this.action = "download";
    /** @type {number}*/
    this.startTime = NaN;
    /** @type {number}*/
    this.duration = NaN;
    /** @type {number}*/
    this.endRange = null;
    /** @type {number}*/
    this.startRange = null;
    /** @type {string|null}*/
    this.url = null;
    /** @type {date}*/
    this.requestStartDate = null;
    /** @type {date}*/
    this.requestEndDate = null;
};

/**
 * @constructor
 */
streaming.vo.StreamMetrics = function()
{
    /** @type {number}*/
    this.bitrateValue = NaN;
    /** @type {number}*/
    this.bitrateIndex = NaN;
    /** @type {number}*/
    this.maxBitrateIndex = NaN;
    /** @type {number}*/
    this.bufferLength = NaN;
    /** @type {number}*/
    this.lastFragmentDuration = NaN;
    /** @type {number}*/
    this.lastFragmentDownloadTime = NaN;
};

/**
 * @constructor
 */
streaming.vo.StreamItem = function()
{
    /** @type {string}*/
    this.id = null;
    /** @type {number}*/
    this.bandwidth = 0;
};