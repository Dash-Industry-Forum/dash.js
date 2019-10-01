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
import DashJSError from './vo/DashJSError';
import HTTPLoader from './net/HTTPLoader';
import {HTTPRequest} from './vo/metrics/HTTPRequest';
import TextRequest from './vo/TextRequest';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import FactoryMaker from '../core/FactoryMaker';
import Errors from '../core/errors/Errors';

function XlinkLoader(config) {

    config = config || {};
    const RESOLVE_TO_ZERO = 'urn:mpeg:dash:resolve-to-zero:2013';

    const context  = this.context;
    const eventBus = EventBus(context).getInstance();

    let httpLoader = HTTPLoader(context).create({
        errHandler: config.errHandler,
        dashMetrics: config.dashMetrics,
        mediaPlayerModel: config.mediaPlayerModel,
        requestModifier: config.requestModifier
    });

    let instance;

    function load(url, element, resolveObject) {
        const report = function (content, resolveToZero) {
            element.resolved = true;
            element.resolvedContent = content ? content : null;

            eventBus.trigger(Events.XLINK_ELEMENT_LOADED, {
                element: element,
                resolveObject: resolveObject,
                error: content || resolveToZero ?
                    null :
                    new DashJSError(
                        Errors.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE,
                        Errors.XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE + url
                    )
            });
        };

        if (url === RESOLVE_TO_ZERO) {
            report(null, true);
        } else {
            const request = new TextRequest(url, HTTPRequest.XLINK_EXPANSION_TYPE);

            httpLoader.load({
                request: request,
                success: function (data) {
                    report(data);
                },
                error: function () {
                    report(null);
                }
            });
        }
    }

    function reset() {
        if (httpLoader) {
            httpLoader.abort();
            httpLoader = null;
        }
    }

    instance = {
        load: load,
        reset: reset
    };

    return instance;
}

XlinkLoader.__dashjs_factory_name = 'XlinkLoader';
export default FactoryMaker.getClassFactory(XlinkLoader);