MediaPlayer.vo.StreamInfo = function () {
    "use strict";
    this.id = null;
    this.index = null;
    this.start = NaN;
    this.duration = NaN;
    this.manifestInfo = null;
    this.isLast = true;
};

MediaPlayer.vo.StreamInfo.prototype = {
    constructor: MediaPlayer.vo.StreamInfo
};