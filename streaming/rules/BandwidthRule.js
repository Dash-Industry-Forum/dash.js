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
window["streaming"] = window["streaming"] || {};
streaming.rules = streaming.rules || {};

/**
 *
 * @constructor
 */
streaming.rules.BandwidthRule = function ()
{
    this.test = -1;
};

streaming.rules.BandwidthRule.prototype = new streaming.rules.BaseRule();

/**
 * @public
 */
streaming.rules.BandwidthRule.prototype.checkIndex = function (metrics, items)
{
    this.test++;

    if (this.test >= items.length)
        this.test = 0;

    return this.test;


    /*
    if (metrics == null)
        return -1;


    var downloadRatio = metrics.lastFragmentDuration / metrics.lastFragmentDownloadTime;





    return -1;
    */
};