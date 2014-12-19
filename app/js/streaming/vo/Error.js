MediaPlayer.vo.Error = function (code, message, data) {
    "use strict";
    this.code = code || null;
    this.message = message || null;
    this.data = data || null;
};

MediaPlayer.vo.Error.prototype = {
    constructor: MediaPlayer.vo.Error
};