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
import Error from './vo/Error';
import XHRLoader from './XHRLoader';
import {HTTPRequest} from './vo/metrics/HTTPRequest';
import TextRequest from './vo/TextRequest';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import FactoryMaker from '../core/FactoryMaker';

const XLINK_LOADER_ERROR_LOADING_FAILURE = 1;

function XlinkLoader(config) {

    const RESOLVE_TO_ZERO = 'urn:mpeg:dash:resolve-to-zero:2013';

    const context  = this.context;
    const eventBus = EventBus(context).getInstance();

    let xhrLoader = XHRLoader(context).create({
        errHandler: config.errHandler,
        metricsModel: config.metricsModel,
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
                    new Error(
                        XLINK_LOADER_ERROR_LOADING_FAILURE,
                        'Failed loading Xlink element: ' + url
                    )
            });
        };

        if (url === RESOLVE_TO_ZERO) {
            report(null, true);
        } else {
            const request = new TextRequest(url, HTTPRequest.XLINK_TYPE);

            xhrLoader.load({
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
        if (xhrLoader) {
            xhrLoader.abort();
            xhrLoader = null;
        }
    }

    instance = {
        load: load,
        reset: reset
    };

    return instance;
}

XlinkLoader.__dashjs_factory_name = 'XlinkLoader';

const factory = FactoryMaker.getClassFactory(XlinkLoader);
factory.XLINK_LOADER_ERROR_LOADING_FAILURE = XLINK_LOADER_ERROR_LOADING_FAILURE;
export default factory;
