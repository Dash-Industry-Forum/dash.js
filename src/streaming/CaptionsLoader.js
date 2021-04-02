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
import Constants from './constants/Constants';
import DashConstants from '../dash/constants/DashConstants';
import URLLoader from './net/URLLoader';
import URLUtils from './utils/URLUtils';
import TextRequest from './vo/TextRequest';
import DashJSError from './vo/DashJSError';
import {HTTPRequest} from './vo/metrics/HTTPRequest';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import Errors from '../core/errors/Errors';
import FactoryMaker from '../core/FactoryMaker';
import VTTParser from './utils/VTTParser';

function CaptionsLoader(config) {

    config = config || {};
    const context = this.context;
    const debug = config.debug;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        urlLoader,
        parser;

    let mssHandler = config.mssHandler;
    let errHandler = config.errHandler;

    function setup() {
        logger = debug.getLogger(instance);

        urlLoader = URLLoader(context).create({
            errHandler: config.errHandler,
            dashMetrics: config.dashMetrics,
            mediaPlayerModel: config.mediaPlayerModel,
            requestModifier: config.requestModifier,
            useFetch: config.settings.get().streaming.lowLatencyEnabled,
            urlUtils: urlUtils,
            constants: Constants,
            dashConstants: DashConstants,
            errors: Errors
        });
    }

    function createParser(data) {
        if (data.indexOf('WEBVTT') > -1) {
            return VTTParser(context).getInstance();
        }
        return null;
    }

    function load(url) {

        const request = new TextRequest(url, HTTPRequest.MEDIA_SEGMENT_TYPE);

        urlLoader.load({
            request: request,
            success: function (data, textStatus, responseURL) {
                let actualUrl,
                    captions;

                // Handle redirects for the MPD - as per RFC3986 Section 5.1.3
                // also handily resolves relative MPD URLs to absolute
                if (responseURL && responseURL !== url) {
                    actualUrl = responseURL;
                } else {
                    // usually this case will be caught and resolved by
                    // responseURL above but it is not available for IE11 and Edge/12 and Edge/13
                    if (urlUtils.isRelative(url)) {
                        url = urlUtils.resolve(url, window.location.href);
                    }
                }

                // A response of no content implies in-memory is properly up to date
                if (textStatus == 'No Content') {
                    return;
                }

                // Create parser according to captions type
                parser = createParser(data);

                if (parser === null) {
                    eventBus.trigger(Events.EXTERNAL_CAPTIONS_LOADED, {
                        captions: null,
                        error: new DashJSError(
                            Errors.CAPTIONS_LOADER_PARSING_FAILURE_ERROR_CODE,
                            Errors.CAPTIONS_LOADER_PARSING_FAILURE_ERROR_MESSAGE + `${url}`
                        )
                    });
                    return;
                }

                try {
                    captions = parser.parse(data, 0);
                } catch (e) {
                    errHandler.error(new DashJSError(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE, Errors.TIMED_TEXT_ERROR_MESSAGE_PARSE + e.message, data));
                }

                if (captions) {
                    eventBus.trigger(Events.EXTERNAL_CAPTIONS_LOADED, { captions: captions });
                } else {
                    eventBus.trigger(Events.EXTERNAL_CAPTIONS_LOADED, {
                        captions: null,
                        error: new DashJSError(
                            Errors.CAPTIONS_LOADER_PARSING_FAILURE_ERROR_CODE,
                            Errors.CAPTIONS_LOADER_PARSING_FAILURE_ERROR_MESSAGE + `${url}`
                        )
                    });
                }
            },
            error: function (request, statusText, errorText) {
                eventBus.trigger(Events.EXTERNAL_CAPTIONS_LOADED, {
                    captions: null,
                    error: new DashJSError(
                        Errors.CAPTIONS_LOADER_LOADING_FAILURE_ERROR_CODE,
                        Errors.CAPTIONS_LOADER_LOADING_FAILURE_ERROR_MESSAGE + `${url}, ${errorText}`
                    )
                });
            }
        });
    }

    function reset() {
        if (urlLoader) {
            urlLoader.abort();
            urlLoader = null;
        }

        if (mssHandler) {
            mssHandler.reset();
        }
    }

    instance = {
        load: load,
        reset: reset
    };

    setup();

    return instance;
}

CaptionsLoader.__dashjs_factory_name = 'CaptionsLoader';

const factory = FactoryMaker.getClassFactory(CaptionsLoader);
export default factory;
