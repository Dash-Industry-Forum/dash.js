
MediaPlayer.vo.metrics.DVRInfo = function () {
    "use strict";

    var time = null,
        range = null,
        mpd=null,

        setRange = function(value) {
            range = value;
        },
        setTime = function(value) {
            time = value;
        },
        setMPD = function(value) {
            mpd = value;
        };

    return {
        setTime : setTime,
        setRange : setRange,
        setMPD : setMPD,

        isDVR : function ()
        {
            return !isNaN(mpd.timeShiftBufferDepth);
        },

        dvrWindowTime : function() {
            return mpd.timeShiftBufferDepth;
        },

        duration : function() {
            // I will want to return duration from video element for VOD streams so player dev can just call this one spot to drive a custom video UI
            return range.end < mpd.timeShiftBufferDepth ? range.end : mpd.timeShiftBufferDepth;
        },

        time : function () {
            // I will want to return currentTime from video element for VOD streams so player dev can just call this one spot to drive a custom video UI
            // This will produce a relative time withing the DVR range.
            return Math.round(this.duration() - (range.end - time));
        },

        getSeekValue : function (value) {
            // I will want to return value without modification if called from a VOD stream.
            var val = range.start + parseInt(value);

            if (val > range.end)
            {
                val = range.end; //should we add -10 for safety?
            }

            return val;
        },

        totalRunningTime : function () {
            return time;
        },

        timeCode : function (sec)
        {
            sec = Math.max(sec, 0);

            var h = Math.floor(sec/3600);
            var m = Math.floor((sec%3600)/60);
            var s = Math.floor((sec%3600)%60);
            return (h === 0 ? "":(h<10 ? "0"+h.toString()+":" : h.toString()+":"))+(m<10 ? "0"+m.toString() : m.toString())+":"+(s<10 ? "0"+s.toString() : s.toString());
        },

        timeAsUTC : function () {



            return (mpd.availabilityStartTime.getTime() / 1000) + this.time();
        },

        durationAsUTC : function () {
            return mpd.availabilityEndTime !== Number.POSITIVE_INFINITY ? mpd.availabilityEndTime.getTime() : (mpd.availabilityStartTime.getTime() / 1000) + this.dvrWindowTime();
        },

        convertUTCToDate : function (t) {
            return new Date(t*1000);
        }
    };
};

MediaPlayer.vo.metrics.DVRInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.DVRInfo
};