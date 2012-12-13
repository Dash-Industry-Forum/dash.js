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
dash.DashHandler = function (data, items, duration)
{
    /** @type {dash.vo.AdaptationSet}
     * @private */
    this.adaptation = data;

    /** @type {Array}
     * @private */
    this.items = items;

    /** @type {number}
     * @private */
    this.duration = duration;

    /** @type {boolean} */
    this.ready = true;
    this.onReady = function () { };

    this.currentIndex = -1;
    
    /** @type {dash.SegmentIndexLoader} */
    this.segmentLoader = new dash.SegmentIndexLoader();
    this.segmentLoader.onInitializationChanged = this.onInitializationChanged.bind(this);
    this.segmentLoader.onSegmentsLoaded = this.onSegmentsLoaded.bind(this);
};

dash.DashHandler.prototype = new streaming.IndexHandler();

/**
 * @public
 */
dash.DashHandler.prototype.getBandwidthForIndex = function (quality)
{
    var media = this.getRepresentationForQuality(quality);
    if (media)
        return media.bandwidth;
    else
        return 0;
},

/**
 * @public
 */
dash.DashHandler.prototype.getMaxQuality = function ()
{
    return this.adaptation.medias.length;
},

/**
 * @param {string} url
 * @param {dash.vo.Representation} media
 * @param {number=} index
 * @param {number=} time
 * @return {string}
 */
dash.DashHandler.prototype.doTemplateReplacements = function(url, media, index, time)
{
    var newURL = url;

    if (typeof index != "undefined")
    {
        var i = index;
        if (media.segmentTemplate && media.segmentTemplate.startNumber >= 0)
        {
            i += media.segmentTemplate.startNumber;
        }
        newURL = newURL.replace("$Number$", i.toString());
    }
    
    if (typeof time != "undefined")
    {
        newURL = newURL.replace("$Time$", time.toString());
    }

    newURL = newURL.replace("$Bandwidth$", media.bandwidth.toString());
    newURL = newURL.replace("$RepresentationID$", media.id.toString());

    return newURL;
};

/**
* @param {string} destination
* @param {string} baseURL
* @param {dash.vo.Representation} media
* @param {number=} index
* @param {number=} time
* @return {string}
*/
dash.DashHandler.prototype.getRequestURL = function(destination, baseURL, media, index, time)
{
    var url;

    if (destination == baseURL)
        url = destination;

    else if (destination.indexOf("http://") != -1)
        url = destination;

    else
        url = baseURL + destination;

    return this.doTemplateReplacements(url, media, index, time);
};

/**
 * @param {number} quality
 * @return {dash.vo.Representation}
 */
dash.DashHandler.prototype.getRepresentationForQuality = function(quality)
{
    if (this.adaptation)
        return this.adaptation.medias[quality];
    else
        return null;
};

/**
 *
 * @param {dash.vo.SegmentTemplate} template
 * @param {number} index
 * @return {dash.vo.Segment}
 */
dash.DashHandler.prototype.getSegmentFromTemplate = function(template, index)
{
    var i = template.startNumber + index;
    
    var seg = new dash.vo.Segment();
    seg.timescale = template.timescale;
    seg.duration = template.duration;
    seg.startTime = i * seg.duration;
    seg.media = template.media;

    return seg;
};

dash.DashHandler.prototype.getIndexForTime = function(time, quality)
{
    var media = this.getRepresentationForQuality(quality);
    var index = -1000;
    // figure out the index for this time
    var segments = media.segments;
    if (media.getSegmentDuration() > 0 && media.getSegmentTimescale() > 0)
    {
        var fragmentDuration = (media.getSegmentDuration() / media.getSegmentTimescale());
        index = Math.floor(time / fragmentDuration);
    }
    else if (segments)
    {
        index = 0;
        var ft = 0;
        var frag;

        while (ft <= time && index < segments.length)
        {
            index++;
            frag = segments[index];
            ft += frag.duration / frag.timescale;
        }
        index--;
    }

    return index;
};

/**
 * @public
 */
dash.DashHandler.prototype.getInitRequest = function(quality)
{
    var media = this.getRepresentationForQuality(quality);
    
    // Special case!
    // If this is the first time we're playing the representation, we won't know what the segments are yet.
    // We have to load some of the single mp4 file to get the SIDX box.
    // This box is going to contain the segment information.
    var segmentBase = media.segmentBase;
    if (segmentBase != null && media.segments == null)
    {
        console.log("Load SIDX box to get segments.");
        this.ready = false;
        var url = this.getRequestURL(media.getInitialization(), media.baseURL, media);
        this.segmentLoader.loadSegments(url, segmentBase.indexRange, quality);
        return null;
    }

    // get the initialization
    var init = media.getInitialization();
    if (init != null)
    {
        var initRange = media.getInitializationRange();
        
        // Special case..  SegmentBase with no range means no initialization.
        if (media.segmentBase != null && initRange == null)
        {
            return null;
        }

        var req = new streaming.vo.SegmentRequest();
        req.url = this.getRequestURL(init, media.baseURL, media);
        req.startTime = 0;
        req.duration = 0;
        if (initRange)
        {
            req.startRange = initRange.start;
            req.endRange = initRange.end;
        }

        console.log(req);
        return req;
    }
    
    return null;
};

dash.DashHandler.prototype.isMediaFinished = function(quality)
{
    var media = this.getRepresentationForQuality(quality);

    if (false) // TODO : LIVE
    {
        return false;
    }
    else if (media.segments != null)
    {
        if (this.currentIndex >= media.segments.length)
        {
            return true;
        }
    }
    else if (media.segmentTemplate)
    {
        if (!isNaN(this.duration))
        {
            var fragLength = (media.segmentTemplate.duration / media.segmentTemplate.timescale);
            if (fragLength * this.currentIndex > this.duration)
            {
                return true;
            }
        }
    }

    return false;
},
    
/**
 * @public
 */
dash.DashHandler.prototype.getSegmentRequestForTime = function(time, quality)
{
    var req;
    
    if (!this.ready)
    {
        req = new streaming.vo.SegmentRequest();
        req.action = "stall";
        console.log("Signal stall.");
        return req;
    }
    
    var media = this.getRepresentationForQuality(quality);

    this.currentIndex = this.getIndexForTime(time, quality);

    /** @type {dash.vo.Segment} */
    var segment;

    if (this.isMediaFinished(quality))
    {
        req = new streaming.vo.SegmentRequest();
        req.action = "complete";
        console.log("Signal complete.");
        return req;
    }

    if (media.segments && media.segments.length)
    {
        segment = media.segments[this.currentIndex];
    }
    else if (media.segmentTemplate)
    {
        segment = this.getSegmentFromTemplate(media.segmentTemplate, this.currentIndex);
    }
    else
    {
        throw ("missing segment information");
    }

    req = new streaming.vo.SegmentRequest();
    req.url = this.getRequestURL(segment.media, media.baseURL, media, this.currentIndex, segment.startTime / segment.timescale);
    if (segment.mediaRange)
    {
        req.startRange = segment.mediaRange.start;
        req.endRange = segment.mediaRange.end;
    }
    req.startTime = segment.startTime / segment.timescale;
    req.duration = segment.duration / segment.timescale;
    console.log(req);
    return req;
};
    
/**
 * @public
 */
dash.DashHandler.prototype.getNextSegmentRequest = function(quality)
{
    if (!this.ready)
    {
        req = new streaming.vo.SegmentRequest();
        req.action = "stall";
        console.log("Signal stall.");
        return req;
    }

    if (this.currentIndex < 0)
        throw "You must call getIndexForTime first.";

    var media = this.getRepresentationForQuality(quality);
    var segment;
    this.currentIndex++;

    if (this.isMediaFinished(quality))
    {
        req = new streaming.vo.SegmentRequest();
        req.action = "complete";
        console.log("Signal complete.");
        return req;
    }

    if (media.segments && media.segments.length)
    {
        segment = media.segments[this.currentIndex];
    }
    else if (media.segmentTemplate)
    {
        segment = this.getSegmentFromTemplate(media.segmentTemplate, this.currentIndex);
    }

    if (segment == null)
    {
        throw("Segment not found! " + this.currentIndex + " | " + media.segments.length);
    }
    
    var req = new streaming.vo.SegmentRequest();
    req.url = this.getRequestURL(segment.media, media.baseURL, media, this.currentIndex, segment.startTime);
    req.startTime = segment.startTime / segment.timescale;
    if (segment.mediaRange)
    {
        req.startRange = segment.mediaRange.start;
        req.endRange = segment.mediaRange.end;
    }
    req.duration = segment.duration / segment.timescale;
    console.log(req);
    return req;
};

/**
 * 
 */
dash.DashHandler.prototype.onInitializationChanged = function (start, end, q)
{
    var media = this.getRepresentationForQuality(q);
    
    if (media.segmentBase != null)
    {
        media.segmentBase.initializationRange = new dash.vo.IndexRange();
        media.segmentBase.initializationRange.start = start;
        media.segmentBase.initializationRange.end = end;
    }
};

/**
 * @param {Array.<dash.vo.Segment>} s
 */
dash.DashHandler.prototype.onSegmentsLoaded = function(s, q)
{
    console.log("Segments done loading from SIDX: " + s.length);
    
    var media = this.getRepresentationForQuality(q);
    media.segments = s;
    
    this.ready = true;
    this.onReady();
}