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

import FactoryMaker from '../../../core/FactoryMaker';
import ContentSteeringController from '../../../dash/controllers/ContentSteeringController';

function ContentSteeringSelector() {

    const context = this.context;
    let instance,
        contentSteeringController,
        blacklistController;

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
    }

    function selectBaseUrlIndex(data) {
        let steeringIndex = NaN;

        // In case we dont have a selected idx yet we consider the defaultServiceLocation
        if (isNaN(data.selectedIdx)) {
            const steeringDataFromMpd = contentSteeringController.getSteeringDataFromManifest();
            if (steeringDataFromMpd && steeringDataFromMpd.defaultServiceLocation) {
                steeringIndex = _findexIndexOfServiceLocation([steeringDataFromMpd.defaultServiceLocation], data.baseUrls);
            }
        }

        // Search in the response data of the steering server
        const currentSteeringResponseData = contentSteeringController.getCurrentSteeringResponseData();
        if (data.baseUrls && data.baseUrls.length && currentSteeringResponseData &&
            currentSteeringResponseData.serviceLocationPriority && currentSteeringResponseData.serviceLocationPriority.length) {
            steeringIndex = _findexIndexOfServiceLocation(currentSteeringResponseData.serviceLocationPriority, data.baseUrls);
        }

        return steeringIndex;
    }

    function _findexIndexOfServiceLocation(serviceLocationPriorities = [], baseUrls = []) {
        let i = 0;
        let steeringIndex = NaN;
        while (i < serviceLocationPriorities.length) {
            const curr = serviceLocationPriorities[i];
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

    instance = {
        selectBaseUrlIndex,
        setConfig
    };

    setup();

    return instance;
}

ContentSteeringSelector.__dashjs_factory_name = 'ContentSteeringSelector';
export default FactoryMaker.getClassFactory(ContentSteeringSelector);
