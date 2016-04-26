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
import XlinkController from './controllers/XlinkController';
import XHRLoader from './XHRLoader';
import URLUtils from './utils/URLUtils';
import TextRequest from './vo/TextRequest';
import Error from './vo/Error';
import {HTTPRequest} from './vo/metrics/HTTPRequest';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import FactoryMaker from '../core/FactoryMaker';

const MANIFEST_LOADER_ERROR_PARSING_FAILURE = 1;
const MANIFEST_LOADER_ERROR_LOADING_FAILURE = 2;
const MANIFEST_LOADER_MESSAGE_PARSING_FAILURE = 'parsing failed';

function ManifestLoader(config) {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();
    const parser = config.parser;

    let instance,
        xhrLoader,
        xlinkController;

    function setup() {
        eventBus.on(Events.XLINK_READY, onXlinkReady, instance);

        xhrLoader = XHRLoader(context).create({
            errHandler: config.errHandler,
            metricsModel: config.metricsModel,
            requestModifier: config.requestModifier
        });

        xlinkController = XlinkController(context).create({
            errHandler: config.errHandler,
            metricsModel: config.metricsModel,
            requestModifier: config.requestModifier
        });
    }

    function onXlinkReady(event) {
        eventBus.trigger(
            Events.INTERNAL_MANIFEST_LOADED, {
                manifest: event.manifest
            }
        );
    }

    function load (url) {
        const request = new TextRequest(url, HTTPRequest.MPD_TYPE);

        xhrLoader.load({
            request: request,
            success: function (data, textStatus, xhr) {
                var actualUrl;
                var baseUri;

                // Handle redirects for the MPD - as per RFC3986 Section 5.1.3
                // also handily resolves relative MPD URLs to absolute
                if (xhr.responseURL && xhr.responseURL !== url) {
                    baseUri = urlUtils.parseBaseUrl(xhr.responseURL);
                    actualUrl = xhr.responseURL;
                } else {
                    // usually this case will be caught and resolved by
                    // xhr.responseURL above but it is not available for IE11
                    // baseUri must be absolute for BaseURL resolution later
                    if (urlUtils.isRelative(url)) {
                        url = urlUtils.parseBaseUrl(window.location.href) + url;
                    }

                    baseUri = urlUtils.parseBaseUrl(url);
                }

                const manifest = parser.parse(data, xlinkController);

                if (manifest) {
                    manifest.url = actualUrl || url;

                    // URL from which the MPD was originally retrieved (MPD updates will not change this value)
                    if (!manifest.originalUrl) {
                        manifest.originalUrl = manifest.url;
                    }

                    manifest.baseUri = baseUri;
                    manifest.loadedTime = new Date();
                    xlinkController.resolveManifestOnLoad(manifest);
                } else {
                    eventBus.trigger(
                        Events.INTERNAL_MANIFEST_LOADED, {
                            manifest: null,
                            error: new Error(
                                MANIFEST_LOADER_ERROR_PARSING_FAILURE,
                                MANIFEST_LOADER_MESSAGE_PARSING_FAILURE
                            )
                        }
                    );
                }
            },
            error: function (xhr, statusText, errorText) {
                eventBus.trigger(
                    Events.INTERNAL_MANIFEST_LOADED, {
                        manifest: null,
                        error: new Error(
                            MANIFEST_LOADER_ERROR_LOADING_FAILURE,
                            `Failed loading manifest: ${url}, ${errorText}`
                        )
                    }
                );
            }
        });
    }

    function reset() {
        eventBus.off(Events.XLINK_READY, onXlinkReady, instance);

        if (xlinkController) {
            xlinkController.reset();
            xlinkController = null;
        }

        if (xhrLoader) {
            xhrLoader.abort();
            xhrLoader = null;
        }
    }

    instance = {
        load: load,
        reset: reset
    };

    setup();

    return instance;
}

ManifestLoader.__dashjs_factory_name = 'ManifestLoader';

const factory = FactoryMaker.getClassFactory(ManifestLoader);
factory.MANIFEST_LOADER_ERROR_PARSING_FAILURE = MANIFEST_LOADER_ERROR_PARSING_FAILURE;
factory.MANIFEST_LOADER_ERROR_LOADING_FAILURE = MANIFEST_LOADER_ERROR_LOADING_FAILURE;
export default factory;
