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
    this.range = null;
    /** @type {boolean} */
    this.searching = false;
    /** @type {number} */
    this.bytesLoaded = 0;
    /** @type {number} */
    this.bytesToLoad = 1500;
    /**
     * @param {Array.<dash.vo.Segment>} s
     */
    this.onInitializationChanged = function (s) { };
    this.onSegmentsLoaded = function (s) { };
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
    loadSegments:function(url, segmentRange, quality)
    {
        this.range = segmentRange;
        
        // We might not know exactly where the sidx box is.
        // Load the first n bytes (say 1500) and look for it.
        if (this.range == null)
        {
            console.log("No known range for SIDX request.");
            this.searching = true;
            this.range = new dash.vo.IndexRange();
            this.range.start = 0;
            this.range.end = this.bytesToLoad;
        }
        
        this.url = url;
        this.quality = quality;
        this.xhr.open("GET", this.url);
        this.xhr.setRequestHeader("Range", "bytes=" + this.range.start + "-" + this.range.end);
        this.xhr.send(null);
        console.log("Perform SIDX load: " + this.url);
    },
    /**
     * @private
     * @param {Event} e
     */
    onSegmentDataLoaded:function(e)
    {
        // If we didn't know where the SIDX box was, we have to look for it.
        // Iterate over the data checking out the boxes to find it.
        if (this.searching)
        {
            this.bytesLoaded = this.range.end;
            this.findSIDX(this.xhr.response);
        }
        // If we have the whole box just parse it.
        else
        {
            this.onSegmentsLoaded(this.parseSegments(this.xhr.response, this.url, this.range.start), this.quality);
        }
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
     */
    findSIDX: function (data)
    {
        console.log("Searching for SIDX box.");
        console.log(this.bytesLoaded + " bytes loaded.");

        var initStart;
        var initEnd;

        var d = new DataView(data);
        var pos = 0;

        var type = "";
        var size = 0;

        while (type != "sidx" && pos < d.byteLength)
        {
            size = d.getUint32(pos); // subtract 8 for including the size and type
            pos += 4;

            type = "";
            for (var i = 0; i < 4; i++)
            {
                var c = d.getInt8(pos);
                type += String.fromCharCode(c);
                pos++;
            }
            
            // this is the initialization part
            if (type == "moov")
            {
                initStart = pos - 8;
                initEnd = initStart + size - 1;
                this.onInitializationChanged(initStart, initEnd, this.quality);
            }

            if (type != "sidx")
            {
                pos += size - 8;
            }
        }

        var bytesAvailable = d.byteLength - pos;

        // Case 1
        // We didn't download enough bytes to find the sidx.
        if (type != "sidx")
        {
            // be sure we don't reach the end of the file!
            // throw error is no sidx in the file anywhere

            // how do we know when we've reached EOF?

            // TODO : Load more bytes.
            throw ("Could not find SIDX box!");
        }
        // Case 2
        // We don't have the entire box.
        // Increase the number of bytes to read and load again.
        else if (bytesAvailable < size)
        {
            console.log("Found SIDX but we don't have all of it.");

            this.range.start = 0;
            this.range.end = this.bytesLoaded + (size - bytesAvailable);

            this.xhr.open("GET", this.url);
            this.xhr.setRequestHeader("Range", "bytes=" + this.range.start + "-" + this.range.end);
            this.xhr.send(null);
        }
        // Case 3
        // We have the entire box, so parse it and continue.
        else
        {
            this.range.start = pos - 8;
            this.range.end = this.range.start + size;
            
            console.log("Found the SIDX box.  Start: " + this.range.start + " | End: " + this.range.end);
            var sidxBytes = data.slice(this.range.start, this.range.end);
            this.onSegmentsLoaded(this.parseSegments(sidxBytes, this.url, this.range.start), this.quality);
        }
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

        console.log("Parsed SIDX box.  " + segments.length + " segments.");
        return segments;
    }
};