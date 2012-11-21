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
window["dash"] = window["dash"]||{};

/**
 *
 * @constructor
 */
dash.SegmentIndexLoader = function() {
    /** @type {string} */
    this.url = null;
    /** @type {int} */
    this.quality = -1;
    /** @type {dash.vo.IndexRange} */
    this.range=null;
    /**
     * @param {Array.<dash.vo.Segment>} s
     */
    this.onSegmentsLoaded=function(s){};
    /**
     * @private
     * @type {XMLHttpRequest}
     */
    this.xhr=new XMLHttpRequest();
    this.xhr.responseType="arraybuffer";
    this.xhr.addEventListener("load", this.onSegmentDataLoaded.bind(this),false);
    this.xhr.addEventListener("error", this.onSegmentDataError.bind(this), false);
};
dash.SegmentIndexLoader.prototype={
    /**
     * @param {string} url
     * @param {dash.vo.IndexRange} segmentRange
     */
    loadSegments:function(url,segmentRange, quality)
    {
        this.range=segmentRange;
        this.url = url;
        this.quality = quality;
        this.xhr.open("GET",url);
        this.xhr.setRequestHeader("Range", "bytes="+segmentRange.start+"-"+segmentRange.end);
        this.xhr.send(null);
    },
    /**
     * @private
     * @param {Event} e
     */
    onSegmentDataLoaded:function(e)
    {
        this.onSegmentsLoaded(this.parseSegments(this.xhr.response,this.url,this.range.start), this.quality);
    },
    /**
     * @private
     * @param {Event} e
     */
    onSegmentDataError:function(e)
    {
        throw "Could not load segment data from "+this.url;
    },
    /**
     * @private
     * @param {ArrayBuffer} data
     * @param {string} media
     * @param {number} offset
     * @return {Array.<dash.vo.Segment>}
     */
    parseSegments:function (data,media,offset) {
        var parsed=parseSIDX(data,offset);
        var segments=[];
        var segment;
        for(var i=0;i<parsed.length;i++)
        {
            segment= new dash.vo.Segment();
            segment.duration= parsed[i].duration;
            segment.media = media;
            segment.startTime = parsed[i].time;
            segment.timescale= parsed[i].timescale;
            segment.mediaRange= new dash.vo.IndexRange();
            segment.mediaRange.start= parsed[i].offset;
            segment.mediaRange.end= parsed[i].offset+parsed[i].size-1;
            segments.push(segment);
        }

        return segments;

    }
};