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

import MetricsHandlerFactory from '../metrics/MetricsHandlerFactory';

function MetricsHandlersController(config) {

    config = config || {};
    let handlers = [];

    let instance;
    const context = this.context;
    const eventBus = config.eventBus;
    const Events = config.events;

    let metricsHandlerFactory = MetricsHandlerFactory(context).getInstance({
        debug: config.debug,
        eventBus: config.eventBus,
        metricsConstants: config.metricsConstants
    });

    function handle(e) {
        handlers.forEach(handler => {
            handler.handleNewMetric(e.metric, e.value, e.mediaType);
        });
    }

    function initialize(metrics, reportingController) {
        metrics.split(',').forEach(
            (m, midx, ms) => {
                let handler;

                // there is a bug in ISO23009-1 where the metrics attribute
                // is a comma-separated list but HttpList key can contain a
                // comma enclosed by ().
                if ((m.indexOf('(') !== -1) && m.indexOf(')') === -1) {
                    let nextm = ms[midx + 1];

                    if (nextm &&
                            (nextm.indexOf('(') === -1) &&
                            (nextm.indexOf(')') !== -1)) {
                        m += ',' + nextm;

                        // delete the next metric so forEach does not visit.
                        delete ms[midx + 1];
                    }
                }

                handler = metricsHandlerFactory.create(
                    m,
                    reportingController
                );

                if (handler) {
                    handlers.push(handler);
                }
            }
        );

        eventBus.on(
            Events.METRIC_ADDED,
            handle,
            instance
        );

        eventBus.on(
            Events.METRIC_UPDATED,
            handle,
            instance
        );
    }

    function reset() {
        eventBus.off(
            Events.METRIC_ADDED,
            handle,
            instance
        );

        eventBus.off(
            Events.METRIC_UPDATED,
            handle,
            instance
        );

        handlers.forEach(handler => handler.reset());

        handlers = [];
    }

    instance = {
        initialize: initialize,
        reset:      reset
    };

    return instance;
}

MetricsHandlersController.__dashjs_factory_name = 'MetricsHandlersController';
export default dashjs.FactoryMaker.getClassFactory(MetricsHandlersController); /* jshint ignore:line */
