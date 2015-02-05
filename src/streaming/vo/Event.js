MediaPlayer.vo.Event = function () {
    "use strict";
    this.type = null; // event type/name. mandatory
    this.sender = null; // object that fires an event. mandatory
    this.data = null; // object that contains additional information about the event. optional
    this.error = null; // error object. optional
    this.timestamp = NaN; // timestamp. mandatory
};

MediaPlayer.vo.Event.prototype = {
    constructor: MediaPlayer.vo.Event
};