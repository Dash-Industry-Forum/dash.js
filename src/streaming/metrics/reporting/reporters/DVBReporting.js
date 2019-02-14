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

import MetricSerialiser from '../../utils/MetricSerialiser';
import RNG from '../../utils/RNG';

function DVBReporting(config) {
    config = config || {};
    let instance;

    let context = this.context;
    let metricSerialiser,
        randomNumberGenerator,
        reportingPlayerStatusDecided,
        isReportingPlayer,
        reportingUrl,
        rangeController;

    let USE_DRAFT_DVB_SPEC = true;
    let allowPendingRequestsToCompleteOnReset = true;
    let pendingRequests = [];

    const metricsConstants = config.metricsConstants;

    function setup() {
        metricSerialiser = MetricSerialiser(context).getInstance();
        randomNumberGenerator = RNG(context).getInstance();

        resetInitialSettings();
    }

    function doGetRequest(url, successCB, failureCB) {
        let req = new XMLHttpRequest();
        const oncomplete = function () {
            let reqIndex = pendingRequests.indexOf(req);

            if (reqIndex === -1) {
                return;
            } else {
                pendingRequests.splice(reqIndex, 1);
            }

            if ((req.status >= 200) && (req.status < 300)) {
                if (successCB) {
                    successCB();
                }
            } else {
                if (failureCB) {
                    failureCB();
                }
            }
        };

        pendingRequests.push(req);

        try {
            req.open('GET', url);
            req.onloadend = oncomplete;
            req.onerror = oncomplete;
            req.send();
        } catch (e) {
            req.onerror();
        }
    }

    function report(type, vos) {
        if (!Array.isArray(vos)) {
            vos = [vos];
        }

        // If the Player is not a reporting Player, then the Player shall
        // not report any errors.
        // ... In addition to any time restrictions specified by a Range
        // element within the Metrics element.
        if (isReportingPlayer && rangeController.isEnabled()) {

            // This reporting mechanism operates by creating one HTTP GET
            // request for every entry in the top level list of the metric.
            vos.forEach(function (vo) {
                let url = metricSerialiser.serialise(vo);

                // this has been proposed for errata
                if (USE_DRAFT_DVB_SPEC && (type !== metricsConstants.DVB_ERRORS)) {
                    url = `metricname=${type}&${url}`;
                }

                // Take the value of the @reportingUrl attribute, append a
                // question mark ('?') character and then append the string
                // created in the previous step.
                url = `${reportingUrl}?${url}`;

                // Make an HTTP GET request to the URL contained within the
                // string created in the previous step.
                doGetRequest(url, null, function () {
                    // If the Player is unable to make the report, for
                    // example because the @reportingUrl is invalid, the
                    // host cannot be reached, or an HTTP status code other
                    // than one in the 200 series is received, the Player
                    // shall cease being a reporting Player for the
                    // duration of the MPD.
                    isReportingPlayer = false;
                });
            });
        }
    }

    function initialize(entry, rc) {
        let probability;

        rangeController = rc;

        reportingUrl = entry['dvb:reportingUrl'];

        // If a required attribute is missing, the Reporting descriptor may
        // be ignored by the Player
        if (!reportingUrl) {
            throw new Error(
                'required parameter missing (dvb:reportingUrl)'
            );
        }

        // A Player's status, as a reporting Player or not, shall remain
        // static for the duration of the MPD, regardless of MPD updates.
        // (i.e. only calling reset (or failure) changes this state)
        if (!reportingPlayerStatusDecided) {
            // NOTE: DVB spec has a typo where it incorrectly references the
            // priority attribute, which should be probability
            probability = entry['dvb:probability'] || entry['dvb:priority'] || 0;
            // If the @priority attribute is set to 1000, it shall be a reporting Player.
            // If the @priority attribute is missing, the Player shall not be a reporting Player.
            // For any other value of the @probability attribute, it shall decide at random whether to be a
            // reporting Player, such that the probability of being one is @probability/1000.
            if (probability && (probability === 1000 || ((probability / 1000) >= randomNumberGenerator.random()))) {
                isReportingPlayer = true;
            }

            reportingPlayerStatusDecided = true;
        }
    }

    function resetInitialSettings() {
        reportingPlayerStatusDecided = false;
        isReportingPlayer = false;
        reportingUrl = null;
        rangeController = null;
    }

    function reset() {
        if (!allowPendingRequestsToCompleteOnReset) {
            pendingRequests.forEach(req => req.abort());
            pendingRequests = [];
        }

        resetInitialSettings();
    }

    instance = {
        report:     report,
        initialize: initialize,
        reset:      reset
    };

    setup();

    return instance;
}

DVBReporting.__dashjs_factory_name = 'DVBReporting';
export default dashjs.FactoryMaker.getClassFactory(DVBReporting); /* jshint ignore:line */
