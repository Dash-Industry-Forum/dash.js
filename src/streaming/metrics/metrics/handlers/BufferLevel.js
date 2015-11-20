/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/*global MediaPlayer*/
MediaPlayer.metrics.handlers.BufferLevel = function () {
    "use strict";
    var reportingController,
        n,
        name,
        interval,

        getLowestBufferLevel = function () {
            var self = this;

            // get the BufferLevel metric for each interesting stream type
            return ["video", "audio", "fragmentedText"].map(
                function (type) {
                    return self.metricsExt.getCurrentBufferLevel(
                        self.metricsModel.getReadOnlyMetricsFor(type)
                    );
                },
                this
            // filter out any which returned undefined/null etc
            ).filter(
                function (el) {
                    return el;
                }
            // of the valid entries, which had the lowest level
            ).reduce(
                function (a, b) {
                    return ((a.level < b.level) ? a : b);
                }
            );
        },

        intervalCallback = function () {
            reportingController.report(name, getLowestBufferLevel.call(this));
        };

    return {
        metricsModel: undefined,
        metricsExt: undefined,
        handlerHelpers: undefined,

        setup: function () {
            intervalCallback = intervalCallback.bind(this);
        },

        initialize: function (diName, rc, n_ms) {
            if (rc) {
                // this will throw if n is invalid, to be
                // caught by the initialize caller.
                n = this.handlerHelpers.validateN(n_ms);
                reportingController = rc;
                name = this.handlerHelpers.getMetricName(diName, n_ms);
                interval = setInterval(intervalCallback, n);
            }
        },

        reset: function () {
            clearInterval(interval);
            interval = null;
            n = 0;
            reportingController = null;
        },

        handleNewMetric: function () {
            // do nothing
        }
    };
};

MediaPlayer.metrics.handlers.BufferLevel.prototype = {
    constructor: MediaPlayer.metrics.handlers.BufferLevel
};
