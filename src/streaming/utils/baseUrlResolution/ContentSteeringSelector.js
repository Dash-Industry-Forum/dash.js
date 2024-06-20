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

import FactoryMaker from '../../../core/FactoryMaker.js';
import ContentSteeringController from '../../../dash/controllers/ContentSteeringController.js';
import EventBus from '../../../core/EventBus.js';

function ContentSteeringSelector() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    let instance,
        contentSteeringController,
        blacklistController,
        blacklistResetTimeout = [];

    function setup() {
        contentSteeringController = ContentSteeringController(context).getInstance();
    }

    function setConfig(config) {
        if (config.blacklistController) {
            blacklistController = config.blacklistController;
        }
        if (config.contentSteeringController) {
            contentSteeringController = config.contentSteeringController;
        }
        eventBus.on(config.addBlacklistEventName, _onAddBlackList, instance);
    }

    function selectBaseUrlIndex(data) {
        let steeringIndex = NaN;

        // In case we dont have a selected idx yet we consider the defaultServiceLocation
        if (isNaN(data.selectedIdx)) {
            const steeringDataFromMpd = contentSteeringController.getSteeringDataFromManifest();
            if (steeringDataFromMpd && steeringDataFromMpd.defaultServiceLocationArray.length > 0) {
                steeringIndex = _findexIndexOfServiceLocation(steeringDataFromMpd.defaultServiceLocationArray, data.baseUrls);
            }
        }

        // Search in the response data of the steering server
        const currentSteeringResponseData = contentSteeringController.getCurrentSteeringResponseData();
        if (data.baseUrls && data.baseUrls.length && currentSteeringResponseData &&
            currentSteeringResponseData.pathwayPriority && currentSteeringResponseData.pathwayPriority.length) {
            steeringIndex = _findexIndexOfServiceLocation(currentSteeringResponseData.pathwayPriority, data.baseUrls);
        }

        return steeringIndex;
    }

    function reset() {
        blacklistResetTimeout.forEach(timer => clearTimeout(timer))
        blacklistResetTimeout = []
    }

    function _findexIndexOfServiceLocation(pathwayPriority = [], baseUrls = []) {
        let i = 0;
        let steeringIndex = NaN;
        while (i < pathwayPriority.length) {
            const curr = pathwayPriority[i];
            const idx = baseUrls.findIndex((elem) => {
                return elem.serviceLocation && elem.serviceLocation === curr;
            })
            if (idx !== -1 && !blacklistController.contains(baseUrls[idx].serviceLocation)) {
                steeringIndex = idx;
                break;
            }
            i += 1;
        }
        return steeringIndex;
    }

    
    function _onAddBlackList(e) {
        const currentSteeringResponseData = contentSteeringController.getCurrentSteeringResponseData();
        if (!currentSteeringResponseData) {
            return
        }
        const entry = e.entry
        const timer = setTimeout(() => {
            blacklistController.remove(entry);
            blacklistResetTimeout.splice(blacklistResetTimeout.indexOf(timer, 1))
        }, currentSteeringResponseData.ttl * 1000);
        blacklistResetTimeout.push(timer)
    }


    instance = {
        selectBaseUrlIndex,
        setConfig,
        reset
    };

    setup();

    return instance;
}

ContentSteeringSelector.__dashjs_factory_name = 'ContentSteeringSelector';
export default FactoryMaker.getClassFactory(ContentSteeringSelector);
