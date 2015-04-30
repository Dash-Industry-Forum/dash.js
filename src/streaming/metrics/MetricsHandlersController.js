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
MediaPlayer.dependencies.MetricsHandlersController = function () {
    "use strict";

    // in the future, we may want to support more than one reporter.
    // to do this, simply change the 'some' below to 'forEach'
    var handlers = [],

        handle = function (e) {
            var data = e.data;

            handlers.forEach(function (handler) {
                handler.handleNewMetric(data.metric, data.value);
            });
        };

    return {
        metricsHandlerFactory: undefined,
        eventBus: undefined,

        initialize: function (metrics, reportingController) {
            var self = this;

            metrics.split(",").forEach(
                function (m, midx, ms) {
                    var handler,
                        nextm;

                    // there is a bug in ISO23009-1 where the metrics attribute
                    // is a comma-seperated list but HttpList key can contain a
                    // comma enclosed by ().
                    if ((m.indexOf("(") !== -1) && m.indexOf(")") === -1) {
                        nextm = ms[midx + 1];

                        if (nextm &&
                                (nextm.indexOf("(") === -1) &&
                                (nextm.indexOf(")") !== -1)) {
                            m += "," + nextm;

                            // delete the next metric so forEach does not visit.
                            // nextm is unqualified -> strict-mode violation
                            delete ms[midx + 1];
                        }
                    }

                    handler = self.metricsHandlerFactory.create(
                        m,
                        reportingController
                    );

                    if (handler) {
                        handlers.push(handler);
                    }
                }
            );

            this.eventBus.addEventListener(
                MediaPlayer.events.METRIC_ADDED,
                handle
            );

            this.eventBus.addEventListener(
                MediaPlayer.events.METRIC_UPDATED,
                handle
            );
        },

        reset: function () {
            this.eventBus.removeEventListener(
                MediaPlayer.events.METRIC_ADDED,
                handle
            );

            this.eventBus.removeEventListener(
                MediaPlayer.events.METRIC_UPDATED,
                handle
            );

            handlers.forEach(function (handler) {
                handler.reset();
            });

            handlers = [];
        }
    };
};

MediaPlayer.dependencies.MetricsHandlersController.prototype = {
    constructor: MediaPlayer.dependencies.MetricsHandlersController
};
