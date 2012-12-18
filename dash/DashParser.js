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
dash.DashParser = function ()
{
    /**
     * @private
     * @type {dash.vo.DashManifest}
     */
    this.manifest=null;
};

dash.DashParser.prototype = new streaming.Parser();

/**
 * @private
 */
error = function()
{
    alert("manifest parse error");
};

/**
 * @private
 * @param {Element} xml
 * @param {dash.vo.SegmentBase=} base
 * @return {dash.vo.SegmentTemplate}
 */
dash.DashParser.prototype.parseSegmentTemplate = function (xml, base)
{
    if(!xml) return null;
    var item = new dash.vo.SegmentTemplate(base);
    item.duration = parseFloat(xml.getAttribute("duration"));
    item.startNumber = parseFloat(xml.getAttribute("startNumber")||0);
    item.media = xml.getAttribute("media");
    item.index = xml.getAttribute("index");
    item.bitstreamSwitching = xml.getAttribute("bitstreamSwitching");
    item.timescale = parseFloat(xml.getAttribute("timescale")) || item.timescale;
    item.initialization = xml.getAttribute("initialization") || item.initialization;
    var node = xml.querySelector("SegmentTimeline");
    if(node) {
        var segments =[];
        var fragments = node.getElementsByTagName("S");
        var len= fragments.length;
        for(var i=0; i<len; i++)
        {
            var frag = new dash.vo.TimelineFragment();
            frag.repeat = parseFloat(fragments[i].getAttribute("r"));
            frag.duration = parseFloat(fragments[i].getAttribute("d"));
            frag.time = parseFloat(fragments[i].getAttribute("t"));
            segments.push(frag);
        }
        item.segments = segments;
    }
    return item;
};

/**
* @private
* @param {Element} xml
* @return {dash.vo.SegmentURL}
*/
dash.DashParser.prototype.parseSegmentURL = function(xml)
{
    var segment = new dash.vo.SegmentURL();
    segment.media = xml.getAttribute("media");
    segment.mediaRange = this.parseRangeValues(xml.getAttribute("mediaRange"));
    segment.index = xml.getAttribute("index");
    segment.indexRange = this.parseRangeValues(xml.getAttribute("indexRange"));
    return segment;
};

/**
* @private
* @param {Element} xml
* @param {dash.vo.SegmentBase=} base
* @return {dash.vo.SegmentList}
*/
dash.DashParser.prototype.parseSegmentList = function(xml, base)
{
    if (!xml) return null;
    var list = new dash.vo.SegmentList(base);
    list.duration = parseFloat(xml.getAttribute("duration"));
    list.startNumber = parseFloat(xml.getAttribute("startNumber"));
    list.timescale = parseFloat(xml.getAttribute("timescale")) || list.timescale;
    var node = xml.querySelector("Initialization[sourceURL]");
    if (node) list.initialization = node.getAttribute("sourceURL");
    var items = xml.getElementsByTagName("SegmentURL");
    if (items.length > 0)
    {
        var set = [];
        var len = items.length;
        for (var i = 0; i < len; i++)
        {
            set.push(this.parseSegmentURL(items[i]));
        }
        list.segments = set;
    }
    return list;
};

/**
* @private
* @param {Element} xml
* @param {dash.vo.SegmentBase=} base
* @return {dash.vo.SegmentBase}
*/
dash.DashParser.prototype.parseSegmentBase = function(xml, base)
{
    if (!xml) return null;
    var sb = new dash.vo.SegmentBase(base);
    sb.timescale = parseFloat(xml.getAttribute("timescale")) || sb.timescale;
    sb.presentationTimeOffset = parseFloat(xml.getAttribute("presentationTimeOffset"));
    sb.indexRange = this.parseRangeValues(xml.getAttribute("indexRange"));
    sb.indexRangeExact = xml.getAttribute("indexRangeExact") == "true";
    var node = xml.querySelector("Initialization");
    if (node) sb.initializationRange = this.parseRangeValues(node.getAttribute("range"));
    return sb;
};

/**
* @private
* @param {Element} url
* @return {dash.vo.SegmentBase}
*/
dash.DashParser.prototype.buildSegmentBaseFromURL = function (url, baseURL) {
    var sb = new dash.vo.SegmentBase();
    
    if ((url.indexOf("http://") != 0) && (baseURL != null && baseURL != ""))
    {
        sb.initialization = baseURL + url;
    }
    else
    {
        sb.initialization = url;
    }
    
    return sb;
};

/**
* @private
* @param {string} value
* @return {dash.vo.IndexRange}
*/
dash.DashParser.prototype.parseRangeValues = function(value)
{
    var range = null;
    if (value != null && value.length > 0 && value.indexOf("-") > 0)
    {
        range = new dash.vo.IndexRange();
        range.start = parseFloat(value.split("-")[0]);
        range.end = parseFloat(value.split("-")[1]);
    }
    return range;
};

/**
* @private
* @param {dash.vo.SegmentTemplate} template
* @return {Array.<dash.vo.Segment>}
*/
dash.DashParser.prototype.segmentsFromTemplate = function(template)
{
    var segments = null;
    var frag;
    var url;
    var time = 0;

    if (template.segments)
    {
        var len = template.segments.length;
        var count = 0;
        segments = [];

        for (var i = 0; i < len; i++)
        {
            var segment = template.segments[i];
            var repeat = parseFloat(segment.repeat) || 1;
            for (var j = 0; j < repeat; j++)
            {
                frag = new dash.vo.Segment();
                frag.timescale = template.timescale;
                if (!isNaN(segment.time))
                {
                    frag.startTime = segment.time;
                    time = segment.time;
                }
                else
                    frag.startTime = time;
                frag.duration = segment.duration;

                url = template.media;
                url = url.split("$Number$").join((template.startNumber + count).toString());
                url = url.split("$Time$").join(frag.startTime.toString());
                frag.media = url;
                time += segment.duration;
                count++;
                segments.push(frag);
            }
        }
    }

    return segments;
};

/**
* @private
* @param {dash.vo.SegmentList} list
* @return {Array.<dash.vo.Segment>}
*/
dash.DashParser.prototype.segmentsFromList = function(list)
{
    var segments = [];
    var len = list.segments.length;
    for (var i = 0; i < len; i++)
    {
        var frag = new dash.vo.Segment();
        var s = list.segments[i];
        frag.media = s.media;
        frag.mediaRange = s.mediaRange;
        frag.indexRange = s.indexRange;
        frag.timescale = list.timescale;
        frag.duration = list.duration;
        frag.startTime = i * list.duration;
        segments.push(frag);
    }
    return segments;
};

/**
* @private
* @param {object} item
* @param {Element} xml
* @param {object=} parent
*/
dash.DashParser.prototype.parseCommonAttributes = function(item, xml, parent)
{
    var propertyList = ["profiles", "width", "height", "sar", "frameRate", "audioSamplingRate", "mimeType", "segmentProfiles", "codecs", "maximumSAPPeriod", "startWithSAP", "maxPlayoutRate", "codingDependency", "scanType"];
    var prop;
    var val;
    var i;
    var len;
    if (parent)
    {
        len = propertyList.length;
        for (i = 0; i < len; i++)
        {
            prop = propertyList[i];
            item[prop] = parent[prop];
        }
    }
    len = propertyList.length;
    for (i = 0; i < len; i++)
    {
        prop = propertyList[i];
        val = xml.getAttribute(prop);
        if (val != null) item[prop] = val;
    }
    val = xml.getAttribute("codecs");
    if (val != null) item.codecs = val.split(",");
};

/**
* @private
* @param {NodeList} items
* @param {dash.vo.AdaptationSet} parent
* @return {Array.<dash.vo.Representation>}
*/
dash.DashParser.prototype.parseRepresentations = function(items, parent)
{
    var sets = [];
    var item;
    var xml;
    var len = items.length;
    for (var i = 0; i < len; i++)
    {
        xml = items[i];
        item = new dash.vo.Representation();
        this.parseCommonAttributes(item, xml, parent);
        var node = xml.querySelector(xml.nodeName + " > BaseURL");
        item.baseURL = node != null ? node.textContent || node.innerText : this.manifest.baseURL;
        item.baseURL = this.trimURL(item.baseURL);
        item.id = xml.getAttribute("id");
        item.bandwidth = parseFloat(xml.getAttribute("bandwidth"));
        item.qualityRanking = parseFloat(xml.getAttribute("qualityRanking"));
        item.dependencyId = xml.getAttribute("dependencyId");
        item.mediaStreamStructureId = xml.getAttribute("mediaStreamStructureId");

        node = xml.querySelector(xml.nodeName + " > SegmentBase");
        if (node) item.segmentBase = this.parseSegmentBase(node, parent.segmentBase);
        else item.segmentBase = parent.segmentBase;

        node = xml.querySelector(xml.nodeName + " > SegmentList");
        if (node) item.segmentList = this.parseSegmentList(node, parent.segmentList);
        else item.segmentList = parent.segmentList;

        node = xml.querySelector(xml.nodeName + " > SegmentTemplate");
        if (node) item.segmentTemplate = this.parseSegmentTemplate(node, parent.segmentTemplate);
        else item.segmentTemplate = parent.segmentTemplate;

        var hasBase = item.segmentBase != null ? 1 : 0;
        var hasList = item.segmentList != null ? 1 : 0;
        var hasTemplate = item.segmentTemplate != null ? 1 : 0;

        var numInfos = hasBase + hasList + hasTemplate;
        // Special Case!
        // This means we have a 'SegmentBase' scenario, but without the extra information.
        // Fake a SegmentBase object since this use-case and the SegmentBase are handled in the same way.
        if (numInfos == 0)
        {
            item.segmentBase = this.buildSegmentBaseFromURL(item.baseURL, this.manifest.baseURL);
        }
        if (numInfos > 1)
        {
            throw "Must specify at most SegmentBase, SegmentList, or SegmentTemplate.";
        }
        if (hasBase == 1)
        {
            item.segments = null;
            item.segmentBase.initialization = item.baseURL;
            item.baseURL = this.manifest.baseURL;
        }
        else if (hasList == 1)
            item.segments = this.segmentsFromList(item.segmentList);
        else if (hasTemplate == 1)
            item.segments = this.segmentsFromTemplate(item.segmentTemplate);
        
        sets.push(item);
    }
    sets.sort(
        function(a, b) {
            if (a.bandwidth > b.bandwidth)
                return 1;
            else if (a.bandwidth < b.bandwidth)
                return -1;
            else
                return 0;
        }
    );

    return sets;
};

/**
* @private
* @param {NodeList} items
* @param {dash.vo.Period} parent
* @return {Array.<dash.vo.AdaptationSet>}
*/
dash.DashParser.prototype.parseAdaptationSets = function(items, parent)
{
    var sets = [];
    var item;
    var xml;
    var len = items.length;
    for (var i = 0; i < len; i++)
    {
        xml = items[i];
        item = new dash.vo.AdaptationSet();
        var node = xml.querySelector(xml.nodeName + " > BaseURL");
        item.baseURL = node != null ? node.textContent || node.innerText : this.manifest.baseURL;
        item.baseURL = this.trimURL(item.baseURL);
        this.parseCommonAttributes(item, xml);
        var nodes = xml.getElementsByTagName("ContentComponent");
        if (nodes.length > 0)
        {
            item.contentComponents = [];

            var x;
            for (var j = 0; j < nodes.length; j++)
            {
                x = nodes[j];
                var cc = new dash.vo.ContentComponent();
                cc.id = x.getAttribute("id");
                cc.contentType = x.getAttribute("contentType");
                cc.lang = x.getAttribute("lang");
                item.contentComponents.push(cc);
            }
        }
        node = xml.querySelector(xml.nodeName + " > SegmentBase");
        if (node)
            item.segmentBase = this.parseSegmentBase(node, parent.segmentBase);
        else
            item.segmentBase = parent.segmentBase;
        node = xml.querySelector(xml.nodeName + " > SegmentList");
        if (node)
            item.segmentList = this.parseSegmentList(node, parent.segmentList);
        else
            item.segmentList = parent.segmentList;
        node = xml.querySelector(xml.nodeName + " > SegmentTemplate");
        if (node) item.segmentTemplate = this.parseSegmentTemplate(node, parent.segmentTemplate);
        else item.segmentTemplate = parent.segmentTemplate;
        item.medias = this.parseRepresentations(xml.getElementsByTagName("Representation"), item);
        sets.push(item);
    }
    return sets;
};

/**
* @private
* @param items
* @return {Array.<dash.vo.Period>}
*/
dash.DashParser.prototype.parsePeriods = function(items)
{
    var periods = [];
    var item;
    var xml;
    var len = items.length;
    for (var i = 0; i < len; i++)
    {
        xml = items[i];
        item = new dash.vo.Period();
        item.id = xml.getAttribute("id");
        item.start = this.parseTime(xml.getAttribute("start"));
        item.duration = this.parseTime(xml.getAttribute("duration"));
        var node = xml.querySelector(xml.nodeName + " > BaseURL");
        item.baseURL = node != null ? node.textContent || node.innerText : this.manifest.baseURL;
        item.baseURL = this.trimURL(item.baseURL);
        node = xml.querySelector(xml.nodeName + " > SegmentBase");
        if (node) item.segmentBase = this.parseSegmentBase(node);
        node = xml.querySelector(xml.nodeName + " > SegmentList");
        if (node) item.segmentList = this.parseSegmentList(node);
        node = xml.querySelector(xml.nodeName + " > SegmentTemplate");
        if (node) item.segmentTemplate = this.parseSegmentTemplate(node);
        item.adaptations = this.parseAdaptationSets(xml.getElementsByTagName("AdaptationSet"), item);
        periods.push(item);
    }
    return periods;
};

/**
* @private
* @param {Element} xml
* @param {string} baseURL
* @return {dash.vo.DashManifest}
*/
dash.DashParser.prototype.parseTopManifest = function(xml, baseURL)
{
    var man = new dash.vo.DashManifest();
    man.id = xml.getAttribute("id");
    man.type = xml.getAttribute("type");
    man.availabilityStartTime = new Date(xml.getAttribute("availabilityStartTime"));
    man.availabilityEndTime = new Date(xml.getAttribute("availabilityEndTime"));
    var timeAttrs = ["mediaPresentationDuration", "minBufferTime", "minimumUpdatePeriod", "timeShiftBufferDepth", "suggestedPresentationDelay", "maxSegmentDuration", "maxSubsegmentDuration"];
    var attr;
    var len = timeAttrs.length;
    for (var i = 0; i < len; i++)
    {
        attr = timeAttrs[i];
        man[attr] = this.parseTime(xml.getAttribute(attr));
    }
    var p = xml.getAttribute("profiles");
    if (p != null) man.profiles = p.split(" ").join("").split(",");
    var node = xml.querySelector(xml.nodeName + " > BaseURL");
    man.baseURL = node != null ? node.textContent || node.innerText : baseURL;
    man.baseURL = this.trimURL(man.baseURL);
    var absoluteBase = man.baseURL.indexOf("http") == 0;
    if (!absoluteBase) man.baseURL = baseURL + man.baseURL;
    man.baseURL = this.trimURL(man.baseURL);
    return man;
},

/**
* @private
* @param {string} str
* @return {number}
*/
dash.DashParser.prototype.parseTime = function(str)
{
    //TODO replace this method.
    //TODO this method is plagiarized from the youtube dash player.
    if (str == null) return NaN;
    var re = /PT(([0-9]*)H)?(([0-9]*)M)?(([0-9.]*)S)?/;
    var match = re.exec(str);
    if (!match) return parseFloat(str);
    return (parseFloat(match[2] || 0) * 3600 +
        parseFloat(match[4] || 0) * 60 +
        parseFloat(match[6] || 0));
};

/**
* @private
* @param {string} url
* @return {string}
*/
dash.DashParser.prototype.trimURL = function (url)
{
    var paramIdx = url.indexOf("?");
    if(paramIdx != -1) return url.substring(0,paramIdx);
    return url;
};

/**
 * @param {string} value
 * @param {string} baseURL
 * @return {dash.vo.DashManifest}
 */
dash.DashParser.prototype.parse = function(value,baseURL)
{
    if(value == null || value.length == 0) this.error();
    var xml = new DOMParser().parseFromString(value,"text/xml");
    if(xml == null) this.error();
    this.manifest = this.parseTopManifest(xml.documentElement,baseURL);
    var items = xml.querySelectorAll("Period");
    this.manifest.periods = this.parsePeriods(items);
    return this.manifest;
};