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
MediaPlayer.metrics.handlers.DVBErrors = function () {
    "use strict";
    var reportingController,

        report = function (vo) {
            var key,
                mpd = this.manifestModel.getValue(),
                o = new MediaPlayer.vo.metrics.DVBErrors();

            for (key in vo) {
                if (vo.hasOwnProperty(key)) {
                    o[key] = vo[key];
                }
            }

            if (!o.mpdurl) {
                o.mpdurl = mpd.url;
            }

            if (!o.servicelocation) {
                o.servicelocation = mpd.BaseURL.serviceLocation;
            }

            if (!o.terror) {
                o.terror = new Date();
            }

            if (reportingController) {
                reportingController.report("DVBErrors", o);
            }
        },

        httpMetric = function (vo) {
            if ((vo.responsecode === 0) ||      // connection failure - unknown
                    (vo.responsecode >= 400) || // HTTP error status code
                    (vo.responsecode < 100) ||  // unknown status codes
                    (vo.responsecode >= 600)) { // unknown status codes
                report.call(this, {
                    errorcode:  vo.responsecode || MediaPlayer.vo.metrics.DVBErrors.CONNECTION_ERROR,
                    url:        vo.url,
                    terror:     vo.tresponse
                });
            }
        },

        dvbMetric = function (vo) {
            report.call(this, vo);
        };

    return {
        manifestModel: undefined,

        initialize: function (diName, rc) {
            if (rc) {
                reportingController = rc;

                // Note: A Player becoming a reporting Player is itself
                // something which is recorded by the DVBErrors metric.
                report.call(this, {
                    errorcode: MediaPlayer.vo.metrics.DVBErrors.BECAME_REPORTER
                });
            }
        },

        reset: function () {
            reportingController = null;
        },

        handleNewMetric: function (metric, vo) {
            switch (metric) {
            case "DVBErrors":
                dvbMetric.call(this, vo);
                break;
            case "HttpList":
                httpMetric.call(this, vo);
                break;
            default:
                break;
            }
        }
    };
};

MediaPlayer.metrics.handlers.DVBErrors.prototype = {
    constructor: MediaPlayer.metrics.handlers.DVBErrors
};
