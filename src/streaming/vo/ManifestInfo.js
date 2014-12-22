MediaPlayer.vo.ManifestInfo = function () {
    "use strict";
    this.DVRWindowSize = NaN;
    this.loadedTime = null;
    this.availableFrom = null;
    this.minBufferTime = NaN;
    this.duration = NaN;
    this.isDynamic = false;
    this.maxFragmentDuration = null;
};

MediaPlayer.vo.ManifestInfo.prototype = {
    constructor: MediaPlayer.vo.ManifestInfo
};