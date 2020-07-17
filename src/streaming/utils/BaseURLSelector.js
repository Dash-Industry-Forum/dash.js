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

import Errors from '../../core/errors/Errors';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import BlacklistController from '../controllers/BlacklistController';
import DVBSelector from './baseUrlResolution/DVBSelector';
import BasicSelector from './baseUrlResolution/BasicSelector';
import FactoryMaker from '../../core/FactoryMaker';
import DashJSError from '../vo/DashJSError';
import { checkParameterType } from '../utils/SupervisorTools';

function BaseURLSelector() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        serviceLocationBlacklistController,
        basicSelector,
        dvbSelector,
        selector;

    function setup() {
        serviceLocationBlacklistController = BlacklistController(context).create({
            updateEventName:        Events.SERVICE_LOCATION_BLACKLIST_CHANGED,
            addBlacklistEventName:    Events.SERVICE_LOCATION_BLACKLIST_ADD
        });

        basicSelector = BasicSelector(context).create({
            blacklistController: serviceLocationBlacklistController
        });

        dvbSelector = DVBSelector(context).create({
            blacklistController: serviceLocationBlacklistController
        });

        selector = basicSelector;
    }

    function setConfig(config) {
        if (config.selector) {
            selector = config.selector;
        }
    }

    function chooseSelector(isDVB) {
        checkParameterType(isDVB, 'boolean');
        selector = isDVB ? dvbSelector : basicSelector;
    }

    function select(data) {
        if (!data) {
            return;
        }
        const baseUrls = data.baseUrls;
        const selectedIdx = data.selectedIdx;

        // Once a random selection has been carried out amongst a group of BaseURLs with the same
        // @priority attribute value, then that choice should be re-used if the selection needs to be made again
        // unless the blacklist has been modified or the available BaseURLs have changed.
        if (!isNaN(selectedIdx)) {
            return baseUrls[selectedIdx];
        }

        let selectedBaseUrl = selector.select(baseUrls);

        if (!selectedBaseUrl) {
            eventBus.trigger(
                Events.URL_RESOLUTION_FAILED, {
                    error: new DashJSError(
                        Errors.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE,
                        Errors.URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE
                    )
                }
            );
            if (selector === basicSelector) {
                reset();
            }
            return;
        }

        data.selectedIdx = baseUrls.indexOf(selectedBaseUrl);

        return selectedBaseUrl;
    }

    function reset() {
        serviceLocationBlacklistController.reset();
    }

    instance = {
        chooseSelector: chooseSelector,
        select: select,
        reset: reset,
        setConfig: setConfig
    };

    setup();

    return instance;
}

BaseURLSelector.__dashjs_factory_name = 'BaseURLSelector';
export default FactoryMaker.getClassFactory(BaseURLSelector);
