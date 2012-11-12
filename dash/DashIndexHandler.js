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
 * @param {dash.vo.AdaptationSet|null} adaptation
 * @constructor
 */
dash.DashIndexHandler = function(adaptation) {
    /** @type {dash.vo.AdaptationSet}
     * @private */
	this.adaptation = adaptation;

    /** @type {dash.vo.Representation} */
    this.representation = null;

    /** @type {number}
     * @private */
	this.currentIndex = -1000;

    /** @type {Array.<dash.vo.Segment>}
     * @private */
    this.segments=null;

    /** @type {boolean} */
    this.ready=true;

    this.onReady=function(){};
    /** @type {dash.SegmentIndexLoader} */
    this.segmentLoader= new dash.SegmentIndexLoader();
    this.segmentLoader.onSegmentsLoaded=this.onSegmentsLoaded.bind(this);
};

dash.DashIndexHandler.prototype = {
    setQuality:function(value)
    {
        this.qualityIndex=value;
        this.representation=this.getRepresentationForQuality(value);

        this.currentIndex=-1000;
        var segmentBase= this.representation.segmentBase;
        if(segmentBase)
        {
            var url = this.getRequestURL(this.representation.getInitialization(), this.representation.baseURL,this.representation);
            this.segments=null;
            this.segmentLoader.loadSegments(url,segmentBase.indexRange);
            this.ready=false;
        }
    },
    getCodec:function(){
         return this.representation.mimeType +'; codecs="'+this.representation.codecs.join(",")+'"';
    },
    /**
     *
     * @param {string} url
     * @param {dash.vo.Representation} media
     * @param {number=} index
     * @param {number=} time
     * @return {string}
     */
	doTemplateReplacements: function(url,media,index,time) {
		var newURL = url;

        if(typeof index!="undefined")
        {
            var i = index;
            if (media.segmentTemplate && media.segmentTemplate.startNumber >= 0)
            {
                i += media.segmentTemplate.startNumber;
            }
            newURL = newURL.replace("$Number$", i.toString());
        }
        if(typeof time!="undefined")
		    newURL = newURL.replace("$Time$", time.toString());

        newURL = newURL.replace("$Bandwidth$", media.bandwidth.toString());
        newURL = newURL.replace("$RepresentationID$", media.id.toString());
		
		return newURL;
	},
    /**
     *
     * @param {string} destination
     * @param {string} baseURL
     * @param {dash.vo.Representation} media
     * @param {number=} index
     * @param {number=} time
     * @return {string}
     */
    getRequestURL: function(destination,baseURL,media,index,time) {
		var url;
		
		if (destination == baseURL)
			url = destination;
		
		else if (destination.indexOf("http://") != -1)
			url = destination;
		
		else
			url = baseURL + destination;
		
		return this.doTemplateReplacements(url, media, index, time);
	},
    /**
     * @param {number} quality
     * @return {dash.vo.Representation}
     */
    getRepresentationForQuality: function(quality) {
        if (this.adaptation)
			return this.adaptation.medias[quality];
		else
			return null;
	},
    /**
     *
     * @param {dash.vo.SegmentTemplate} template
     * @param {number} index
     * @return {dash.vo.Segment}
     */
    getSegmentFromTemplate: function(template,index) {
		var seg = new dash.vo.Segment();
		seg.timescale = template.timescale;
		seg.duration = template.duration;
        seg.startTime = i * seg.duration;
        seg.media = template.media;

		var i = template.startNumber + index;

		return seg;
	},

    /**
     * @return {dash.vo.SegmentRequest}
     */
    getInitRequest: function() {
		var media = this.representation;
		var init = media.getInitialization();
		if (init != null)
		{
			var initRange = media.getInitializationRange();

			var req = new dash.vo.SegmentRequest();
		    req.url = this.getRequestURL(init, media.baseURL,media);
			req.startTime = 0;
			req.duration = 0;
            if(initRange){
                req.startRange=initRange.start;
                req.endRange = initRange.end;
            }

            console.log(req);
			return req;
		}
		
		return null;		
	},
    /**
     *
     * @param {number} time
     * @return {dash.vo.SegmentRequest}
     */
    getSegmentRequestForTime: function(time) {
        if(!this.ready) throw "index handler is not ready!";

		var media = this.representation;

		this.currentIndex = this.getIndexForTime(time);

        /** @type {dash.vo.Segment} */
        var segment;

        if (false) // IF MEDIA DONE
        {
            return null; // TODO
        }
        else if (media.segments && media.segments.length)
        {
            segment = media.segments[this.currentIndex];
        }
        else if (this.segments && this.segments.length)
        {
            segment = this.segments[this.currentIndex];
        }
        else if (media.segmentTemplate)
        {
            segment = this.getSegmentFromTemplate(media.segmentTemplate, this.currentIndex);
        }
        else
        {
            return null; // TODO : ERROR
        }

        var req = new dash.vo.SegmentRequest();
        req.url = this.getRequestURL(segment.media, media.baseURL, media, this.currentIndex, segment.startTime/segment.timescale);
        if(segment.mediaRange)
        {
            req.startRange= segment.mediaRange.start;
            req.endRange = segment.mediaRange.end;
        }
        req.startTime = segment.startTime/segment.timescale;
        req.duration = segment.duration/segment.timescale;
        console.log(req);
		return req;
	},

    getIndexForTime:function(time)
    {
        var media =this.representation;
        var index =-1000;
        // figure out the index for this time
        var segments = this.segments||media.segments;
        if (media.getSegmentDuration() > 0 && media.getSegmentTimescale() > 0)
        {
            var fragmentDuration = (media.getSegmentDuration() / media.getSegmentTimescale());
            index = Math.floor(time / fragmentDuration);
        }
        else if (segments )
        {
            index = 0;
            var ft = 0;
            var frag;

            while (ft <= time && index < segments.length)
            {
                index++;
                frag =segments[index];
                ft += frag.duration /frag.timescale;
            }
            index--;
        }

        return index;
    },

    /**
     * @return {dash.vo.SegmentRequest}
     */
    getNextSegmentRequest: function() {
        if(!this.ready) throw "Index handler is not ready!";
        if(this.currentIndex<0) throw "You must call getIndexForTime first.";
		var media = this.representation;
        var segment;
        this.currentIndex++;
        if (media.segments && media.segments.length )
        {
            segment = media.segments[this.currentIndex];
        }
        else if (this.segments && this.segments.length)
        {
            if(this.segments.length==0) throw "Segment Data Not Loaded Yet!";
            segment = this.segments[this.currentIndex];
        }
        else if (media.segmentTemplate)
        {
            segment = this.getSegmentFromTemplate(media.segmentTemplate, this.currentIndex);
        }

        if(!segment)
        {
            alert("Segment not found!")
        }
		var req = new dash.vo.SegmentRequest();
		req.url = this.getRequestURL(segment.media, media.baseURL, media, this.currentIndex, segment.startTime);
		req.startTime = segment.startTime/segment.timescale;
        if(segment.mediaRange)
        {
            req.startRange= segment.mediaRange.start;
            req.endRange = segment.mediaRange.end;
        }
		req.duration = segment.duration / segment.timescale;
        console.log(req);
		return req;
	},
    /**
     * @param {Array.<dash.vo.Segment>} s
     */
    onSegmentsLoaded:function(s)
    {
        this.ready=true;
        this.segments=s;
        this.onReady();
    }


};