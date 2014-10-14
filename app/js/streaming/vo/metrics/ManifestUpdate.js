MediaPlayer.vo.metrics.ManifestUpdate = function () {
    "use strict";

    this.mediaType = null;
    this.type = null;                       // static|dynamic
    this.requestTime = null;                // when this manifest update was requested
    this.fetchTime = null;                  // when this manifest update was received
    this.availabilityStartTime = null;
    this.presentationStartTime = 0;      // the seek point (liveEdge for dynamic, Stream[0].startTime for static)
    this.clientTimeOffset = 0;           // the calculated difference between the server and client wall clock time
    this.currentTime = null;                // actual element.currentTime
    this.buffered = null;                   // actual element.ranges
    this.latency = 0;                       // (static is fixed value of zero. dynamic should be ((Now-@availabilityStartTime) - elementCurrentTime)
    this.streamInfo = [];
    this.trackInfo = [];
};

MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo = function () {
    "use strict";

    this.id = null;         // Stream@id
    this.index = null;
    this.start = null;      // Stream@start
    this.duration = null;   // Stream@duration
};

MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo = function () {
    "use strict";

    this.id = null;                         // Track@id
    this.index = null;
    this.mediaType = null;
    this.streamIndex = null;
    this.presentationTimeOffset = null;     // @presentationTimeOffset
    this.startNumber = null;                // @startNumber
    this.fragmentInfoType = null;            // list|template|timeline
};

MediaPlayer.vo.metrics.ManifestUpdate.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate
};

MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo
};

MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo
};