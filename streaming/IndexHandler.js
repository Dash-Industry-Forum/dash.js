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
/**
 *
 * @constructor
 */
streaming.IndexHandler = function (data, items)
{
    this.data = data;
    this.items = items;
    this.ready = true;
};

streaming.IndexHandler.prototype =
{
    /**
     * @public
     */
    setData: function (value)
    {
        this.data = value;
    },

    /**
     * @public
     */
    getBandwidthForIndex: function (quality)
    {
        return 0;
    },
    
    /**
     * @public
     */
    getMaxQuality: function ()
    {
        return 0;
    },

    /**
     * @public
     */
    getInitRequest: function (quality)
    {
        return null;
    },
    
    /**
     * @public
     * return streaming.vo.SegmentRequest
     */
    getSegmentRequestForTime: function (time, quality)
    {
        return null;
    },
    
    /**
     * @public
     * return streaming.vo.SegmentRequest
     */
    getNextSegmentRequest: function (quality)
    {
        return null;
    }
};