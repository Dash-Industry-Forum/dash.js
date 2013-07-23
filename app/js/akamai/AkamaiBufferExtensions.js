MediaPlayer.dependencies.AkamaiBufferExtensions = function ()
{
    "use strict";


    var bufferTime,
        duration,
        isLongFormContent,
        manifest,
        videoData,
        totalRepresentationCount,

    // These values should never be set, treat as constants.
        BUFFER_TIME_AT_STARTUP = 1,
        BUFFER_TIME_BELOW_TOP_QUALITY = 30,
        BUFFER_TIME_BELOW_TOP_QUALITY_LONG_FORM = 30,
        BUFFER_TIME_AT_TOP_QUALITY = 30,
        BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300,
        LONG_FORM_CONTENT_DURATION_THRESHOLD = 600,

        init = function(manifestExt, manifestModel, videoModel)
        {
            manifest = manifestModel.getValue();

            manifestExt.getDuration(manifest, videoModel.getIsLive()).then(
                function(d)
                {
                    duration = d;
                    isLongFormContent = (duration >= LONG_FORM_CONTENT_DURATION_THRESHOLD);
                }
            );

            manifestExt.getVideoData(manifest).then(
                function(data)
                {
                    videoData = data;
                    totalRepresentationCount = data.Representation_asArray.length - 1 ; // Zero Based
                }
            );
        },
        getCurrentIndex = function(metrics, metricsExt)
        {
            var repSwitch = metricsExt.getCurrentRepresentationSwitch(metrics);
            if (repSwitch != null)
            {
                return metricsExt.getIndexForRepresentation(repSwitch.to);
            }
            return null;
        };


    return {
        system:undefined,
        videoModel: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        /*
        setup:function()
        {
             TODO: I wanted to try to do what is in init() in this setup function but the manifestModel returns
             null for getValue() when this is called when mapped.
        },
        */
        decideBufferLength: function (minBufferTime, waitingForBuffer)
        {
            if (waitingForBuffer || waitingForBuffer == undefined)
            {
                bufferTime = BUFFER_TIME_AT_STARTUP;

                if (manifest === undefined)
                {
                    init(this.manifestExt, this.manifestModel, this.videoModel);
                }
            }
            else
            {
                bufferTime = (isNaN(minBufferTime) || minBufferTime <= 0) ? 4 : minBufferTime;
            }

            return Q.when(bufferTime);
        },

        shouldBufferMore: function (bufferLength, delay) 
		{
            var metrics = player.getMetricsFor("video"),
                isPlayingAtTopQuality = (getCurrentIndex(metrics, this.metricsExt) === totalRepresentationCount),
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

            return Q.when(result);
        }
    };
};


MediaPlayer.dependencies.AkamaiBufferExtensions.prototype = new MediaPlayer.dependencies.BufferExtensions();
MediaPlayer.dependencies.AkamaiBufferExtensions.prototype.constructor = MediaPlayer.dependencies.AkamaiBufferExtensions;