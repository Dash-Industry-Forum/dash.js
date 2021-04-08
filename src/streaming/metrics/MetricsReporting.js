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

import DVBErrorsTranslator from './utils/DVBErrorsTranslator';
import MetricsReportingEvents from './MetricsReportingEvents';
import MetricsCollectionController from './controllers/MetricsCollectionController';
import MetricsHandlerFactory from './metrics/MetricsHandlerFactory';
import ReportingFactory from './reporting/ReportingFactory';

function MetricsReporting() {

    let context = this.context;
    let instance,
        dvbErrorsTranslator;

    /**
     * Create a MetricsCollectionController, and a DVBErrorsTranslator
     * @param {Object} config - dependancies from owner
     * @return {MetricsCollectionController} Metrics Collection Controller
     */
    function createMetricsReporting(config) {
        dvbErrorsTranslator = DVBErrorsTranslator(context).getInstance({
            eventBus: config.eventBus,
            dashMetrics: config.dashMetrics,
            metricsConstants: config.metricsConstants,
            events: config.events
        });

        return MetricsCollectionController(context).create(config);
    }

    /**
     * Get the ReportingFactory to allow new reporters to be registered
     * @return {ReportingFactory} Reporting Factory
     */
    function getReportingFactory() {
        return ReportingFactory(context).getInstance();
    }

    /**
     * Get the MetricsHandlerFactory to allow new handlers to be registered
     * @return {MetricsHandlerFactory} Metrics Handler Factory
     */
    function getMetricsHandlerFactory() {
        return MetricsHandlerFactory(context).getInstance();
    }

    instance = {
        createMetricsReporting:     createMetricsReporting,
        getReportingFactory:        getReportingFactory,
        getMetricsHandlerFactory:   getMetricsHandlerFactory
    };

    return instance;
}

MetricsReporting.__dashjs_factory_name = 'MetricsReporting';
const factory = dashjs.FactoryMaker.getClassFactory(MetricsReporting); /* jshint ignore:line */
factory.events = MetricsReportingEvents;
dashjs.FactoryMaker.updateClassFactory(MetricsReporting.__dashjs_factory_name, factory); /* jshint ignore:line */
export default factory;
