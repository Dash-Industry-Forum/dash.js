/**
 * Created by dsi on 31.03.14.
 */
Dash.vo.Event = function () {
    "use strict";

    this.duration = NaN;
    this.presentationTime = NaN;
    this.id = NaN;
    this.messageData = "";
    this.eventStream = null;
    this.presentationTimeDelta = NaN; // Specific EMSG Box paramater

};

Dash.vo.Event.prototype = {
    constructor: Dash.vo.Event

};