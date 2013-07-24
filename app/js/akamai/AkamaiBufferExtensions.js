MediaPlayer.dependencies.AkamaiBufferExtensions = function ()
{
    "use strict";

    var bufferTime,
        duration,
        isLongFormContent,
        videoData,
        totalRepresentationCount,
        manifest,
    // These values should never be set, treat as constants.
        DEFAULT_MIN_BUFFER_TIME = 8,
        BUFFER_TIME_AT_STARTUP = 1,
        BUFFER_TIME_AT_TOP_QUALITY = 30,
        BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300,
        LONG_FORM_CONTENT_DURATION_THRESHOLD = 600,

        init = function()
        {
            manifest = this.manifestModel.getValue();

            this.manifestExt.getDuration(manifest, this.videoModel.getIsLive()).then(
                function(d)
                {
                    duration = d;
                    isLongFormContent = (duration >= LONG_FORM_CONTENT_DURATION_THRESHOLD);
                }
            );

            this.manifestExt.getVideoData(manifest).then(
                function(data)
                {
                    videoData = data;
                    totalRepresentationCount = data.Representation_asArray.length - 1 ; // Zero Based
                }
            );
        },
        getCurrentIndex = function(metrics)
        {
            var repSwitch = this.metricsExt.getCurrentRepresentationSwitch(metrics);

            if (repSwitch != null)
            {
                return this.metricsExt.getIndexForRepresentation(repSwitch.to);
            }
            return null;
        };


    return {
        system:undefined,
        videoModel: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        debug: undefined,
        /*
        setup:function()
        {
            // TODO: I wanted to try to do what is in init() in this setup function but the manifestModel returns
            // null for getValue() at this point.  Must be the order of mapping. can try to delay.. timeout but
            // that is a hack.
        },
        */
        decideBufferLength: function (minBufferTime, waitingForBuffer)
        {
            if (waitingForBuffer || waitingForBuffer == undefined)
            {
                bufferTime = BUFFER_TIME_AT_STARTUP;

                // See setup notes.
                if (manifest === undefined)
                {
                    init.call(this);
                }
            }
            else
            {
                bufferTime = Math.max(DEFAULT_MIN_BUFFER_TIME, minBufferTime);
            }

            //this.debug.log("Akamai minimum buffer time : " + bufferTime);

            return Q.when(bufferTime);
        },
        shouldBufferMore: function (bufferLength, delay) 
		{
            var metrics = player.getMetricsFor("video"),
                isPlayingAtTopQuality = (getCurrentIndex.call(this, metrics) === totalRepresentationCount),
                result;

            if (isPlayingAtTopQuality)
            {
                var bufferTargetTime =  isLongFormContent ?  BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM : BUFFER_TIME_AT_TOP_QUALITY;
                result = bufferLength < bufferTargetTime;
            }
            else
            {
                //TODO: set a base buffer value or use this?  Need ot understand what the delay value is all about.
                result = ((bufferLength - delay) < (bufferTime * 1.5));
            }

            //this.debug.log("Akamai should buffer more : " + result + " :  isPlayingAtTopQuality: " + isPlayingAtTopQuality);
            return Q.when(result);
        }
    };
};

MediaPlayer.dependencies.AkamaiBufferExtensions.prototype = new MediaPlayer.dependencies.BufferExtensions();
MediaPlayer.dependencies.AkamaiBufferExtensions.prototype.constructor = MediaPlayer.dependencies.AkamaiBufferExtensions;