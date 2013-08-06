MediaPlayer.dependencies.AkamaiBufferExtensions = function ()
{
    "use strict";

    var baseBufferTime,
        isLongFormContent,
        totalRepresentationCount,
        manifest,
        DEFAULT_MIN_BUFFER_TIME = 8,
        BUFFER_TIME_AT_STARTUP = 1,
        BUFFER_TIME_AT_TOP_QUALITY = 30,
        BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300,
        LONG_FORM_CONTENT_DURATION_THRESHOLD = 600,

        init = function()
        {
            manifest = this.manifestModel.getValue();

            this.manifestExt.getDuration(manifest, this.videoModel.getIsLive()).then(
                function(duration)
                {
                    isLongFormContent = (duration >= LONG_FORM_CONTENT_DURATION_THRESHOLD);
                }
            );

            this.manifestExt.getVideoData(manifest).then(
                function(data)
                {
                    totalRepresentationCount = data.Representation_asArray.length - 1;
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
        decideBufferLength: function (minBufferTime, waitingForBuffer)
        {
            if (waitingForBuffer || waitingForBuffer == undefined)
            {
                baseBufferTime = BUFFER_TIME_AT_STARTUP;

                if (manifest === undefined)
                {
                    init.call(this);
                }
            }
            else
            {
                baseBufferTime = Math.max(DEFAULT_MIN_BUFFER_TIME, minBufferTime);
            }

            return Q.when(baseBufferTime);
        },
        shouldBufferMore: function (bufferLength, delay) 
		{
            var metrics = player.getMetricsFor("video"),
                isPlayingAtTopQuality = (getCurrentIndex.call(this, metrics) === totalRepresentationCount),
                bufferTarget,
                result;

            if (isPlayingAtTopQuality)
            {
                bufferTarget =  isLongFormContent ?  BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM : BUFFER_TIME_AT_TOP_QUALITY;
                result = bufferLength < bufferTarget;
            }
            else
            {
                result = bufferLength < baseBufferTime;
            }

            return Q.when(result);
        }
    };
};

MediaPlayer.dependencies.AkamaiBufferExtensions.prototype = new MediaPlayer.dependencies.BufferExtensions();
MediaPlayer.dependencies.AkamaiBufferExtensions.prototype.constructor = MediaPlayer.dependencies.AkamaiBufferExtensions;