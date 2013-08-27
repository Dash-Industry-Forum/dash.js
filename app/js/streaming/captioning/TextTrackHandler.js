MediaPlayer.utils.TextTrackHandler = function () {
    "use strict";
    return {
        addTextTrack : function(video, captionData,  label, scrlang, isDefaultTrack) {

            //TODO: Ability to define the KIND in the MPD - ie subtitle vs caption....
            var track = video.addTextTrack("captions", label, scrlang);
            track.default = isDefaultTrack;
            track.mode = "showing";

            for(var item in captionData)
            {
                var currentItem = captionData[item];
                track.addCue(new TextTrackCue(currentItem.start, currentItem.end, currentItem.data));
            }

            return Q.when(track);
        }
    };
};