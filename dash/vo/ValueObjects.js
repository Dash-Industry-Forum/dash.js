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

window["dash"] = window["dash"]||{};
dash.vo = {};

//util
dash.$extend = function(from, fields) {
	function Inherit() {}
    Inherit.prototype = from;
    var proto = new Inherit();
	for (var name in fields)
        proto[name] = fields[name];
	return proto;
};

/**
 * @constructor
 */
dash.vo.AdaptationSet = function() {
	var me=this;
    /** @type {boolean}*/
	me.codingDependency = false;
    /** @type {number}*/
	me.maxPlayoutRate = 1;
    /** @type {number}*/
    me.subsegmentStartsWithSAP = 0;
    /** @type {boolean}*/
	me.subsegmentAlignment = false;
    /** @type {boolean}*/
	me.bitstreamSwitching = false;
    /** @type {boolean}*/
	me.segmentAlignment = false;
    /** @type {number}*/
    me.height = NaN;
    /** @type {number}*/
    me.width = NaN;
    /** @type {string|null}*/
    me.scanType = null;
    /** @type {number}*/
    me.startWithSAP = NaN;
    /** @type {number}*/
    me.maximumSAPPeriod = NaN;
    /** @type {Array.<string>}*/
    me.codecs = null;
    /** @type {string|null}*/
    me.segmentProfiles = null;
    /** @type {string|null}*/
    me.mimeType = null;
    /** @type {number}*/
    me.audioSamplingRate = NaN;
    /** @type {number}*/
    me.frameRate = NaN;
    /** @type {string|null}*/
    me.sar = null;
    /** @type {string|null}*/
    me.profiles = null;
    /** @type {Array.<dash.vo.Representation>}*/
    me.medias = null;
    /** @type {dash.vo.SegmentTemplate}*/
    me.segmentTemplate = null;
    /** @type {dash.vo.SegmentList}*/
    me.segmentList = null;
    /** @type {dash.vo.SegmentBase}*/
    me.segmentBase = null;
    /** @type {Array.<dash.vo.ContentComponent>}*/
    me.contentComponents = null;
    /** @type {string|null}*/
    me.baseURL = null;
    /** @type {number}*/
    me.maxFrameRate = NaN;
    /** @type {number}*/
    me.minFrameRate = NaN;
    /** @type {number}*/
    me.maxHeight = NaN;
    /** @type {number}*/
    me.minHeight = NaN;
    /** @type {number}*/
    me.maxWidth = NaN;
    /** @type {number}*/
    me.minWidth = NaN;
    /** @type {number}*/
    me.maxBandwidth = NaN;
    /** @type {number}*/
    me.minBandwidth = NaN;
    /** @type {string|null}*/
    me.par = null;
    /** @type {string|null}*/
    me.contentType = null;
    /** @type {string|null}*/
    me.lang = null;
    /** @type {string|null}*/
    me.group = null;
    /** @type {string|null}*/
    me.id = null;

};
dash.vo.AdaptationSet.prototype = {
    /**
     *
     * @return {boolean}
     */
    getIsAudio: function() {
		if(this.getIsVideo()) return false;
		if(this.contentComponents) {
			for(var i=0;i<this.contentComponents.length;i++)
			{
				if(this.contentComponents[i].contentType == "audio") return true;
			}
		}
		if(this.mimeType != null && this.mimeType.length > 0) return this.mimeType.indexOf("audio") != -1;
		return false;
	},
    /**
     *
     * @return {boolean}
     */
    getIsVideo: function() {
		if(this.contentComponents) {
			for(var i=0;i<this.contentComponents.length;i++)
			{
				if(this.contentComponents[i].contentType == "video") return true;
			}
		}
		if(this.mimeType != null && this.mimeType.length > 0) return this.mimeType.indexOf("video") != -1;
		return false;
	}
};


/**
 * @constructor
 */
dash.vo.ContentComponent = function() {
    var me=this;
    /** @type {string|null}*/
    me.lang = null;
    /** @type {string|null}*/
    me.id = null;
    /** @type {string|null}*/
    me.contentType = null;
};


/**
 * @constructor
 */
dash.vo.DashManifest = function() {
    var me=this;
    /** @type {number}*/
    me.suggestedPresentationDelay = 10;
    /** @type {number}*/
    me.minBufferTime = 4;
    /** @type {Array.<dash.vo.Period>}*/
    me.periods = null;
    /** @type {string|null}*/
    me.baseURL = null;
    /** @type {number}*/
    me.maxSubsegmentDuration = NaN;
    /** @type {number}*/
    me.maxSegmentDuration = NaN;
    /** @type {number}*/
    me.suggestedPresentationDelay = NaN;
    /** @type {number}*/
    me.timeShiftBufferDepth = NaN;
    /** @type {number}*/
    me.minBufferTime = NaN;
    /** @type {number}*/
    me.minimumUpdatePeriod = NaN;
    /** @type {number}*/
    me.mediaPresentationDuration = NaN;
    /** @type {Date}*/
    me.availabilityEndTime = null;
    /** @type {Date}*/
    me.availabilityStartTime = null;
    /** @type {string|null}*/
    me.type = null;
    /** @type {Array.<string>}*/
    me.profiles = null;
    /** @type {string|null}*/
    me.id = null;
    /** @type {string|null}*/
    me.source = null;
};

dash.vo.DashManifest.prototype = {
    /**
     * @return {number}
     */
    getDuration: function() {
        if(this.mediaPresentationDuration)
            return this.mediaPresentationDuration;
        else if(this.availabilityEndTime && this.availabilityStartTime )
            return this.availabilityEndTime.getTime() - this.availabilityStartTime.getTime();
        return NaN;
	},
    /**
     *
     * @return {boolean}
     */
    getIsDVR: function() {
		var containsDVR = !isNaN(this.timeShiftBufferDepth);
		return this.getIsLive() && containsDVR;
	}
	,
    /**
     *
     * @return {boolean}
     */
    getIsLive: function() {
		return this.type == "dynamic";
	}
	,
    /**
     *
     * @return {boolean}
     */
    getIsOnDemand: function() {
		if(this.profiles && this.profiles.length > 0) return this.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:201") != -1;
		return false;
	}
};


/**
 * @constructor
 */
dash.vo.IndexRange = function() {
    /** @type {number}*/
    this.end = NaN;
    /** @type {number}*/
    this.start = NaN;
};

/**
 * @constructor
 */
dash.vo.SegmentBase = function(base) {
	var me = this;
    /** @type {boolean}*/
    me.indexRangeExact = false;
    /** @type {number}*/
    me.timescale = 1;
    /** @type {string|null}*/
    me.initialization = null;
    /** @type {dash.vo.IndexRange}*/
    me.initializationRange = null;
    /** @type {dash.vo.IndexRange}*/
    me.indexRange = null;
    /** @type {number}*/
    me.presentationTimeOffset = NaN;
	if(base) {
        me.timescale = base.timescale;
        me.presentationTimeOffset = base.presentationTimeOffset;
        me.indexRange = base.indexRange;
        me.indexRangeExact = base.indexRangeExact;
        me.initializationRange = base.initializationRange;
        me.initialization = base.initialization;
	}
};

/**
 * @constructor
 * @extends {dash.vo.SegmentBase}
 */
dash.vo.MultipleSegmentBase = function(base) {
    /** @type {number}*/
    this.startNumber = 0;
    /** @type {number}*/
    this.duration = 0;
	dash.vo.SegmentBase.call(this,base);
	if(base) {
		this.duration = base.duration;
		this.startNumber = base.startNumber;
	}
};




/**
 * @constructor
 */
dash.vo.Period = function() {
    var me = this;
    /** @type {Array.<dash.vo.AdaptationSet>}*/
    me.adaptations = null;
    /** @type {dash.vo.SegmentTemplate}*/
    me.segmentTemplate = null;
    /** @type {dash.vo.SegmentList}*/
    me.segmentList = null;
    /** @type {dash.vo.SegmentBase}*/
    me.segmentBase = null;
    /** @type {string|null}*/
    me.baseURL = null;
    /** @type {number}*/
    me.duration = NaN;
    /** @type {number}*/
    me.start = NaN;
    /** @type {string|null}*/
    me.id = null;
};


/**
 * @constructor
 */
dash.vo.Representation = function() {
	var me = this;
    /** @type {boolean}*/
    me.codingDependency = false;
    /** @type {number}*/
    me.maxPlayoutRate = 1;
    /** @type {string|null}*/
    me.scanType = null;
    /** @type {number}*/
    me.startWithSAP = NaN;
    /** @type {number}*/
    me.maximumSAPPeriod = NaN;
    /** @type {Array.<string>}*/
    me.codecs = null;
    /** @type {string|null}*/
    me.segmentProfiles = null;
    /** @type {string|null}*/
    me.mimeType = null;
    /** @type {number}*/
    me.audioSamplingRate = NaN;
    /** @type {number}*/
    me.frameRate = NaN;
    /** @type {string|null}*/
    me.sar = null;
    /** @type {number}*/
    me.height = NaN;
    /** @type {number}*/
    me.width = NaN;
    /** @type {string|null}*/
    me.profiles = null;
    /** @type {Array.<dash.vo.Segment>}*/
    me.segments = null;
    /** @type {dash.vo.SegmentTemplate}*/
    me.segmentTemplate = null;
    /** @type {dash.vo.SegmentList}*/
    me.segmentList = null;
    /** @type {dash.vo.SegmentBase}*/
    me.segmentBase = null;
    /** @type {string|null}*/
    me.mediaStreamStructureId = null;
    /** @type {string|null}*/
    me.dependencyId = null;
    /** @type {number}*/
    me.qualityRanking = NaN;
    /** @type {number}*/
    me.bandwidth = NaN;
    /** @type {string|null}*/
    me.id = null;
    /** @type {string|null}*/
    me.baseURL = null;
};

dash.vo.Representation.prototype = {

    /**
     *
     * @return {dash.vo.IndexRange}
     */
	getInitializationRange: function() {
		if(this.segmentBase) return this.segmentBase.initializationRange;
		return null;
	}
	,
    /**
     *
     * @return {string}
     */
    getInitialization: function() {
		if(this.segmentBase)
			return this.segmentBase.initialization;
		else if(this.segmentList)
			return this.segmentList.initialization;
		else if(this.segmentTemplate)
			return this.segmentTemplate.initialization;
		
		return null;
	}
	,
    /**
     *
     * @return {number}
     */
    getSegmentDuration: function() {
		if(this.segmentList) return this.segmentList.duration; else if(this.segmentTemplate) return this.segmentTemplate.duration;
		return 0;
	}
	,
    /**
     *
     * @return {number}
     */
    getSegmentTimescale: function() {
		if(this.segmentList) return this.segmentList.timescale; else if(this.segmentTemplate) return this.segmentTemplate.timescale;
		return 0;
	}
};


/**
 * @constructor
 */
dash.vo.Segment = function() {
    var me = this;

    /** @type {dash.vo.IndexRange}*/
    me.indexRange = null;
    /** @type {dash.vo.IndexRange}*/
    me.mediaRange = null;
    /** @type {string|null}*/
    me.media = null;
    /** @type {number}*/
    me.duration = NaN;
    /** @type {number}*/
    me.startTime = NaN;
    /** @type {number}*/
    me.timescale = NaN;
};


/**
 * @constructor
 * @extends {dash.vo.MultipleSegmentBase}
 */
dash.vo.SegmentList = function(base) {
	dash.vo.MultipleSegmentBase.call(this,base);
    /** @type {Array.<dash.vo.SegmentURL>}*/
    this.segments = null;
	if(base) this.segments = base.segments;
};


/**
 * @constructor
 */
dash.vo.SegmentRequest = function() {
    var me  = this;
    /** @type {number}*/
    me.startTime = NaN;
    /** @type {number}*/
    me.duration = NaN;
    /** @type {number}*/
    me.endRange = null;
    /** @type {number}*/
    me.startRange = null;
    /** @type {string|null}*/
    me.url = null;
};



/**
 * @constructor
 * @extends {dash.vo.MultipleSegmentBase}
 *
 */
dash.vo.SegmentTemplate = function(base) {
	dash.vo.MultipleSegmentBase.call(this,base);
    var me = this;

    /** @type {Array.<dash.vo.TimelineFragment>}*/
    me.segments = null;
    /** @type {string|null}*/
    me.bitstreamSwitching = null;
    /** @type {string|null}*/
    me.index = null;
    /** @type {string|null}*/
    me.media = null;

	if(base) {
        me.media = base.media;
        me.index = base.index;
        me.bitstreamSwitching = base.bitstreamSwitching;
        me.segments = base.segments;
		console.log("got base: " + this.initialization + " | " + base.initialization);
	}
};

/**
 * @constructor
 */
dash.vo.SegmentURL = function() {
    var me = this;
    /** @type {dash.vo.IndexRange}*/
    me.indexRange = null;
    /** @type {string|null}*/
    me.index = null;
    /** @type {dash.vo.IndexRange}*/
    me.mediaRange = null;
    /** @type {string|null}*/
    me.media = null;
};



/**
 * @constructor
 */
dash.vo.TimelineFragment = function() {
    /** @type {number}*/
    this.repeat = 1;
    /** @type {number}*/
    this.duration = 0;
    /** @type {number}*/
	this.time = -1;
};

