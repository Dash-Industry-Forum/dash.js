MediaPlayer.vo.metrics.SchedulingInfo = function () {
    "use strict";

    this.mediaType = null;                 // Type of stream ("audio" | "video" etc..)
    this.t = null;                      // Real-Time | Time of the scheduling event.

    this.type = null;                   // Type of fragment (initialization | media)
    this.startTime = null;              // Presentation start time of fragment
    this.availabilityStartTime = null;  // Availability start time of fragment
    this.duration = null;               // Duration of fragment
    this.quality = null;                // Quality of fragment
    this.range = null;                  // Range of fragment

    this.state = null;                  // Current state of fragment
};

MediaPlayer.vo.metrics.SchedulingInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.SchedulingInfo
};

/* Public Static Constants */
MediaPlayer.vo.metrics.SchedulingInfo.PENDING_STATE = "pending";
MediaPlayer.vo.metrics.SchedulingInfo.LOADING_STATE = "loading";
MediaPlayer.vo.metrics.SchedulingInfo.EXECUTED_STATE = "executed";
MediaPlayer.vo.metrics.SchedulingInfo.REJECTED_STATE = "rejected";
MediaPlayer.vo.metrics.SchedulingInfo.CANCELED_STATE = "canceled";
MediaPlayer.vo.metrics.SchedulingInfo.FAILED_STATE = "failed";