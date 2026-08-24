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

import FactoryMaker from '../../core/FactoryMaker.js';
import EventBus from '../../core/EventBus.js';
import Settings from '../../core/Settings.js';
import ContentSteeringController from '../../dash/controllers/ContentSteeringController.js';

function BlackListController(config) {

    config = config || {};
    let instance;
    let blacklist = [];

    const eventBus = EventBus(this.context).getInstance();
    const settings = Settings(this.context).getInstance();
    const contentSteeringController = ContentSteeringController(this.context).getInstance();
    const updateEventName = config.updateEventName;
    const addBlacklistEventName = config.addBlacklistEventName;

    function contains(query) {
        if (!blacklist.length || !query || !query.length) {
            return false;
        }

        return (blacklist.findIndex(item => item.entry === query) !== -1);
    }

    function add(entry) {
        if (blacklist.findIndex(item => item.entry === entry) !== -1) {
            return;
        }

        const expiry = config.enableExpiry ? getBlacklistExpiry() : NaN;
        if (config.enableExpiry && expiry && expiry > 0) {
            const timeoutId = setTimeout(() => {
                remove(entry);
            }, expiry * 1000);
            blacklist.push({ entry: entry, timeoutId: timeoutId });
        } else {
            blacklist.push({ entry: entry });
        }

        eventBus.trigger(updateEventName, { entry: entry });
    }

    function remove(entry) {
        const index = blacklist.findIndex(item => item.entry === entry);
        if (index !== -1) {
            blacklist.splice(index, 1)
        }
    }

    function onAddBlackList(e) {
        add(e.entry);
    }

    function getBlacklistExpiry() {
        const currentSteeringResponseData = contentSteeringController ? contentSteeringController.getCurrentSteeringResponseData() : null;

        if (currentSteeringResponseData && Number.isFinite(currentSteeringResponseData.ttl)) {
            return currentSteeringResponseData.ttl;
        }

        return settings.get().streaming.blacklistExpiryTime;
    }

    function initialize() {
        if (addBlacklistEventName) {
            eventBus.on(addBlacklistEventName, onAddBlackList, instance);
        }
    }

    function reset() {
        if (addBlacklistEventName) {
            eventBus.off(addBlacklistEventName, onAddBlackList, instance);
        }
        for (const item of blacklist) {
            if (item.timeoutId) {
                clearTimeout(item.timeoutId);
            }
        }
        blacklist = [];
    }

    instance = {
        add: add,
        remove: remove,
        contains: contains,
        initialize: initialize,
        reset: reset
    };

    return instance;
}

BlackListController.__dashjs_factory_name = 'BlackListController';
export default FactoryMaker.getClassFactory(BlackListController);
