MediaPlayer.vo.metrics.ManifestUpdate = function () {
    "use strict";

    this.streamType = null;
    this.type = null;                       // static|dynamic
    this.requestTime = null;                // when this manifest update was requested
    this.fetchTime = null;                  // when this manifest update was received
    this.availabilityStartTime = null;
    this.presentationStartTime = 0;      // the seek point (liveEdge for dynamic, Period[0].startTime for static)
    this.clientTimeOffset = 0;           // the calculated difference between the server and client wall clock time
    this.currentTime = null;                // actual element.currentTime
    this.buffered = null;                   // actual element.ranges
    this.latency = 0;                       // (static is fixed value of zero. dynamic should be ((Now-@availabilityStartTime) - elementCurrentTime)
    this.periodInfo = [];
    this.representationInfo = [];
};

MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo = function () {
    "use strict";

    this.id = null;         // Period@id
    this.index = null;
    this.start = null;      // Period@start
    this.duration = null;   // Period@duration
};

MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo = function () {
    "use strict";

    this.id = null;                         // Representation@id
    this.index = null;
    this.streamType = null;
    this.periodIndex = null;
    this.presentationTimeOffset = null;     // @presentationTimeOffset
    this.startNumber = null;                // @startNumber
    this.segmentInfoType = null;            // list|template|timeline
};

MediaPlayer.vo.metrics.ManifestUpdate.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate
};

MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo
};

MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo
};