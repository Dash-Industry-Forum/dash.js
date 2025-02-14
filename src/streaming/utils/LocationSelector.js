/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2023, Dash Industry Forum.
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


import Events from '../../core/events/Events.js';
import BlacklistController from '../controllers/BlacklistController.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Settings from '../../core/Settings.js';
import ContentSteeringController from '../../dash/controllers/ContentSteeringController.js';

function LocationSelector() {

    const context = this.context;
    const settings = Settings(context).getInstance();

    let instance,
        blacklistController,
        contentSteeringController;

    function setup() {
        blacklistController = BlacklistController(context).create({
            updateEventName: Events.SERVICE_LOCATION_LOCATION_BLACKLIST_CHANGED,
            addBlacklistEventName: Events.SERVICE_LOCATION_LOCATION_BLACKLIST_ADD
        });
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

    /**
     *
     * @param {MpdLocation[]} mpdLocations
     * @returns {*}
     */
    function select(mpdLocations) {
        if (!mpdLocations || mpdLocations.length === 0) {
            return null;
        }

        let mpdLocation = null;
        if (settings.get().streaming.applyContentSteering) {
            mpdLocation = _selectByContentSteering(mpdLocations)
        }

        if (!mpdLocation) {
            mpdLocation = _selectByDefault(mpdLocations);
        }

        return mpdLocation;
    }

    function _selectByContentSteering(mpdLocations) {
        // Search in the response data of the steering server
        const currentSteeringResponseData = contentSteeringController.getCurrentSteeringResponseData();
        if (currentSteeringResponseData && currentSteeringResponseData.pathwayPriority && currentSteeringResponseData.pathwayPriority.length > 0) {
            return _findMpdLocation(currentSteeringResponseData.pathwayPriority, mpdLocations);
        }

        return null;
    }

    function _findMpdLocation(pathwayPriority = [], mpdLocations = []) {
        let i = 0;
        let target = null;
        while (i < pathwayPriority.length) {
            const curr = pathwayPriority[i];
            const idx = mpdLocations.findIndex((elem) => {
                return elem.serviceLocation && elem.serviceLocation === curr;
            })
            if (idx !== -1 && !blacklistController.contains(mpdLocations[idx].serviceLocation)) {
                target = mpdLocations[idx]
                break;
            }
            i += 1;
        }
        return target;
    }

    function _selectByDefault(mpdLocations) {
        return mpdLocations[0];
    }

    function reset() {
        blacklistController.reset();
    }

    instance = {
        select,
        setConfig,
        reset
    };

    setup();

    return instance;
}

LocationSelector.__dashjs_factory_name = 'LocationSelector';
export default FactoryMaker.getClassFactory(LocationSelector);
