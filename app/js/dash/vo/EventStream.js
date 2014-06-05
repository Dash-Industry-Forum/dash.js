/**
 * Created by dsi on 02.04.14.
 */
Dash.vo.EventStream = function () {
    "use strict";
    this.adaptionSet = null;
    this.representation = null;
    this.period = null;
    this.timescale = 1;
    this.value = "";
    this.schemeIdUri = "";
};

Dash.vo.EventStream.prototype = {
    constructor: Dash.vo.EventStream
};