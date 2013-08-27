MediaPlayer.utils.VTTParser = function () {
    "use strict";

    var convertCuePointTimes = function(time) {
        var timeArray = time.split( ":"),
            len = timeArray.length - 1;

        time = parseInt( timeArray[len-1], 10 ) * 60 + parseFloat( timeArray[len], 10 );

        if ( len === 2 ) {
            time += parseInt( timeArray[0], 10 ) * 3600;
        }

        return time;
    };

    return {

        parse: function (data)
        {
            var regExNewLine = /(?:\r\n|\r|\n)/gm,
                regExToken = /-->/,
                regExWhiteSpace = /(^[\s]+|[\s]+$)/g,
                captionArray = [],
                len;

            data = data.split( regExNewLine );
            len = data.length;

            for (var i = 0 ; i < len; i++)
            {
                var item = data[i];

                if (item.length > 0 && item !== "WEBVTT")
                {
                    if (item.match(regExToken))
                    {
                        var cuePoints = item.split(regExToken)
                        //vtt has sublines so more will need to be done here
                        var sublines = data[i+1];

                        //TODO Make VO external so other parsers can use.
                        captionArray.push({
                            start:convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, '')),
                            end:convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, '')),
                            data:sublines
                        });
                    }
                }
            }

            return Q.when(captionArray);
        }
    };
};