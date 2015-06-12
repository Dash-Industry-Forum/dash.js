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
MediaPlayer.dependencies.XlinkLoader = function () {
    "use strict";
    var RETRY_ATTEMPTS = 1,
        RETRY_INTERVAL = 500,
        RESOLVE_TO_ZERO = 'urn:mpeg:dash:resolve-to-zero:2013',

        doLoad = function (url, element, resolveObject, remainingAttempts) {
            var request = new XMLHttpRequest(),
                self = this,
                report,
                onload,
                content,
                loadedTime = null,
                needFailureReport = true,
                requestTime = new Date();

            onload = function () {
                if (request.status < 200 || request.status > 299) {
                    return;
                }
                needFailureReport = false;

                self.metricsModel.addHttpRequest("stream",
                    null,
                    "XLink",
                    url,
                    null,
                    null,
                    requestTime,
                    loadedTime,
                    null,
                    request.status,
                    null,
                    null,
                    request.getAllResponseHeaders());

                content = request.responseText;
                element.resolved = true;

                if (content) {
                    element.resolvedContent = content;
                    self.notify(MediaPlayer.dependencies.XlinkLoader.eventList.ENAME_XLINKELEMENT_LOADED, {
                        element: element,
                        resolveObject: resolveObject
                    });
                } else {
                    element.resolvedContent = null;
                    self.notify(MediaPlayer.dependencies.XlinkLoader.eventList.ENAME_XLINKELEMENT_LOADED, {
                        element: element,
                        resolveObject: resolveObject
                    }, new MediaPlayer.vo.Error(null, "Failed loading Xlink element: " + url, null));
                }
            };

            report = function () {
                if (!needFailureReport) {
                    return;
                }
                needFailureReport = false;

                self.metricsModel.addHttpRequest("stream",
                    null,
                    "xlink",
                    url,
                    null,
                    null,
                    requestTime,
                    new Date(),
                    request.status,
                    null,
                    null,
                    request.getAllResponseHeaders());

                if (remainingAttempts > 0) {
                    console.log("Failed loading xLink content: " + url + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                    remainingAttempts--;
                    setTimeout(function () {
                        doLoad.call(self, url, element, resolveObject, remainingAttempts);
                    }, RETRY_INTERVAL);
                } else {
                    console.log("Failed loading Xlink content: " + url + " no retry attempts left");
                    self.errHandler.downloadError("xlink", url, request);
                    element.resolvedContent = null;
                    self.notify(MediaPlayer.dependencies.XlinkLoader.eventList.ENAME_XLINKELEMENT_LOADED, {
                        element: element,
                        resolveObject: resolveObject
                    }, new Error("Failed loading xlink Element: " + url + " no retry attempts left"));
                }


            };

            try {
                //console.log("Start loading manifest: " + url);
                request.onload = onload;
                request.onloadend = report;
                request.onerror = report;
                request.open("GET", self.requestModifierExt.modifyRequestURL(url), true);
                request.send();
            } catch (e) {
                console.log("Error");
                request.onerror();
            }
        };

    return {
        errHandler: undefined,
        metricsModel: undefined,
        requestModifierExt: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        load: function (url, element, resolveObject) {
            // Error handling: resolveToZero, no valid url
            if (url === RESOLVE_TO_ZERO) {
                element.resolvedContent = null;
                element.resolved = true;
                this.notify(MediaPlayer.dependencies.XlinkLoader.eventList.ENAME_XLINKELEMENT_LOADED, {
                    element: element,
                    resolveObject: resolveObject
                });
            } else {
                doLoad.call(this, url, element, resolveObject, RETRY_ATTEMPTS);
            }
        }
    };
};

MediaPlayer.dependencies.XlinkLoader.prototype = {
    constructor: MediaPlayer.dependencies.XlinkLoader
};

MediaPlayer.dependencies.XlinkLoader.eventList = {
    ENAME_XLINKELEMENT_LOADED: "xlinkElementLoaded"
};